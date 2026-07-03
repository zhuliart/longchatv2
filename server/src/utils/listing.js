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

/** 今天 00:00（服务端本地时间），用于「当日」范围查询 */
export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
