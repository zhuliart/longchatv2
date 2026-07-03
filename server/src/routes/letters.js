import { Router } from 'express';
import { ok, ERR, AppError } from '../utils/response.js';
import { countWords } from '../utils/countWords.js';
import { parsePage, asObjectId, PAGE_SIZE } from '../utils/listing.js';
import { User, Letter, Draft, Match } from '../models/index.js';
import { hasCorresponded } from '../services/match.js';

const router = Router();

const FIRST_MIN = 150;
const REPLY_MIN = 100;

function checkTitle(raw) {
  const title = String(raw || '').trim();
  if (title.length > 30) throw new AppError(ERR.BAD_REQUEST, '标题最多30字');
  return title;
}

/** 字数门槛：服务端用 countWords 重算，不信任前端（约定 §1.4-3/4） */
function checkWordCount(content, min, kind) {
  const n = countWords(content);
  if (n < min) {
    throw new AppError(ERR.WORD_COUNT, `${kind}至少需要${min}字，当前${n}字`);
  }
  return n;
}

/** 寄出成功后的收尾：删除对应草稿（契约推荐方案）+ 今日匹配置 active */
async function afterSent(fromUid, toUid) {
  await Promise.all([
    Draft.deleteMany({ uid: fromUid, to_uid: toUid }),
    Match.updateMany(
      {
        status: 'pending',
        $or: [
          { uid_a: fromUid, uid_b: toUid },
          { uid_a: toUid, uid_b: fromUid },
        ],
      },
      { $set: { status: 'active' } }
    ),
  ]);
}

/** 寄信（契约 §4）。内容审核在 M4 挂接（T4.1 挂接点：sendLetter） */
router.post('/', async (req, res, next) => {
  try {
    const toUid = asObjectId(req.body?.targetUid, '收件人不存在');
    if (toUid.equals(req.uid)) throw new AppError(ERR.BAD_REQUEST, '不能写信给自己');
    const target = await User.findById(toUid);
    if (!target || !target.has_profile) throw new AppError(ERR.BAD_REQUEST, '收件人不存在');

    // 对方曾把我的信标记拒收 → 不再接收（1003）
    if (await Letter.exists({ from_uid: req.uid, to_uid: toUid, status: 'rejected' })) {
      throw new AppError(ERR.REJECTED, '对方已拒绝接收');
    }

    // is_first 服务端判定（不信任前端）：双方无往来即首封
    const isFirst = !(await hasCorresponded(req.uid, toUid));
    const content = String(req.body?.content || '');
    const wordCount = checkWordCount(content, isFirst ? FIRST_MIN : REPLY_MIN, isFirst ? '字数不足，' : '');
    const title = checkTitle(req.body?.title);

    const letter = await Letter.create({
      from_uid: req.uid,
      to_uid: toUid,
      title,
      content,
      word_count: wordCount,
      status: 'sent',
      is_first: isFirst,
    });
    await afterSent(req.uid, toUid);
    res.json(ok({ _id: letter._id }));
  } catch (err) {
    next(err);
  }
});

/** 收件箱：to_uid=我 且过滤 archived，倒序分页，关联 senderNickname */
router.get('/inbox', async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const letters = await Letter.find({ to_uid: req.uid, status: { $ne: 'archived' } })
      .sort({ created_at: -1 })
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate('from_uid', 'nickname')
      .lean();
    res.json(
      ok(
        letters.map((l) => ({
          _id: l._id,
          from_uid: l.from_uid?._id,
          senderNickname: l.from_uid?.nickname || '',
          title: l.title,
          content: l.content,
          word_count: l.word_count,
          status: l.status,
          is_first: l.is_first,
          created_at: l.created_at,
        }))
      )
    );
  } catch (err) {
    next(err);
  }
});

/** 已发出：from_uid=我，关联 receiverNickname */
router.get('/sent', async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const letters = await Letter.find({ from_uid: req.uid })
      .sort({ created_at: -1 })
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate('to_uid', 'nickname')
      .lean();
    res.json(
      ok(
        letters.map((l) => ({
          _id: l._id,
          to_uid: l.to_uid?._id,
          receiverNickname: l.to_uid?.nickname || '',
          title: l.title,
          content: l.content,
          word_count: l.word_count,
          status: l.status,
          created_at: l.created_at,
        }))
      )
    );
  } catch (err) {
    next(err);
  }
});

/** 信件详情：仅收发双方可读；收件人首读自动置 read + read_at（契约 §4） */
router.get('/:id', async (req, res, next) => {
  try {
    const id = asObjectId(req.params.id, '信件不存在');
    const letter = await Letter.findById(id).populate('from_uid', 'nickname');
    if (!letter) throw new AppError(ERR.BAD_REQUEST, '信件不存在');
    const isSender = letter.from_uid._id.equals(req.uid);
    const isReceiver = letter.to_uid.equals(req.uid);
    if (!isSender && !isReceiver) throw new AppError(ERR.BAD_REQUEST, '无权限查看此信件');

    if (isReceiver && letter.status === 'sent') {
      letter.status = 'read';
      letter.read_at = new Date();
      await letter.save();
    }
    res.json(
      ok({
        _id: letter._id,
        from_uid: letter.from_uid._id,
        to_uid: letter.to_uid,
        parent_id: letter.parent_id,
        title: letter.title,
        content: letter.content,
        word_count: letter.word_count,
        status: letter.status,
        is_first: letter.is_first,
        created_at: letter.created_at,
        read_at: letter.read_at,
        senderNickname: letter.from_uid.nickname || '',
      })
    );
  } catch (err) {
    next(err);
  }
});

/** 回信：:id 为原信；回信人须属于原信双方；≥100 字，写 parent_id */
router.post('/:id/reply', async (req, res, next) => {
  try {
    const id = asObjectId(req.params.id, '信件不存在');
    const parent = await Letter.findById(id);
    if (!parent) throw new AppError(ERR.BAD_REQUEST, '信件不存在');
    const isSender = parent.from_uid.equals(req.uid);
    const isReceiver = parent.to_uid.equals(req.uid);
    if (!isSender && !isReceiver) throw new AppError(ERR.BAD_REQUEST, '无权限回复此信件');

    const toUid = isSender ? parent.to_uid : parent.from_uid;
    const content = String(req.body?.content || '');
    const wordCount = checkWordCount(content, REPLY_MIN, '回信');
    const title = checkTitle(req.body?.title);

    const letter = await Letter.create({
      from_uid: req.uid,
      to_uid: toUid,
      parent_id: parent._id,
      title,
      content,
      word_count: wordCount,
      status: 'sent',
      is_first: false,
    });
    await afterSent(req.uid, toUid);
    res.json(ok({ _id: letter._id }));
  } catch (err) {
    next(err);
  }
});

/** 归档：仅信件相关方；归档后不再进收件箱 */
router.post('/:id/archive', async (req, res, next) => {
  try {
    const id = asObjectId(req.params.id, '信件不存在');
    const letter = await Letter.findById(id);
    if (!letter) throw new AppError(ERR.BAD_REQUEST, '信件不存在');
    if (!letter.from_uid.equals(req.uid) && !letter.to_uid.equals(req.uid)) {
      throw new AppError(ERR.BAD_REQUEST, '无权限操作此信件');
    }
    letter.status = 'archived';
    await letter.save();
    res.json(ok(null));
  } catch (err) {
    next(err);
  }
});

export default router;
