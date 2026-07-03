import mongoose from 'mongoose';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

mongoose.set('strictQuery', true);

/**
 * 连接 MongoDB（带重试）：本地 compose 里 mongo 可能晚于 server 就绪，
 * 重试若干次仍失败则抛错中止启动（生产由 restart: always 兜底拉起）。
 */
export async function connectMongo({ retries = 5, delayMs = 2000 } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
      logger.info('MongoDB 已连接');
      return mongoose.connection;
    } catch (err) {
      if (attempt >= retries) {
        logger.error(
          `MongoDB 连接失败（已重试 ${retries} 次）：${err.message}\n` +
            '本地开发请先执行：docker compose -f deploy/docker-compose.dev.yml up -d'
        );
        throw err;
      }
      logger.warn(`MongoDB 连接失败（第 ${attempt}/${retries} 次），${delayMs}ms 后重试…`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}

/** 供健康检查上报：1 = connected */
export function mongoState() {
  return mongoose.connection.readyState === 1 ? 'up' : 'down';
}
