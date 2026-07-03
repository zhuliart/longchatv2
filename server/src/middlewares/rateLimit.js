import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { fail, ERR } from '../utils/response.js';

/**
 * 登录限速防爆破（T2.2）：同 IP 与 同 IP+account 双维度，只计失败请求
 * （skipSuccessfulRequests：正常登录不占额度）。超限 → HTTP 429。
 * app.js 已 set('trust proxy', 1)，Nginx 反代后取到真实 IP。
 */

const WINDOW_MS = 15 * 60 * 1000;

const tooMany = (req, res) =>
  res.status(429).json(fail(ERR.BAD_REQUEST, '尝试次数过多，请15分钟后再试'));

// 业务失败按约定返回 HTTP 200（code 9001），不能用状态码判断成败：
// 登录路由在凭证错误时置 res.locals.authFailed，只有这类请求计入额度。
const requestWasSuccessful = (req, res) => res.statusCode < 400 && !res.locals.authFailed;

/** 维度一：同 IP（覆盖撞库换号） */
export const loginIpLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 30,
  skipSuccessfulRequests: true,
  requestWasSuccessful,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany,
});

/** 维度二：同 IP + 同 account（覆盖单账号爆破） */
export const loginAccountLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  skipSuccessfulRequests: true,
  requestWasSuccessful,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip)}#${String(req.body?.account || '').trim().toLowerCase()}`,
  handler: tooMany,
});
