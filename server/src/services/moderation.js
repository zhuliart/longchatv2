import { createHmac, randomUUID } from 'node:crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError, ERR } from '../utils/response.js';

/**
 * 内容审核服务（T4.1，契约 §8）：所有 UGC（信件/日记/评论/intro）落库前调用。
 * 语义映射：厂商结论 → pass / review / risky ——
 *   pass 放行；review 放行并在文档上标记 moderation:'review' 待人工；risky 抛业务错误 1001。
 * 异常兜底：审核 API 超时/报错 → 按 MODERATION_FAIL_OPEN 放行 + error 日志（契约默认）。
 * 本地敏感词库前置快筛：命中即拒，省线上调用量；未配置 AK（本地开发）时仅走快筛。
 */

/** 本地敏感词快筛库（黑产/违禁类兜底样本，生产可按需扩充） */
export const LOCAL_BLOCKLIST = [
  '赌博', '博彩', '开盘下注', '六合彩',
  '代开发票', '刷单返利', '裸聊', '售卖枪支',
  '冰毒', '摇头丸', '海洛因',
];

/** 前置快筛：返回命中的敏感词，未命中返回 null */
export function localScan(text) {
  const t = String(text || '');
  for (const word of LOCAL_BLOCKLIST) {
    if (t.includes(word)) return word;
  }
  return null;
}

/** 厂商风险等级 → 业务语义（阿里云 Text Moderation Plus 的 RiskLevel） */
export function mapRiskLevel(riskLevel) {
  const level = String(riskLevel || '').toLowerCase();
  if (level === 'high') return 'risky';
  if (level === 'medium') return 'review';
  return 'pass'; // low / none / 未知一律视为通过
}

/** 阿里云 POP RPC 签名用的百分号编码（RFC 3986） */
const popEncode = (s) =>
  encodeURIComponent(s).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~');

/**
 * 调用阿里云内容安全·文本审核增强版（TextModerationPlus，RPC 风格 + HMAC-SHA1 签名）。
 * 返回 'pass' | 'review' | 'risky'；网络/服务异常直接抛错，由 moderateText 统一兜底。
 */
async function remoteScan(text) {
  const { akId, akSecret, region, service, timeoutMs } = config.moderation;
  const endpoint = config.moderation.endpoint || `https://green-cip.${region}.aliyuncs.com`;

  const params = {
    Format: 'JSON',
    Version: '2022-03-02',
    Action: 'TextModerationPlus',
    AccessKeyId: akId,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: randomUUID(),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Service: service,
    ServiceParameters: JSON.stringify({ content: text }),
  };
  const canonicalized = Object.keys(params)
    .sort()
    .map((k) => `${popEncode(k)}=${popEncode(params[k])}`)
    .join('&');
  const stringToSign = `POST&%2F&${popEncode(canonicalized)}`;
  params.Signature = createHmac('sha1', `${akSecret}&`).update(stringToSign).digest('base64');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await res.json();
  if (!res.ok || body.Code !== 200) {
    throw new Error(`内容安全接口异常：HTTP ${res.status} Code ${body.Code} ${body.Message || ''}`);
  }
  return mapRiskLevel(body.Data?.RiskLevel);
}

/**
 * 审核一段文本。
 * 返回 { verdict, state }：verdict 为业务结论（risky 由调用方拒绝）；
 * state 为落库标记（'pass'|'review'|null，null=未经机审——未配置 AK 或服务异常放行）。
 */
export async function moderateText(text, scene = 'ugc') {
  const t = String(text || '').trim();
  if (!t) return { verdict: 'pass', state: null };

  const hit = localScan(t);
  if (hit) {
    logger.warn(`moderation[${scene}]: 本地敏感词命中「${hit}」，拒绝`);
    return { verdict: 'risky', state: null, hit };
  }

  const { akId, akSecret, failOpen } = config.moderation;
  if (!akId || !akSecret) {
    logger.debug(`moderation[${scene}]: 未配置内容安全 AK，跳过机审放行`);
    return { verdict: 'pass', state: null };
  }

  try {
    const verdict = await remoteScan(t);
    if (verdict === 'risky') logger.warn(`moderation[${scene}]: 机审 risky，拒绝`);
    if (verdict === 'review') logger.info(`moderation[${scene}]: 机审 review，放行并标记待人工`);
    return { verdict, state: verdict === 'risky' ? null : verdict };
  } catch (err) {
    // 契约：审核服务异常时放行 + 记日志（MODERATION_FAIL_OPEN=false 时改为拒绝）
    logger.error(err, `moderation[${scene}]: 审核服务异常，${failOpen ? '放行（fail-open）' : '拒绝（fail-closed）'}`);
    if (failOpen) return { verdict: 'pass', state: null };
    throw new AppError(ERR.MODERATION, '内容安全服务暂不可用，请稍后重试');
  }
}

/**
 * 挂接点统一入口（sendLetter / replyLetter / saveMood(diary) / comment / users.profile(intro)）：
 * risky → 抛 1001；否则返回落库用的 moderation 标记（'pass' | 'review' | null）。
 */
export async function assertClean(text, scene) {
  const { verdict, state } = await moderateText(text, scene);
  if (verdict === 'risky') {
    throw new AppError(ERR.MODERATION, '内容未通过安全检测，请修改后重试');
  }
  return state;
}
