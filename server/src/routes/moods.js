import { Router } from 'express';
import { ok, ERR, AppError } from '../utils/response.js';
import { countWords } from '../utils/countWords.js';
import { asObjectId, ymd, isYmd } from '../utils/listing.js';
import { Mood, Letter, EMOTIONS, VISIBILITIES } from '../models/index.js';

const router = Router();

/** 去年今日（契约 §6）：优先 mood，无则 letter，都无 data:null —— 须在 /:date 类路由之前定义 */
router.get('/memory-today', async (req, res, next) => {
  try {
    const today = ymd();
    const lastYear = `${parseInt(today.slice(0, 4), 10) - 1}${today.slice(4)}`;

    const mood = await Mood.findOne({ uid: req.uid, date: lastYear }).lean();
    if (mood) {
      return res.json(
        ok({
          type: 'mood',
          _id: mood._id,
          emotion: mood.emotion,
          feeling: mood.feeling,
          intensity: mood.intensity,
          diary: mood.diary,
          date: mood.date,
        })
      );
    }
    const dayStart = new Date(`${lastYear}T00:00:00`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    if (!Number.isNaN(dayStart.getTime())) {
      const letter = await Letter.findOne({
        $or: [{ from_uid: req.uid }, { to_uid: req.uid }],
        created_at: { $gte: dayStart, $lt: dayEnd },
      })
        .sort({ created_at: 1 })
        .lean();
      if (letter) {
        return res.json(
          ok({ type: 'letter', _id: letter._id, content: letter.content, created_at: letter.created_at })
        );
      }
    }
    res.json(ok(null, 'no memory'));
  } catch (err) {
    next(err);
  }
});

/**
 * 记录/更新心情（契约 §6）：date 天然幂等 upsert；服务端校验 :date ≤ 今天，
 * 且仅「今天」可写全量内容 —— 往日只能走 visibility 接口（与原型交互一致）。
 * 日记审核在 M4 挂接（T4.1 挂接点：saveMood(diary)）。
 */
router.put('/:date', async (req, res, next) => {
  try {
    const date = req.params.date;
    if (!isYmd(date)) throw new AppError(ERR.BAD_REQUEST, '日期格式须为 YYYY-MM-DD');
    const today = ymd();
    if (date > today) throw new AppError(ERR.BAD_REQUEST, '不能记录未来的心情');
    if (date < today) throw new AppError(ERR.BAD_REQUEST, '往日记录仅可修改可见性');

    const emotion = req.body?.emotion;
    if (!EMOTIONS.includes(emotion)) throw new AppError(ERR.BAD_REQUEST, '情绪类型不合法');
    const intensity = req.body?.intensity;
    if (!Number.isInteger(intensity) || intensity < 1 || intensity > 5) {
      throw new AppError(ERR.BAD_REQUEST, '强度须为 1-5 的整数');
    }
    const feeling = String(req.body?.feeling || '').trim();
    if (feeling.length > 8) throw new AppError(ERR.BAD_REQUEST, '细分感受最多8字');
    const visibility = req.body?.visibility ?? 'private';
    if (!VISIBILITIES.includes(visibility)) throw new AppError(ERR.BAD_REQUEST, '可见性不合法');
    const diary = String(req.body?.diary || '');
    if (diary) {
      const n = countWords(diary);
      if (n < 30) throw new AppError(ERR.WORD_COUNT, `日记至少需要30字，当前${n}字`);
    }

    // upsert：同人同日唯一索引兜底；save() 走 Schema 校验 + feeling 词表软校验日志
    let mood = await Mood.findOne({ uid: req.uid, date });
    if (!mood) mood = new Mood({ uid: req.uid, date });
    mood.set({ emotion, intensity, feeling, visibility, diary });
    await mood.save();

    res.json(
      ok({
        _id: mood._id,
        uid: mood.uid,
        emotion: mood.emotion,
        feeling: mood.feeling,
        intensity: mood.intensity,
        visibility: mood.visibility,
        date: mood.date,
      })
    );
  } catch (err) {
    next(err);
  }
});

/** 某月记录：月历、当月趋势（前端派生）、详情共用（契约 §6） */
router.get('/', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new AppError(ERR.BAD_REQUEST, 'year/month 参数不合法');
    }
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const moods = await Mood.find({ uid: req.uid, date: { $gte: `${prefix}-01`, $lte: `${prefix}-31` } })
      .sort({ date: 1 })
      .lean();
    res.json(
      ok(
        moods.map((m) => ({
          _id: m._id,
          emotion: m.emotion,
          feeling: m.feeling,
          intensity: m.intensity,
          diary: m.diary,
          visibility: m.visibility,
          commentCount: m.comment_count,
          date: m.date,
        }))
      )
    );
  } catch (err) {
    next(err);
  }
});

/** 往日仅改可见性（契约 §6）：仅本人；public→非 public 保留评论，仅从广场下架 */
router.patch('/:id/visibility', async (req, res, next) => {
  try {
    const id = asObjectId(req.params.id, '无权修改此记录');
    const visibility = req.body?.visibility;
    if (!VISIBILITIES.includes(visibility)) throw new AppError(ERR.BAD_REQUEST, '可见性不合法');
    const mood = await Mood.findOneAndUpdate(
      { _id: id, uid: req.uid },
      { $set: { visibility } },
      { new: true }
    );
    if (!mood) throw new AppError(ERR.BAD_REQUEST, '无权修改此记录');
    res.json(ok({ _id: mood._id, visibility: mood.visibility }));
  } catch (err) {
    next(err);
  }
});

export default router;
