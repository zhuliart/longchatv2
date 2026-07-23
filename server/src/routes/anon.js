import { Router } from 'express';
import { ok, ERR, AppError } from '../utils/response.js';
import { countWords } from '../utils/countWords.js';
import { parsePage, asObjectId, PAGE_SIZE, COMMENT_PAGE_SIZE } from '../utils/listing.js';
import { AnonLetter, AnonComment } from '../models/index.js';
import { assertClean } from '../services/moderation.js';

const router = Router();

const BOARD_MIN = 30; // 匿名信 ≥30 字（树洞轻量门槛，低于书信 150/100）

/** 寄往匿名信区：任何响应不含作者身份；落库前过内容审核 */
router.post('/letters', async (req, res, next) => {
  try {
    const content = String(req.body?.content || '');
    const n = countWords(content);
    if (n < BOARD_MIN) {
      throw new AppError(ERR.WORD_COUNT, `匿名信至少需要${BOARD_MIN}字，当前${n}字`);
    }
    const title = String(req.body?.title || '').trim();
    if (title.length > 30) throw new AppError(ERR.BAD_REQUEST, '标题最多30字');
    const moderation = await assertClean(title ? `${title}\n${content}` : content, 'anon_letter');

    const post = await AnonLetter.create({
      uid: req.uid,
      title,
      content,
      word_count: n,
      ...(moderation && { moderation }),
    });
    res.json(ok({ _id: post._id }));
  } catch (err) {
    next(err);
  }
});

/** 匿名信区列表：全员可见，倒序分页；isMine 供前端标记「我写的」，不泄露他人身份 */
router.get('/letters', async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const posts = await AnonLetter.find({})
      .sort({ created_at: -1 })
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean();
    res.json(
      ok(
        posts.map((p) => ({
          _id: p._id,
          title: p.title,
          content: p.content,
          word_count: p.word_count,
          commentCount: p.comment_count,
          created_at: p.created_at,
          isMine: String(p.uid) === String(req.uid),
        }))
      )
    );
  } catch (err) {
    next(err);
  }
});

/** 回应匿名信（1–200 字，两级压平）：回应者以昵称示人 —— 发信匿名、回应实名 */
router.post('/letters/:id/comments', async (req, res, next) => {
  try {
    const postId = asObjectId(req.params.id, '这封匿名信不存在');
    const post = await AnonLetter.findById(postId);
    if (!post) throw new AppError(ERR.BAD_REQUEST, '这封匿名信不存在');

    const content = String(req.body?.content || '').trim();
    const n = countWords(content);
    if (n < 1 || n > 200) {
      throw new AppError(ERR.WORD_COUNT, `回应需在1-200字之间，当前${n}字`);
    }
    const moderation = await assertClean(content, 'comment');

    let parentId = null;
    if (req.body?.parentId) {
      const pid = asObjectId(req.body.parentId, '被回复的回应不存在');
      const parent = await AnonComment.findOne({ _id: pid, post_id: postId });
      if (!parent) throw new AppError(ERR.BAD_REQUEST, '被回复的回应不存在');
      parentId = parent.parent_id || parent._id; // 仅两级：回复「回复」压平到顶层
    }

    const comment = await AnonComment.create({
      post_id: postId,
      from_uid: req.uid,
      content,
      parent_id: parentId,
      ...(moderation && { moderation }),
    });
    const updated = await AnonLetter.findByIdAndUpdate(postId, { $inc: { comment_count: 1 } }, { new: true });
    res.json(ok({ _id: comment._id, commentCount: updated.comment_count }));
  } catch (err) {
    next(err);
  }
});

/** 回应列表（每页 20）：全员可看 */
router.get('/letters/:id/comments', async (req, res, next) => {
  try {
    const postId = asObjectId(req.params.id, '这封匿名信不存在');
    if (!(await AnonLetter.exists({ _id: postId }))) {
      throw new AppError(ERR.BAD_REQUEST, '这封匿名信不存在');
    }
    const page = parsePage(req.query.page);
    const comments = await AnonComment.find({ post_id: postId })
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
