import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino(
  config.isProd
    ? { level: 'info' }
    : {
        level: 'debug',
        transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss' } },
      }
);
