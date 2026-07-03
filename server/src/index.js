import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectMongo, disconnectMongo } from './db.js';
import { syncAllIndexes } from './models/index.js';
import { createApp } from './app.js';
import { startJobs } from './jobs/index.js';

await connectMongo();
await syncAllIndexes();

const app = createApp();
const server = app.listen(config.port, () => {
  logger.info(`pingchang-server 已启动: http://localhost:${config.port}/api/v1/health (${config.env})`);
});
startJobs(); // 定时任务（T4.3）：单实例进程内 node-cron

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    logger.info(`收到 ${sig}，优雅关闭…`);
    server.close(async () => {
      await disconnectMongo();
      process.exit(0);
    });
  });
}
