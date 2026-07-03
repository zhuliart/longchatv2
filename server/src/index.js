import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { createApp } from './app.js';

const app = createApp();

app.listen(config.port, () => {
  logger.info(`pingchang-server 已启动: http://localhost:${config.port}/api/v1/health (${config.env})`);
});
