import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectMongo, disconnectMongo } from './db.js';
import { syncAllIndexes } from './models/index.js';
import { createApp } from './app.js';

await connectMongo();
await syncAllIndexes();

const app = createApp();
const server = app.listen(config.port, () => {
  logger.info(`pingchang-server 已启动: http://localhost:${config.port}/api/v1/health (${config.env})`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    logger.info(`收到 ${sig}，优雅关闭…`);
    server.close(async () => {
      await disconnectMongo();
      process.exit(0);
    });
  });
}
