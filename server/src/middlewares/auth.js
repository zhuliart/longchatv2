import { fail, ERR, AppError } from '../utils/response.js';
import { verifyToken } from '../services/tokens.js';
import { User } from '../models/index.js';

const LAST_ACTIVE_THROTTLE_MS = 15 * 60 * 1000;

/**
 * JWT 鉴权（T2.4）：解析 Authorization: Bearer → req.uid / req.user；
 * 缺失/失效/用户不存在 → HTTP 401。顺带节流更新 last_active（匹配算法的活跃依据）。
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token && verifyToken(token, 'access');
  if (!payload) {
    return res.status(401).json(fail(ERR.BAD_REQUEST, '未登录或登录已过期'));
  }
  const user = await User.findById(payload.uid).catch(() => null);
  if (!user) {
    return res.status(401).json(fail(ERR.BAD_REQUEST, '未登录或登录已过期'));
  }
  req.uid = user._id;
  req.user = user;
  if (Date.now() - user.last_active.getTime() > LAST_ACTIVE_THROTTLE_MS) {
    User.updateOne({ _id: user._id }, { $set: { last_active: new Date() } }).catch(() => {});
  }
  return next();
}

/** hasProfile=false 时仅放行的入口（相对 /api/v1 的路径） */
const ONBOARDING_WHITELIST = [
  { method: 'POST', path: '/users/profile' },
  { method: 'GET', path: '/users/me' },
];

/**
 * 引导门槛（T2.5）：未完成 3 步引导（has_profile=false）的用户
 * 只能提交引导资料与查看自己，其余业务接口一律拒绝，防止跳过引导。
 * 挂载在 requireAuth 之后、所有业务路由之前。
 */
export function requireProfile(req, res, next) {
  if (req.user.has_profile) return next();
  const allowed = ONBOARDING_WHITELIST.some(
    (w) => w.method === req.method && w.path === req.path
  );
  if (allowed) return next();
  return next(new AppError(ERR.BAD_REQUEST, '请先完成注册引导'));
}
