import { Router } from 'express';
import { ok, fail, ERR } from '../utils/response.js';
import { asObjectId, excerpt, startOfToday } from '../utils/listing.js';
import { Match, Mood } from '../models/index.js';
import { generateMatchesFor, isActiveRecently } from '../services/match.js';

const router = Router();

const quotaOf = (user) =>
  user.is_member && (!user.member_expire || user.member_expire > new Date()) ? 5 : 3;

/** 候选卡片的「最近写道」：其最新公开心情日记，服务端截 ≤50 字 */
async function recentExcerptOf(uid) {
  const mood = await Mood.findOne({ uid, visibility: 'public', diary: { $ne: '' } })
    .sort({ created_at: -1 })
    .lean();
  return mood ? excerpt(mood.diary, 50) : '';
}

/**
 * 每日推荐（契约 §7）：读当日 pending 按 score 倒序；免费 3 / 会员 5，
 * 已消费（跳过/已通信）扣减额度，用完 → 1004。
 * 当日无任何记录时现场生成（冷启动；M4 定时任务上线后为兜底）。
 */
router.get('/daily', async (req, res, next) => {
  try {
    const today = { $gte: startOfToday() };
    if ((await Match.countDocuments({ uid_a: req.uid, updated_at: today })) === 0) {
      await generateMatchesFor(req.user);
    }
    const quota = quotaOf(req.user);
    const consumed = await Match.countDocuments({
      uid_a: req.uid,
      updated_at: today,
      status: { $in: ['skipped', 'active'] },
    });
    const remaining = quota - consumed;
    if (remaining <= 0) {
      return res.json({ ...fail(ERR.QUOTA, '今日推荐已用完，明天再来'), data: [] });
    }
    const matches = await Match.find({ uid_a: req.uid, updated_at: today, status: 'pending' })
      .sort({ score: -1 })
      .limit(remaining)
      .populate('uid_b', 'nickname intro tags active_time letter_freq last_active');

    const data = [];
    for (const m of matches) {
      const u = m.uid_b;
      data.push({
        _id: m._id,
        score: m.score,
        tagsCommon: m.tags_common,
        profile: {
          _id: u._id,
          nickname: u.nickname,
          intro: u.intro,
          tags: u.tags,
          active_time: u.active_time,
          letter_freq: u.letter_freq,
          isActiveRecently: isActiveRecently(u),
          recentExcerpt: await recentExcerptOf(u._id),
        },
      });
    }
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

/** 跳过推荐（契约 §7）：当日不再出现；幂等 */
router.post('/:targetUid/skip', async (req, res, next) => {
  try {
    const target = asObjectId(req.params.targetUid, '参数不合法');
    await Match.updateOne(
      { uid_a: req.uid, uid_b: target, status: 'pending', updated_at: { $gte: startOfToday() } },
      { $set: { status: 'skipped' } }
    );
    res.json(ok(null));
  } catch (err) {
    next(err);
  }
});

export default router;
