import { Router } from 'express';
import { ok, ERR, AppError } from '../utils/response.js';
import { countWords } from '../utils/countWords.js';
import { User, Letter, Mood, ACTIVE_TIMES, LETTER_FREQS } from '../models/index.js';

const router = Router();

/**
 * 注册引导提交（对应 v0.2 createUser，契约 §7）：服务端复校，不信任前端。
 * intro 内容审核在 M4 挂接（T4.1 挂接点之一）。
 */
router.post('/profile', async (req, res, next) => {
  try {
    if (req.user.has_profile) throw new AppError(ERR.BAD_REQUEST, '用户已注册');

    const nickname = String(req.body?.nickname || '').trim();
    const intro = String(req.body?.intro || '').trim();
    const tags = Array.isArray(req.body?.tags) ? req.body.tags.map((t) => String(t).trim()) : [];
    const activeTime = req.body?.activeTime;
    const letterFreq = req.body?.letterFreq;

    if (!nickname || nickname.length > 20) {
      throw new AppError(ERR.BAD_REQUEST, '昵称需为1-20字');
    }
    const introWords = countWords(intro);
    if (introWords < 20 || introWords > 60) {
      throw new AppError(ERR.WORD_COUNT, `一句话介绍需在20-60字之间，当前${introWords}字`);
    }
    if (tags.length < 3 || tags.length > 5 || tags.some((t) => !t)) {
      throw new AppError(ERR.BAD_REQUEST, '标签需选择3-5个');
    }
    if (activeTime !== undefined && !ACTIVE_TIMES.includes(activeTime)) {
      throw new AppError(ERR.BAD_REQUEST, '活跃时段不合法');
    }
    if (letterFreq !== undefined && !LETTER_FREQS.includes(letterFreq)) {
      throw new AppError(ERR.BAD_REQUEST, '书信频率不合法');
    }

    const user = req.user;
    user.set({ nickname, intro, tags, has_profile: true });
    if (activeTime) user.active_time = activeTime;
    if (letterFreq) user.letter_freq = letterFreq;
    await user.save();

    res.json(
      ok({
        _id: user._id,
        nickname: user.nickname,
        intro: user.intro,
        tags: user.tags,
        active_time: user.active_time,
        letter_freq: user.letter_freq,
        is_member: user.is_member,
      })
    );
  } catch (err) {
    next(err);
  }
});

/** 当前用户信息（契约 §7）：统计字段服务端聚合，勿信前端 */
router.get('/me', async (req, res, next) => {
  try {
    const user = req.user;
    const [lettersSent, lettersReceived, moodDays] = await Promise.all([
      Letter.countDocuments({ from_uid: user._id }),
      Letter.countDocuments({ to_uid: user._id }),
      Mood.countDocuments({ uid: user._id }),
    ]);
    res.json(
      ok({
        _id: user._id,
        nickname: user.nickname,
        intro: user.intro,
        tags: user.tags,
        active_time: user.active_time,
        letter_freq: user.letter_freq,
        is_member: user.is_member,
        created_at: user.created_at,
        last_active: user.last_active,
        hasProfile: user.has_profile,
        lettersSent,
        lettersReceived,
        moodDays,
      })
    );
  } catch (err) {
    next(err);
  }
});

export default router;
