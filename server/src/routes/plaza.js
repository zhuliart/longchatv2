import { Router } from 'express';
import { ok, ERR, AppError } from '../utils/response.js';
import { countWords } from '../utils/countWords.js';
import { parsePage, asObjectId, PAGE_SIZE, COMMENT_PAGE_SIZE } from '../utils/listing.js';
import { Mood, MoodComment } from '../models/index.js';
import { assertClean } from '../services/moderation.js';

const router = Router();

/** 广场列表（契约 §6）：仅 public 倒序；includeSelf=false（默认）过滤本人 */
router.get('/moods', async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const includeSelf = String(req.query.includeSelf) === 'true';
    const filter = { visibility: 'public' };
    if (!includeSelf) filter.uid = { $ne: req.uid };
    const moods = await Mood.find(filter)
      .sort({ created_at: -1 })
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate('uid', 'nickname')
      .lean();
    res.json(
      ok(
        moods.map((m) => ({
          _id: m._id,
          authorNickname: m.uid?.nickname || '',
          date: m.date,
          emotion: m.emotion,
          feeling: m.feeling,
          intensity: m.intensity,
          diary: m.diary,
          commentCount: m.comment_count,
        }))
      )
    );
  } catch (err) {
    next(err);
  }
});

/**
 * 评论公开心情（契约 §6）：目标须 public 否则 9001；1–200 字；两级 ——
 * 回复「回复」时压平挂到其顶层评论下。落库前过内容审核（T4.1 挂接点：comment）。
 */
router.post('/moods/:id/comments', async (req, res, next) => {
  try {
    const moodId = asObjectId(req.params.id, '该心情不可评论');
    const mood = await Mood.findById(moodId);
    if (!mood || mood.visibility !== 'public') throw new AppError(ERR.BAD_REQUEST, '该心情不可评论');

    const content = String(req.body?.content || '').trim();
    const n = countWords(content);
    if (n < 1 || n > 200) {
      throw new AppError(ERR.WORD_COUNT, `评论需在1-200字之间，当前${n}字`);
    }
    const moderation = await assertClean(content, 'comment');

    let parentId = null;
    if (req.body?.parentId) {
      const pid = asObjectId(req.body.parentId, '被回复的评论不存在');
      const parent = await MoodComment.findOne({ _id: pid, mood_id: moodId });
      if (!parent) throw new AppError(ERR.BAD_REQUEST, '被回复的评论不存在');
      parentId = parent.parent_id || parent._id; // 仅两级：回复「回复」压平到顶层评论
    }

    const comment = await MoodComment.create({
      mood_id: moodId,
      from_uid: req.uid,
      content,
      parent_id: parentId,
      ...(moderation && { moderation }),
    });
    const updated = await Mood.findByIdAndUpdate(moodId, { $inc: { comment_count: 1 } }, { new: true });
    res.json(ok({ _id: comment._id, commentCount: updated.comment_count }));
  } catch (err) {
    next(err);
  }
});

/** 评论列表（每页 20）：public 可看；非 public 仅记录本人可看（下架保留评论） */
router.get('/moods/:id/comments', async (req, res, next) => {
  try {
    const moodId = asObjectId(req.params.id, '心情记录不存在');
    const mood = await Mood.findById(moodId);
    if (!mood) throw new AppError(ERR.BAD_REQUEST, '心情记录不存在');
    if (mood.visibility !== 'public' && !mood.uid.equals(req.uid)) {
      throw new AppError(ERR.BAD_REQUEST, '该心情不可查看');
    }
    const page = parsePage(req.query.page);
    const comments = await MoodComment.find({ mood_id: moodId })
      .sort({ created_at: 1 })
      .skip(page * COMMENT_PAGE_SIZE)
      .limit(COMMENT_PAGE_SIZE)
      .populate('from_uid', 'nickname')
      .lean();
    res.json(
      ok(
        comments.map((c) => ({
          _id: c._id,
          fromNickname: c.from_uid?.nickname || '',
          content: c.content,
          created_at: c.created_at,
          parent_id: c.parent_id,
        }))
      )
    );
  } catch (err) {
    next(err);
  }
});

export default router;
