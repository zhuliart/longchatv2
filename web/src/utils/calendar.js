/* 月历/走势构建（T5.2）：移动端与桌面端共用（原型 screens2 与 desktop-views 各有一份，收敛为一处） */
import { pad2 } from './date.js';

/* 月历格子：前导空位 + { d, mood } */
export function buildCalendar(year, month, moods) {
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const byDay = {};
  moods.forEach((m) => {
    const a = m.date.split('-');
    if (+a[0] === year && +a[1] === month) byDay[parseInt(a[2], 10)] = m;
  });
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push({ d, mood: byDay[d] });
  return cells;
}

/* 当月逐日情绪走势（趋势由 moods 前端派生，契约不单设 getMoodTrend） */
export function buildTrend(year, month, moods) {
  const days = new Date(year, month, 0).getDate();
  const byDay = {};
  moods.forEach((m) => {
    const a = m.date.split('-');
    if (+a[0] === year && +a[1] === month) byDay[parseInt(a[2], 10)] = m;
  });
  const arr = [];
  for (let d = 1; d <= days; d++) {
    const mo = byDay[d];
    arr.push({
      d: `${month}-${pad2(d)}`,
      date: `${year}-${pad2(month)}-${pad2(d)}`,
      v: mo ? mo.intensity : 0,
      e: mo ? mo.emotion : null,
    });
  }
  return arr;
}
