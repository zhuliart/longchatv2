import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { runJob } from './runner.js';
import { dailyMatch } from './dailyMatch.js';
import { memoryToday } from './memoryToday.js';
import { inactivityCheck } from './inactivityCheck.js';

/**
 * 定时任务注册（T4.3，契约 §9，node-cron 进程内）：
 *   dailyMatch      每日 00:00  全量匹配计算
 *   memoryToday     每日 08:00  去年今日提醒（MVP 记日志占位）
 *   inactivityCheck 每日 09:00  7/14/30 天未回应标记
 * 手动触发：npm run job:match / job:memory / job:inactivity（scripts/runJob.js）。
 */

export const JOBS = { dailyMatch, memoryToday, inactivityCheck };

const SCHEDULES = [
  ['0 0 * * *', 'dailyMatch'],
  ['0 8 * * *', 'memoryToday'],
  ['0 9 * * *', 'inactivityCheck'],
];

export function startJobs() {
  for (const [expr, name] of SCHEDULES) {
    cron.schedule(expr, () => runJob(name, JOBS[name]));
  }
  logger.info('定时任务已注册：dailyMatch@00:00 / memoryToday@08:00 / inactivityCheck@09:00');
}
