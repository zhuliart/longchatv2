import { Router } from 'express';
import { ok, ERR, AppError } from '../utils/response.js';
import { countWords } from '../utils/countWords.js';
import { asObjectId, excerpt } from '../utils/listing.js';
import {
  User, Letter, Mood,
  ACTIVE_TIMES, LETTER_FREQS, ACTIVE_TIME_LABEL, LETTER_FREQ_LABEL,
} from '../models/index.js';
import { isActiveRecently } from '../services/match.js';

const router = Router();

/** GET/PATCH /me 共用的响应体（契约 §7：统计服务端聚合） */
async function buildMe(user) {
  const [lettersSent, lettersReceived, moodDays] = await Promise.all([
    Letter.countDocuments({ from_uid: user._id }),
    Letter.countDocuments({ to_uid: user._id }),
    Mood.countDocuments({ uid: user._id }),
  ]);
  return {
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
  };
}

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
    res.json(ok(await buildMe(req.user)));
  } catch (err) {
    next(err);
  }
});

/**
 * 局部更新资料（契约 §7）：传啥改啥，服务端逐项复校；
 * intro 改动重过审核在 M4 挂接；tags 改动影响下次匹配计算（无需额外处理）。
 */
router.patch('/me', async (req, res, next) => {
  try {
    const user = req.user;
    const body = req.body || {};

    if (body.nickname !== undefined) {
      const nickname = String(body.nickname).trim();
      if (!nickname || nickname.length > 20) throw new AppError(ERR.BAD_REQUEST, '昵称需为1-20字');
      user.nickname = nickname;
    }
    if (body.intro !== undefined) {
      const intro = String(body.intro).trim();
      const n = countWords(intro);
      if (n < 20 || n > 60) {
        throw new AppError(ERR.WORD_COUNT, `一句话介绍需在20-60字之间，当前${n}字`);
      }
      user.intro = intro;
    }
    if (body.tags !== undefined) {
      const tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()) : [];
      if (tags.length < 3 || tags.length > 5 || tags.some((t) => !t)) {
        throw new AppError(ERR.BAD_REQUEST, '标签需选择3-5个');
      }
      user.tags = tags;
    }
    if (body.activeTime !== undefined) {
      if (!ACTIVE_TIMES.includes(body.activeTime)) throw new AppError(ERR.BAD_REQUEST, '活跃时段不合法');
      user.active_time = body.activeTime;
    }
    if (body.letterFreq !== undefined) {
      if (!LETTER_FREQS.includes(body.letterFreq)) throw new AppError(ERR.BAD_REQUEST, '书信频率不合法');
      user.letter_freq = body.letterFreq;
    }

    await user.save();
    res.json(ok(await buildMe(user)));
  } catch (err) {
    next(err);
  }
});

/**
 * 他人公开资料（契约 §7 / AI-Agent-SPEC §4.1）：只回安全字段，
 * recentExcerpt 服务端截 ≤50 字（取其最新公开心情日记），附中文标签字段。
 */
router.get('/:uid/profile', async (req, res, next) => {
  try {
    const uid = asObjectId(req.params.uid, '用户不存在');
    const user = await User.findById(uid);
    if (!user || !user.has_profile) throw new AppError(ERR.BAD_REQUEST, '用户不存在');

    const recentMood = await Mood.findOne({ uid, visibility: 'public', diary: { $ne: '' } })
      .sort({ created_at: -1 })
      .lean();

    res.json(
      ok({
        _id: user._id,
        nickname: user.nickname,
        intro: user.intro,
        tags: user.tags,
        active_time: user.active_time,
        letter_freq: user.letter_freq,
        last_active: user.last_active,
        isActiveRecently: isActiveRecently(user),
        recentExcerpt: recentMood ? excerpt(recentMood.diary, 50) : '',
        activeTimeLabel: ACTIVE_TIME_LABEL[user.active_time] || '',
        letterFreqLabel: LETTER_FREQ_LABEL[user.letter_freq] || '',
      })
    );
  } catch (err) {
    next(err);
  }
});

export default router;
