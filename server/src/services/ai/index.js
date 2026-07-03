import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { AppError, ERR } from '../../utils/response.js';
import { ymd, excerpt } from '../../utils/listing.js';
import { User, Letter, AiUsage } from '../../models/index.js';
import * as dashscope from './providers/dashscope.js';
import * as anthropic from './providers/anthropic.js';

/**
 * AI 灵感服务（T4.2，契约 §5）：provider 抽象（默认 DashScope，可切 Claude），
 * 密钥仅服务端环境变量；每用户每日限频；8s 超时降级返回友好文案（9002，不报 500）；
 * 生成结果不落库——用户采用后随信件正常走内容审核。
 */

const PROVIDERS = { dashscope, anthropic };

function getProvider() {
  const provider = PROVIDERS[config.ai.provider];
  if (!provider) throw new Error(`未知的 AI_PROVIDER: ${config.ai.provider}`);
  return provider;
}

/** 限频（每用户每日 AI_DAILY_LIMIT 次，续写与润色共用额度）：超限 → 1004 友好提示 */
async function checkQuota(uid) {
  const usage = await AiUsage.findOne({ uid, date: ymd() }).lean();
  if (usage && usage.count >= config.ai.dailyLimit) {
    throw new AppError(ERR.QUOTA, '今日 AI 灵感次数已用完，明天再来吧');
  }
}

/** 仅成功生成才计数：降级/超时不占用户额度 */
async function recordUsage(uid) {
  await AiUsage.updateOne({ uid, date: ymd() }, { $inc: { count: 1 } }, { upsert: true });
}

/**
 * 调用 provider 并统一降级：provider 自身带请求级超时，这里再兜一层竞速
 * 保证 8s 上限；任何失败（超时/断网/密钥缺失/解析失败）→ 9002 友好文案，绝不 500。
 */
async function complete({ system, prompt }) {
  const { timeoutMs } = config.ai;
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`AI 生成超过 ${timeoutMs}ms`)), timeoutMs + 200);
    timer.unref?.();
  });
  try {
    return await Promise.race([getProvider().complete({ system, prompt, timeoutMs }), deadline]);
  } catch (err) {
    logger.error(err, `ai[${config.ai.provider}]: 生成失败，降级返回友好提示`);
    throw new AppError(ERR.TIMEOUT, '灵感还没送达，请稍后再试，或先随心写下去');
  } finally {
    clearTimeout(timer);
  }
}

/** 宽松解析续写候选：优先 JSON 数组，失败则按行拆（模型偶尔不守格式时兜底） */
export function parseSuggestions(text) {
  const raw = String(text || '').trim();
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const arr = JSON.parse(unfenced);
    if (Array.isArray(arr)) {
      const items = arr.map((s) => String(s).trim()).filter(Boolean);
      if (items.length) return items.slice(0, 3);
    }
  } catch {
    // 非 JSON：走按行兜底
  }
  const lines = unfenced
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '').replace(/^["'「]|["'」]$/g, '').trim())
    .filter((l) => l.length >= 4);
  return lines.slice(0, 3);
}

/** 风格样本：该用户最近 ≤3 封已发信（每封截断，控制 prompt 体积） */
async function styleSamplesOf(uid) {
  const letters = await Letter.find({ from_uid: uid })
    .sort({ created_at: -1 })
    .limit(3)
    .lean();
  return letters.map((l) => excerpt(l.content, 200));
}

const INSPIRATION_SYSTEM =
  '你是一位安静、真诚的书信写作伙伴，服务于慢社交产品「平常」。' +
  '你根据用户的写作风格样本与当前草稿，续写 3 条候选句子，供用户挑选后接在信的末尾。' +
  '要求：贴近样本的语气与用词；每条 20-60 字；具体而有画面感，不空洞、不堆砌辞藻；' +
  '不使用表情符号。只输出一个 JSON 字符串数组（恰好 3 个元素），不要任何其他内容。';

/** 风格续写：返回 suggestions 3 条候选（契约 §5） */
export async function inspiration(uid, { draft, targetUid } = {}) {
  await checkQuota(uid);

  const samples = await styleSamplesOf(uid);
  let receiver = null;
  if (targetUid) {
    receiver = await User.findById(targetUid).select('nickname').lean().catch(() => null);
  }

  const parts = [];
  if (samples.length) {
    parts.push('【我最近写过的信（风格样本）】');
    samples.forEach((s, i) => parts.push(`样本${i + 1}：${s}`));
  } else {
    parts.push('【我还没有写过信，请用温和平实的现代书信语气】');
  }
  if (receiver?.nickname) parts.push(`【这封信写给】${receiver.nickname}`);
  parts.push(`【当前草稿】\n${String(draft || '').trim() || '（还没动笔，请给出适合开头的句子）'}`);
  parts.push('请续写 3 条候选句子。');

  const text = await complete({ system: INSPIRATION_SYSTEM, prompt: parts.join('\n') });
  const suggestions = parseSuggestions(text);
  if (!suggestions.length) {
    logger.error(`ai: 续写结果解析失败，原文：${excerpt(text, 120)}`);
    throw new AppError(ERR.TIMEOUT, '灵感还没送达，请稍后再试，或先随心写下去');
  }
  await recordUsage(uid);
  return suggestions;
}

const POLISH_SYSTEM =
  '你是一位克制的中文书信润色师。在保留作者本意、语气与个人风格的前提下，' +
  '修正语病、调整不通顺的表达，让文字更干净自然。不扩写、不增删内容、不改变称呼与署名。' +
  '只输出润色后的全文，不要任何解释或前后缀。';

/** 润色：返回润色后的全文（字数门槛 ≥10 由路由层校验） */
export async function polish(uid, { text }) {
  await checkQuota(uid);
  const polished = await complete({ system: POLISH_SYSTEM, prompt: String(text).trim() });
  await recordUsage(uid);
  return polished;
}
