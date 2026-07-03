/**
 * 定时任务手动触发入口（T4.3）：npm run job:match / job:memory / job:inactivity，
 * 便于联调与补跑。用法：node src/scripts/runJob.js <dailyMatch|memoryToday|inactivityCheck>
 */
import { logger } from '../utils/logger.js';
import { connectMongo, disconnectMongo } from '../db.js';
import { runJob } from '../jobs/runner.js';
import { JOBS } from '../jobs/index.js';

const name = process.argv[2];
const fn = JOBS[name];
if (!fn) {
  console.error(`未知任务「${name || ''}」，可选：${Object.keys(JOBS).join(' / ')}`);
  process.exit(1);
}

let ok = false;
try {
  await connectMongo();
  const result = await runJob(name, fn);
  ok = result !== null;
  if (ok) logger.info({ result }, `[job:${name}] 手动触发完成`);
} finally {
  await disconnectMongo();
}
process.exit(ok ? 0 : 1);
