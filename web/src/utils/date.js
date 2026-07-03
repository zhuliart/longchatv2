/* 日期工具（T5.2）：业务日期 YYYY-MM-DD + ISO → 相对时间 + 中文长日期 */

export const pad2 = (n) => String(n).padStart(2, '0');

export const ymd = (d = new Date()) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export function daysAgo(n, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d;
}

export function yearsAgo(n, base = new Date()) {
  const d = new Date(base);
  d.setFullYear(d.getFullYear() - n);
  return d;
}

/* ISO/时间戳 → 「刚刚 / n 分钟前 / n 小时前 / 昨天 / n 天前 / YYYY-MM-DD」 */
export function relativeTime(iso, now = new Date()) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  const diffMs = now - t;
  if (diffMs < 60 * 1000) return '刚刚';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24 && ymd(t) === ymd(now)) return `${hours} 小时前`;
  const dayDiff = Math.round((new Date(ymd(now)) - new Date(ymd(t))) / 86400000);
  if (dayDiff <= 1) return '昨天';
  if (dayDiff < 7) return `${dayDiff} 天前`;
  return ymd(t);
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/* → 「2026年6月4日 周四」（首页问候行） */
export function formatCnDate(d = new Date()) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`;
}

/* 「M月D日」（趋势图轴/详情用，接受 "M-DD" 或 "YYYY-MM-DD"） */
export function fmtMonthDay(s) {
  const a = String(s).split('-');
  const [m, d] = a.length === 3 ? [a[1], a[2]] : [a[0], a[1]];
  return `${parseInt(m, 10)}月${parseInt(d, 10)}日`;
}

/* 按小时给问候语（与桌面原型一致） */
export function greeting(h = new Date().getHours()) {
  if (h < 5) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '午后好';
  return '晚上好';
}
