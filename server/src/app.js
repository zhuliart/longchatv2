import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import healthRouter from './routes/health.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Nginx 反代后取真实 IP（限速依赖）

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url.includes('/health') } }));

  // 业务路由统一挂载在 /api/v1 下（后续里程碑在此追加）
  app.use('/api/v1/health', healthRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
