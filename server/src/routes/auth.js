import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { ok, fail, ERR, AppError } from '../utils/response.js';
import { User, isValidAccount } from '../models/index.js';
import {
  signAccessToken, signRefreshToken, verifyToken,
  isRefreshBlacklisted, blacklistRefresh,
} from '../services/tokens.js';
import { loginIpLimiter, loginAccountLimiter } from '../middlewares/rateLimit.js';

const router = Router();

const issueTokens = (user) => ({
  token: signAccessToken(user._id),
  refreshToken: signRefreshToken(user._id),
  hasProfile: user.has_profile,
});

/** A1 注册（T2.1）：成功即发 token，hasProfile=false 由前端引导闭环 */
router.post('/register', async (req, res, next) => {
  try {
    const account = String(req.body?.account || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!isValidAccount(account)) {
      throw new AppError(ERR.BAD_REQUEST, '账号须为邮箱或11位手机号');
    }
    if (password.length < 6) {
      throw new AppError(ERR.BAD_REQUEST, '密码至少需要6位');
    }
    if (await User.exists({ account })) {
      throw new AppError(ERR.BAD_REQUEST, '该账号已注册，请直接登录');
    }
    const user = await User.create({
      account,
      password_hash: await bcrypt.hash(password, config.bcryptRounds),
    });
    res.json(ok(issueTokens(user)));
  } catch (err) {
    // 并发注册撞唯一索引 → 同样按「已注册」处理
    if (err?.code === 11000) return next(new AppError(ERR.BAD_REQUEST, '该账号已注册，请直接登录'));
    next(err);
  }
});

/** A2 登录（T2.2）：错误提示统一，不泄露账号是否存在；限速只计失败 */
router.post('/login', loginIpLimiter, loginAccountLimiter, async (req, res, next) => {
  try {
    const account = String(req.body?.account || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const user = await User.findOne({ account }).select('+password_hash');
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.locals.authFailed = true; // 供登录限速计数（业务失败 HTTP 仍为 200）
      throw new AppError(ERR.BAD_REQUEST, '账号或密码不正确');
    }
    user.last_active = new Date();
    await user.save();
    res.json(ok(issueTokens(user)));
  } catch (err) {
    next(err);
  }
});

/** A3 登出（T2.3）：拉黑 refresh（幂等）；access 短时效自然过期 */
router.post('/logout', async (req, res, next) => {
  try {
    const payload = verifyToken(String(req.body?.refreshToken || ''), 'refresh');
    if (payload) await blacklistRefresh(payload);
    res.json(ok(null, '已退出登录'));
  } catch (err) {
    next(err);
  }
});

/** A4 刷新（T2.3）：校验 refresh 未拉黑 → 轮换（旧 refresh 拉黑，发新双 token） */
router.post('/refresh', async (req, res, next) => {
  try {
    const payload = verifyToken(String(req.body?.refreshToken || ''), 'refresh');
    if (!payload || (await isRefreshBlacklisted(payload))) {
      return res.status(401).json(fail(ERR.BAD_REQUEST, '登录已失效，请重新登录'));
    }
    const user = await User.findById(payload.uid);
    if (!user) {
      return res.status(401).json(fail(ERR.BAD_REQUEST, '登录已失效，请重新登录'));
    }
    await blacklistRefresh(payload);
    res.json(ok(issueTokens(user)));
  } catch (err) {
    next(err);
  }
});

export default router;
