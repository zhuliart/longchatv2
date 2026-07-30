import { Router } from 'express';
import { ok, ERR, AppError } from '../utils/response.js';
import { countWords } from '../utils/countWords.js';
import { parsePage, asObjectId, PAGE_SIZE } from '../utils/listing.js';
import { User, Letter, Draft, Match } from '../models/index.js';
import { hasCorresponded } from '../services/match.js';
import { assertClean } from '../services/moderation.js';

const router = Router();


/** 线程中的匿名方（兼容旧数据：is_anonymous 表示寄件人匿名） */
const anonPartyOf = (l) =>
  l.anon_uid || (l.is_anonymous ? (l.from_uid?._id || l.from_uid) : null);
const isAnonParty = (l, uid) => {
  const a = anonPartyOf(l);
  return !!a && String(a) === String(uid);
};

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

/** 寄信（契约 §4）。落库前过内容审核（T4.1 挂接点：sendLetter） */
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
    const moderation = await assertClean(title ? `${title}\n${content}` : content, 'letter');

    const letter = await Letter.create({
      from_uid: req.uid,
      to_uid: toUid,
      title,
      content,
      word_count: wordCount,
      status: 'sent',
      is_first: isFirst,
      is_anonymous: req.body?.isAnonymous === true, // 匿名寄出：收件人不见寄件人身份
      ...(req.body?.isAnonymous === true && { anon_uid: req.uid }),
      ...(moderation && { moderation }),
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
        letters.map((l) => {
          const maskSender = isAnonParty(l, l.from_uid?._id); // 匿名方=寄件人 → 对收件人隐去
          return {
          _id: l._id,
          from_uid: maskSender ? null : l.from_uid?._id,
          senderNickname: maskSender ? '匿名笔友' : l.from_uid?.nickname || '',
          isAnonymous: maskSender,
          title: l.title,
          content: l.content,
          word_count: l.word_count,
          status: l.status,
          is_first: l.is_first,
          created_at: l.created_at,
          };
        })
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
        letters.map((l) => {
          const maskReceiver = isAnonParty(l, l.to_uid?._id); // 匿名方=收件人 → 对寄件人隐去
          return {
          _id: l._id,
          to_uid: maskReceiver ? null : l.to_uid?._id,
          receiverNickname: maskReceiver ? '匿名笔友' : l.to_uid?.nickname || '',
          isAnonymous: maskReceiver,
          title: l.title,
          content: l.content,
          word_count: l.word_count,
          status: l.status,
          created_at: l.created_at,
          };
        })
      )
    );
  } catch (err) {
    next(err);
  }
});

/** 归档箱：我收到且已归档的信（归档=从收件箱收起，不是删除） */
router.get('/archived', async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const letters = await Letter.find({ to_uid: req.uid, status: 'archived' })
      .sort({ created_at: -1 })
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate('from_uid', 'nickname')
      .lean();
    res.json(
      ok(
        letters.map((l) => {
          const maskSender = isAnonParty(l, l.from_uid?._id);
          return {
            _id: l._id,
            from_uid: maskSender ? null : l.from_uid?._id,
            senderNickname: maskSender ? '匿名笔友' : l.from_uid?.nickname || '',
            isAnonymous: maskSender,
            title: l.title,
            content: l.content,
            word_count: l.word_count,
            status: l.status,
            is_first: l.is_first,
            created_at: l.created_at,
          };
        })
      )
    );
  } catch (err) {
    next(err);
  }
});

/** 取消归档：放回收件箱（置回已读态）；仅信件相关方 */
router.post('/:id/unarchive', async (req, res, next) => {
  try {
    const id = asObjectId(req.params.id, '信件不存在');
    const letter = await Letter.findById(id);
    if (!letter) throw new AppError(ERR.BAD_REQUEST, '信件不存在');
    if (!letter.from_uid.equals(req.uid) && !letter.to_uid.equals(req.uid)) {
      throw new AppError(ERR.BAD_REQUEST, '无权限操作此信件');
    }
    if (letter.status === 'archived') {
      letter.status = 'read';
      await letter.save();
    }
    res.json(ok(null));
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
    const maskSender = isAnonParty(letter, letter.from_uid._id) && !isSender; // 匿名方=寄件人，看信的是收件人
    const maskReceiver = isAnonParty(letter, letter.to_uid) && isSender; // 匿名方=收件人，看信的是寄件人
    res.json(
      ok({
        _id: letter._id,
        from_uid: maskSender ? null : letter.from_uid._id,
        to_uid: maskReceiver ? null : letter.to_uid,
        parent_id: letter.parent_id,
        title: letter.title,
        content: letter.content,
        word_count: letter.word_count,
        status: letter.status,
        is_first: letter.is_first,
        isAnonymous: maskSender || maskReceiver,
        created_at: letter.created_at,
        read_at: letter.read_at,
        senderNickname: maskSender ? '匿名笔友' : letter.from_uid.nickname || '',
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
    const moderation = await assertClean(title ? `${title}\n${content}` : content, 'letter');

    const letter = await Letter.create({
      from_uid: req.uid,
      to_uid: toUid,
      parent_id: parent._id,
      title,
      content,
      word_count: wordCount,
      status: 'sent',
      is_first: false,
      // 沿线程继承匿名方：匿名方无论作为寄件或收件，身份对另一方持续隐去
      anon_uid: anonPartyOf(parent),
      is_anonymous: isAnonParty(parent, req.uid),
      ...(moderation && { moderation }),
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
