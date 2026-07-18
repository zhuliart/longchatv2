import mongoose from 'mongoose';
import { AppError, ERR } from './response.js';

/** 分页（契约 §1）：?page=0 起，每页 10（评论 20） */
export const PAGE_SIZE = 10;
export const COMMENT_PAGE_SIZE = 20;

export function parsePage(raw) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** 路径参数转 ObjectId：非法格式直接按业务错误处理，避免 CastError 变 500 */
export function asObjectId(raw, message = '参数不合法') {
  if (!mongoose.isValidObjectId(raw)) throw new AppError(ERR.BAD_REQUEST, message);
  return new mongoose.Types.ObjectId(String(raw));
}

/** 服务端截取摘要：压平换行、截前 n 字，截断加省略号（草稿列表 / recentExcerpt） */
export function excerpt(text, n = 60) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** 业务日期（服务端本地时间，契约 §1.4-6：「今天」以服务端为准） */
export function ymd(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

/** YYYY-MM-DD 偏移若干天（按 UTC 计算，纯字符串进出，避免时区误差） */
export function shiftYmd(s, days) {
  const [y, m, d] = String(s).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const p = (x) => String(x).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

/**
 * 「今天」以**使用者电脑的当地日期**为准（前端经 X-Client-Date 头带上）。
 * 为防伪造，只接受落在服务端当日 ±1 天内的客户端日期（覆盖全球所有真实时区
 * UTC-12..+14）；非法或越界则回退服务端本地日期。
 */
export function clientYmd(req) {
  const raw = req && typeof req.get === 'function' ? req.get('X-Client-Date') : null;
  const serverToday = ymd();
  if (isYmd(raw) && raw >= shiftYmd(serverToday, -1) && raw <= shiftYmd(serverToday, 1)) {
    return raw;
  }
  return serverToday;
}

/** 今天 00:00（服务端本地时间），用于「当日」范围查询 */
export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
