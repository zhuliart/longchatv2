import { Router } from 'express';
import { ok, ERR, AppError } from '../utils/response.js';
import { countWords } from '../utils/countWords.js';
import { parsePage, asObjectId, PAGE_SIZE } from '../utils/listing.js';
import { AnonLetter, Letter } from '../models/index.js';
import { assertClean } from '../services/moderation.js';

const router = Router();

const BOARD_MIN = 30; // 匿名信 ≥30 字（树洞轻量门槛）
const REPLY_MIN = 100; // 树洞回信按普通回信门槛

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

/** 匿名信区列表：全员可见，倒序分页；只公开回信人数，不公开回信内容 */
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
          replyCount: p.comment_count, // 沿用计数字段，语义为回信人次
          created_at: p.created_at,
          isMine: String(p.uid) === String(req.uid),
        }))
      )
    );
  } catch (err) {
    next(err);
  }
});

/**
 * 回一封匿名信（树洞回信）：以普通回信（≥100 字）落进作者收件箱 ——
 * 作者看到回信人实名；回信人视角作者始终是「匿名笔友」（anon_uid=作者，
 * 线程内后续往来由 letters 路由按 anon_uid 继续脱敏）。信区仅回信计数 +1。
 */
router.post('/letters/:id/reply', async (req, res, next) => {
  try {
    const postId = asObjectId(req.params.id, '这封匿名信不存在');
    const post = await AnonLetter.findById(postId);
    if (!post) throw new AppError(ERR.BAD_REQUEST, '这封匿名信不存在');
    if (String(post.uid) === String(req.uid)) {
      throw new AppError(ERR.BAD_REQUEST, '这是你自己的匿名信');
    }

    const content = String(req.body?.content || '');
    const n = countWords(content);
    if (n < REPLY_MIN) {
      throw new AppError(ERR.WORD_COUNT, `回信至少需要${REPLY_MIN}字，当前${n}字`);
    }
    const title = String(req.body?.title || '').trim();
    if (title.length > 30) throw new AppError(ERR.BAD_REQUEST, '标题最多30字');
    const moderation = await assertClean(title ? `${title}\n${content}` : content, 'letter');

    const letter = await Letter.create({
      from_uid: req.uid,
      to_uid: post.uid,
      title: title || (post.title ? `回信：${post.title}` : '回信一封匿名信'),
      content,
      word_count: n,
      status: 'sent',
      is_first: false,
      anon_uid: post.uid, // 作者是线程中保持匿名的一方
      anon_post_id: post._id,
      ...(moderation && { moderation }),
    });
    await AnonLetter.updateOne({ _id: post._id }, { $inc: { comment_count: 1 } });
    res.json(ok({ _id: letter._id }));
  } catch (err) {
    next(err);
  }
});

export default router;
