import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { TokenBlacklist } from '../models/index.js';

/**
 * JWT 双 token（T2.3，MVP 简化）：
 * - access：短时效（默认 2h），无状态校验，业务接口凭它鉴权；
 * - refresh：长时效（默认 30d），带 jti；logout 把 jti 入 TTL 黑名单，refresh 时轮换。
 */

export function signAccessToken(uid) {
  return jwt.sign({ uid: String(uid), type: 'access' }, config.jwt.secret, {
    expiresIn: config.jwt.expires,
  });
}

export function signRefreshToken(uid) {
  return jwt.sign({ uid: String(uid), type: 'refresh', jti: randomUUID() }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpires,
  });
}

/** 校验并解出 payload；无效/过期/类型不符 → null */
export function verifyToken(token, type) {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    return payload.type === type ? payload : null;
  } catch {
    return null;
  }
}

/** refresh 是否已被拉黑（登出过） */
export async function isRefreshBlacklisted(payload) {
  return !!(await TokenBlacklist.exists({ jti: payload.jti }));
}

/** 拉黑一个 refresh（幂等）：TTL 到 token 自身过期时间即自动清理 */
export async function blacklistRefresh(payload) {
  await TokenBlacklist.updateOne(
    { jti: payload.jti },
    { $setOnInsert: { uid: payload.uid, expires_at: new Date(payload.exp * 1000) } },
    { upsert: true }
  );
}
