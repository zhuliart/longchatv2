import { logger } from '../utils/logger.js';

/**
 * 任务执行器（T4.3）：防重入锁（单机内存锁即可，契约无分布式要求）
 * + 执行日志（开始/结束/耗时/影响行数）。cron 与手动触发共用同一入口。
 */

const running = new Set();

export async function runJob(name, fn) {
  if (running.has(name)) {
    logger.warn(`[job:${name}] 上一次执行尚未结束，跳过本次（防重入）`);
    return null;
  }
  running.add(name);
  const startedAt = Date.now();
  logger.info(`[job:${name}] 开始执行`);
  try {
    const result = await fn();
    logger.info({ result }, `[job:${name}] 执行完成，耗时 ${Date.now() - startedAt}ms`);
    return result;
  } catch (err) {
    logger.error(err, `[job:${name}] 执行失败，耗时 ${Date.now() - startedAt}ms`);
    return null;
  } finally {
    running.delete(name);
  }
}
