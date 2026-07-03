import { Router } from 'express';
import { ok, ERR, AppError } from '../utils/response.js';
import { countWords } from '../utils/countWords.js';
import { parsePage, asObjectId, excerpt, PAGE_SIZE } from '../utils/listing.js';
import { User, Draft } from '../models/index.js';
import { hasCorresponded } from '../services/match.js';

const router = Router();

/**
 * 保存/更新草稿（契约 §4）：带 id 更新、不带新建；targetUid 可空（「还没想好寄给谁」）；
 * 草稿是未发布内容，不过审核（约定 §1.4-7 例外，见步骤书 T3.2）。
 */
router.post('/', async (req, res, next) => {
  try {
    const content = String(req.body?.content || '');
    const title = String(req.body?.title || '').trim();
    if (title.length > 30) throw new AppError(ERR.BAD_REQUEST, '标题最多30字');

    let toUid = null;
    if (req.body?.targetUid) {
      toUid = asObjectId(req.body.targetUid, '收件人不存在');
      const target = await User.findById(toUid);
      if (!target || !target.has_profile) throw new AppError(ERR.BAD_REQUEST, '收件人不存在');
    }
    // required 门槛依据：显式传 isFirst 用之，否则按有无往来判定（无收件人视为首封）
    const isFirst =
      typeof req.body?.isFirst === 'boolean'
        ? req.body.isFirst
        : !(toUid && (await hasCorresponded(req.uid, toUid)));

    const fields = { to_uid: toUid, title, content, word_count: countWords(content), is_first: isFirst };

    if (req.body?.id) {
      const id = asObjectId(req.body.id, '草稿不存在');
      const draft = await Draft.findOne({ _id: id, uid: req.uid });
      if (!draft) throw new AppError(ERR.BAD_REQUEST, '草稿不存在');
      draft.set(fields);
      await draft.save();
      return res.json(ok({ _id: draft._id }));
    }
    const draft = await Draft.create({ uid: req.uid, ...fields });
    res.json(ok({ _id: draft._id }));
  } catch (err) {
    next(err);
  }
});

/** 草稿列表：excerpt 服务端截取；required 按 is_first 给 150/100 */
router.get('/', async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const drafts = await Draft.find({ uid: req.uid })
      .sort({ updated_at: -1 })
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate('to_uid', 'nickname')
      .lean();
    res.json(
      ok(
        drafts.map((d) => ({
          _id: d._id,
          to_uid: d.to_uid?._id || null,
          receiverNickname: d.to_uid?.nickname || '',
          title: d.title,
          excerpt: excerpt(d.content, 60),
          word_count: d.word_count,
          required: d.is_first ? 150 : 100,
          updated_at: d.updated_at,
        }))
      )
    );
  } catch (err) {
    next(err);
  }
});

/** 删除草稿：仅本人 */
router.delete('/:id', async (req, res, next) => {
  try {
    const id = asObjectId(req.params.id, '草稿不存在');
    const { deletedCount } = await Draft.deleteOne({ _id: id, uid: req.uid });
    if (!deletedCount) throw new AppError(ERR.BAD_REQUEST, '草稿不存在');
    res.json(ok(null));
  } catch (err) {
    next(err);
  }
});

export default router;
