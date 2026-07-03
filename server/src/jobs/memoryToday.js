import { Mood, Letter } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { ymd } from '../utils/listing.js';

/**
 * 去年今日提醒（T4.3，契约 §9，每日 08:00）：找出有「去年今日」记忆的用户。
 * MVP 仅记日志/站内红点占位（前端「去年的今天」卡自行调 GET /moods/memory-today），
 * 邮件通知可省（契约允许）。
 */
export async function memoryToday() {
  const today = ymd();
  const lastYear = `${parseInt(today.slice(0, 4), 10) - 1}${today.slice(4)}`;

  const moodUids = await Mood.distinct('uid', { date: lastYear });

  const dayStart = new Date(`${lastYear}T00:00:00`);
  let letterUids = [];
  if (!Number.isNaN(dayStart.getTime())) {
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const range = { created_at: { $gte: dayStart, $lt: dayEnd } };
    const [froms, tos] = await Promise.all([
      Letter.distinct('from_uid', range),
      Letter.distinct('to_uid', range),
    ]);
    letterUids = [...froms, ...tos];
  }

  const uids = new Set([...moodUids, ...letterUids].map(String));
  logger.info(`[job:memoryToday] ${lastYear} 有记忆的用户 ${uids.size} 位（站内红点占位，无推送）`);
  return { date: lastYear, users: uids.size };
}
