import test from 'node:test';
import assert from 'node:assert/strict';

// 测试环境变量须在 import config 之前就位（独立测试库，跑完即删）
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGO_URI =
  process.env.MONGO_URI_TEST ||
  'mongodb://pingchang:pingchang_dev@localhost:27017/pingchang-test-m3?authSource=admin';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { default: mongoose } = await import('mongoose');
const { default: request } = await import('supertest');
const { createApp } = await import('../src/app.js');
const { User, Letter, Draft, Mood, Match, OFFICIAL_ACCOUNT } = await import('../src/models/index.js');
const { ymd } = await import('../src/utils/listing.js');

let dbUp = true;
try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2500 });
  await mongoose.connection.dropDatabase();
} catch {
  dbUp = false;
  console.warn('⚠ MongoDB 不可达，跳过 M3 接口测试（先 docker compose -f deploy/docker-compose.dev.yml up -d）');
}
const opts = { skip: !dbUp };

test.after(async () => {
  if (dbUp) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

const app = createApp();
const zh = (n) => '字'.repeat(n);
const TODAY = ymd();
const yesterdayYmd = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return ymd(d);
};
const lastYearTodayYmd = () => `${parseInt(TODAY.slice(0, 4), 10) - 1}${TODAY.slice(4)}`;

/** 注册 + 引导，返回 { token, uid, auth } */
async function newUser(account, nickname, tags, extras = {}) {
  const reg = await request(app).post('/api/v1/auth/register').send({ account, password: 'pass66' });
  const token = reg.body.data.token;
  const auth = { Authorization: `Bearer ${token}` };
  await request(app).post('/api/v1/users/profile').set(auth).send({
    nickname,
    intro: '这是一段专门用于接口测试的自我介绍，字数控制在合法范围之内。',
    tags,
    activeTime: 'night',
    letterFreq: 'biweekly',
    ...extras,
  });
  const me = await request(app).get('/api/v1/users/me').set(auth);
  return { token, auth, uid: me.body.data._id, nickname };
}

let messenger; // 官方号
let A; let B; let C; let D;

test('准备：官方号 + 四个测试用户', opts, async () => {
  messenger = await User.create({
    account: OFFICIAL_ACCOUNT,
    password_hash: 'x'.repeat(60),
    nickname: '平常信使',
    intro: '平常的官方信使，负责在你还没有遇到笔友的时候先陪你写一写字。',
    tags: ['文学', '书法', '自然'],
    has_profile: true,
  });
  A = await newUser('aa@test.com', '安然', ['文学', '摄影', '冥想'], { activeTime: 'night', letterFreq: 'biweekly' });
  B = await newUser('bb@test.com', '北屿', ['文学', '摄影', '旅行'], { activeTime: 'night', letterFreq: 'weekly' });
  C = await newUser('cc@test.com', '沉舟', ['哲学', '天文', '科幻'], { activeTime: 'morning', letterFreq: 'free' });
  D = await newUser('dd@test.com', '远山', ['哲学', '音乐', '园艺'], { activeTime: 'morning', letterFreq: 'free' });
  assert.ok(A.uid && B.uid && C.uid && D.uid);
});

// ============ T3.1 书信 ============

let letterAB; // A→B 首封

test('letters: 首封 149 字 → 1002（边界），150 字 → 成功', opts, async () => {
  const fail149 = await request(app).post('/api/v1/letters').set(A.auth)
    .send({ targetUid: B.uid, content: zh(149) });
  assert.equal(fail149.body.code, 1002);
  assert.match(fail149.body.message, /至少需要150字，当前149字/);

  // 寄出前先留一份给 B 的草稿：寄出成功后服务端应删除
  await request(app).post('/api/v1/drafts').set(A.auth).send({ targetUid: B.uid, content: '草稿内容' });
  // 预置一条 pending 匹配：寄出后应置 active
  await Match.create({ uid_a: A.uid, uid_b: B.uid, score: 50, status: 'pending' });

  const sent = await request(app).post('/api/v1/letters').set(A.auth)
    .send({ targetUid: B.uid, content: zh(150), title: '首封信' });
  assert.equal(sent.body.code, 0);
  letterAB = sent.body.data._id;

  assert.equal(await Draft.countDocuments({ uid: A.uid, to_uid: B.uid }), 0, '寄出后草稿应被删除');
  assert.equal((await Match.findOne({ uid_a: A.uid, uid_b: B.uid })).status, 'active', '匹配应置 active');
});

test('letters: 收件人不存在 / 写给自己 / 非法 id → 9001', opts, async () => {
  const ghost = new mongoose.Types.ObjectId();
  assert.equal((await request(app).post('/api/v1/letters').set(A.auth)
    .send({ targetUid: ghost, content: zh(150) })).body.code, 9001);
  assert.equal((await request(app).post('/api/v1/letters').set(A.auth)
    .send({ targetUid: A.uid, content: zh(150) })).body.code, 9001);
  assert.equal((await request(app).get('/api/v1/letters/not-an-id').set(A.auth)).body.code, 9001);
});

test('letters: 越权 —— 第三人读信/回信 → 9001', opts, async () => {
  assert.equal((await request(app).get(`/api/v1/letters/${letterAB}`).set(C.auth)).body.code, 9001);
  assert.equal((await request(app).post(`/api/v1/letters/${letterAB}/reply`).set(C.auth)
    .send({ content: zh(100) })).body.code, 9001);
});

test('letters: 发件人读信不改状态；收件人首读自动置 read + read_at', opts, async () => {
  const bySender = await request(app).get(`/api/v1/letters/${letterAB}`).set(A.auth);
  assert.equal(bySender.body.data.status, 'sent');
  const byReceiver = await request(app).get(`/api/v1/letters/${letterAB}`).set(B.auth);
  assert.equal(byReceiver.body.data.status, 'read');
  assert.ok(byReceiver.body.data.read_at);
  assert.equal(byReceiver.body.data.senderNickname, '安然');
});

test('letters: inbox 关联 senderNickname；sent 关联 receiverNickname', opts, async () => {
  const inbox = await request(app).get('/api/v1/letters/inbox').set(B.auth);
  assert.equal(inbox.body.data.length, 1);
  assert.equal(inbox.body.data[0].senderNickname, '安然');
  const sent = await request(app).get('/api/v1/letters/sent').set(A.auth);
  assert.equal(sent.body.data.length, 1);
  assert.equal(sent.body.data[0].receiverNickname, '北屿');
});

test('letters: 回信 99 字 → 1002（边界），100 字 → 成功且 parent_id 指向原信', opts, async () => {
  const fail99 = await request(app).post(`/api/v1/letters/${letterAB}/reply`).set(B.auth)
    .send({ content: zh(99) });
  assert.equal(fail99.body.code, 1002);
  assert.match(fail99.body.message, /回信至少需要100字，当前99字/);

  const okRes = await request(app).post(`/api/v1/letters/${letterAB}/reply`).set(B.auth)
    .send({ content: zh(100), title: '回信' });
  assert.equal(okRes.body.code, 0);
  const reply = await request(app).get(`/api/v1/letters/${okRes.body.data._id}`).set(A.auth);
  assert.equal(String(reply.body.data.parent_id), String(letterAB));
  assert.equal(reply.body.data.is_first, false);
});

test('letters: 已有往来后再寄门槛降为 100 字', opts, async () => {
  const res = await request(app).post('/api/v1/letters').set(A.auth)
    .send({ targetUid: B.uid, content: zh(100) });
  assert.equal(res.body.code, 0);
});

test('letters: 归档 —— 收件人归档后不再进收件箱；第三人归档 → 9001', opts, async () => {
  assert.equal((await request(app).post(`/api/v1/letters/${letterAB}/archive`).set(C.auth)).body.code, 9001);
  assert.equal((await request(app).post(`/api/v1/letters/${letterAB}/archive`).set(B.auth)).body.code, 0);
  const inbox = await request(app).get('/api/v1/letters/inbox').set(B.auth);
  assert.ok(!inbox.body.data.some((l) => String(l._id) === String(letterAB)), '归档信不应再出现在收件箱');
});

test('letters: 对方已拒收 → 1003', opts, async () => {
  await Letter.create({
    from_uid: A.uid, to_uid: C.uid, content: zh(150), word_count: 150, status: 'rejected', is_first: true,
  });
  const res = await request(app).post('/api/v1/letters').set(A.auth)
    .send({ targetUid: C.uid, content: zh(150) });
  assert.equal(res.body.code, 1003);
});

// ============ T3.2 草稿 ============

let draftId;

test('drafts: 新建（未定收件人 required=150）与更新（带 id）', opts, async () => {
  const created = await request(app).post('/api/v1/drafts').set(A.auth)
    .send({ content: '今天莫名地想写点什么', title: '' });
  assert.equal(created.body.code, 0);
  draftId = created.body.data._id;

  const updated = await request(app).post('/api/v1/drafts').set(A.auth)
    .send({ id: draftId, content: '今天莫名地想写点什么，可还没想好寄给谁。' });
  assert.equal(String(updated.body.data._id), String(draftId));

  const list = await request(app).get('/api/v1/drafts').set(A.auth);
  const d = list.body.data.find((x) => String(x._id) === String(draftId));
  assert.equal(d.required, 150);
  assert.equal(d.receiverNickname, '');
  assert.ok(d.excerpt.includes('还没想好寄给谁'));
  assert.equal(d.word_count, 18);
});

test('drafts: 指向已通信对象 required=100（is_first 服务端判定）', opts, async () => {
  const created = await request(app).post('/api/v1/drafts').set(A.auth)
    .send({ targetUid: B.uid, content: '给北屿的新草稿' });
  const list = await request(app).get('/api/v1/drafts').set(A.auth);
  const d = list.body.data.find((x) => String(x._id) === String(created.body.data._id));
  assert.equal(d.required, 100);
  assert.equal(d.receiverNickname, '北屿');
  await request(app).delete(`/api/v1/drafts/${created.body.data._id}`).set(A.auth);
});

test('drafts: 越权 —— 他人更新/删除 → 9001；本人删除 → ok', opts, async () => {
  assert.equal((await request(app).post('/api/v1/drafts').set(C.auth)
    .send({ id: draftId, content: 'hack' })).body.code, 9001);
  assert.equal((await request(app).delete(`/api/v1/drafts/${draftId}`).set(C.auth)).body.code, 9001);
  assert.equal((await request(app).delete(`/api/v1/drafts/${draftId}`).set(A.auth)).body.code, 0);
  assert.equal((await request(app).delete(`/api/v1/drafts/${draftId}`).set(A.auth)).body.code, 9001);
});

// ============ T3.3 情绪 ============

let moodTodayA; // A 今天的公开心情

test('moods: 日记 29 字 → 1002（边界），30 字 → 成功；同日重复提交覆盖（upsert）', opts, async () => {
  const fail29 = await request(app).put(`/api/v1/moods/${TODAY}`).set(A.auth)
    .send({ emotion: 'happy', intensity: 4, diary: zh(29) });
  assert.equal(fail29.body.code, 1002);
  assert.match(fail29.body.message, /日记至少需要30字，当前29字/);

  const first = await request(app).put(`/api/v1/moods/${TODAY}`).set(A.auth)
    .send({ emotion: 'happy', intensity: 4, feeling: '雀跃', visibility: 'public', diary: zh(30) });
  assert.equal(first.body.code, 0);
  moodTodayA = first.body.data._id;
  assert.equal(first.body.data.date, TODAY);

  const second = await request(app).put(`/api/v1/moods/${TODAY}`).set(A.auth)
    .send({ emotion: 'calm', intensity: 2, visibility: 'public', diary: zh(31) });
  assert.equal(String(second.body.data._id), String(moodTodayA), 'upsert 应复用同一条记录');
  assert.equal(await Mood.countDocuments({ uid: A.uid, date: TODAY }), 1);
});

test('moods: 未来日期 / 往日全量写入 / 非法枚举 → 拒绝', opts, async () => {
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return ymd(d); })();
  assert.equal((await request(app).put(`/api/v1/moods/${tomorrow}`).set(A.auth)
    .send({ emotion: 'happy', intensity: 3 })).body.code, 9001);
  assert.equal((await request(app).put(`/api/v1/moods/${yesterdayYmd()}`).set(A.auth)
    .send({ emotion: 'happy', intensity: 3 })).body.code, 9001);
  assert.equal((await request(app).put(`/api/v1/moods/${TODAY}`).set(A.auth)
    .send({ emotion: 'angry', intensity: 3 })).body.code, 9001);
  assert.equal((await request(app).put(`/api/v1/moods/${TODAY}`).set(A.auth)
    .send({ emotion: 'happy', intensity: 6 })).body.code, 9001);
  assert.equal((await request(app).put('/api/v1/moods/2026-7-3').set(A.auth)
    .send({ emotion: 'happy', intensity: 3 })).body.code, 9001);
});

test('moods: 月记录列表（月历/趋势共用），字段含 commentCount', opts, async () => {
  const [y, m] = [TODAY.slice(0, 4), parseInt(TODAY.slice(5, 7), 10)];
  const res = await request(app).get(`/api/v1/moods?year=${y}&month=${m}`).set(A.auth);
  assert.equal(res.body.code, 0);
  const rec = res.body.data.find((x) => x.date === TODAY);
  assert.equal(rec.emotion, 'calm');
  assert.equal(rec.commentCount, 0);
  assert.equal((await request(app).get('/api/v1/moods?year=2026&month=13').set(A.auth)).body.code, 9001);
});

test('moods: 往日仅可改可见性 —— 本人 ok，他人 9001', opts, async () => {
  const past = await Mood.create({
    uid: A.uid, emotion: 'sad', intensity: 2, visibility: 'private', date: yesterdayYmd(),
  });
  assert.equal((await request(app).patch(`/api/v1/moods/${past._id}/visibility`).set(C.auth)
    .send({ visibility: 'public' })).body.code, 9001);
  const okRes = await request(app).patch(`/api/v1/moods/${past._id}/visibility`).set(A.auth)
    .send({ visibility: 'friends' });
  assert.equal(okRes.body.code, 0);
  assert.equal(okRes.body.data.visibility, 'friends');
  assert.equal((await request(app).patch(`/api/v1/moods/${past._id}/visibility`).set(A.auth)
    .send({ visibility: 'everyone' })).body.code, 9001);
});

test('moods: 去年今日 —— mood 优先 / letter 兜底 / 无记忆 null', opts, async () => {
  await Mood.create({
    uid: A.uid, emotion: 'calm', feeling: '释然', intensity: 3, visibility: 'private',
    diary: zh(30), date: lastYearTodayYmd(),
  });
  const memA = await request(app).get('/api/v1/moods/memory-today').set(A.auth);
  assert.equal(memA.body.data.type, 'mood');
  assert.equal(memA.body.data.date, lastYearTodayYmd());

  const lastYearDate = new Date(`${lastYearTodayYmd()}T10:00:00`);
  await Letter.create(
    [{ from_uid: B.uid, to_uid: A.uid, content: zh(150), word_count: 150, status: 'read', is_first: true, created_at: lastYearDate }],
    { timestamps: false }
  );
  const memB = await request(app).get('/api/v1/moods/memory-today').set(B.auth);
  assert.equal(memB.body.data.type, 'letter');

  const memC = await request(app).get('/api/v1/moods/memory-today').set(C.auth);
  assert.equal(memC.body.data, null);
  assert.equal(memC.body.message, 'no memory');
});

// ============ T3.4 心情广场 ============

let topCommentId;

test('plaza: 仅 public 可见；includeSelf 默认过滤本人', opts, async () => {
  const byB = await request(app).get('/api/v1/plaza/moods').set(B.auth);
  assert.ok(byB.body.data.some((m) => String(m._id) === String(moodTodayA)));
  assert.equal(byB.body.data.find((m) => String(m._id) === String(moodTodayA)).authorNickname, '安然');

  const byASelf = await request(app).get('/api/v1/plaza/moods').set(A.auth);
  assert.ok(!byASelf.body.data.some((m) => String(m._id) === String(moodTodayA)));
  const byAInclude = await request(app).get('/api/v1/plaza/moods?includeSelf=true').set(A.auth);
  assert.ok(byAInclude.body.data.some((m) => String(m._id) === String(moodTodayA)));
});

test('plaza: 评论 —— 0/201 字拒绝（边界），成功后 commentCount+1', opts, async () => {
  assert.equal((await request(app).post(`/api/v1/plaza/moods/${moodTodayA}/comments`).set(B.auth)
    .send({ content: '😊' })).body.code, 1002); // 纯 emoji 计 0 字
  const fail201 = await request(app).post(`/api/v1/plaza/moods/${moodTodayA}/comments`).set(B.auth)
    .send({ content: zh(201) });
  assert.equal(fail201.body.code, 1002);
  assert.match(fail201.body.message, /1-200字之间，当前201字/);

  const okRes = await request(app).post(`/api/v1/plaza/moods/${moodTodayA}/comments`).set(B.auth)
    .send({ content: '说得真好，被一个陌生人理解的感觉。' });
  assert.equal(okRes.body.code, 0);
  assert.equal(okRes.body.data.commentCount, 1);
  topCommentId = okRes.body.data._id;
});

test('plaza: 两级评论 —— 回复顶层挂 parent_id；回复「回复」压平到顶层', opts, async () => {
  const reply = await request(app).post(`/api/v1/plaza/moods/${moodTodayA}/comments`).set(A.auth)
    .send({ content: '谢谢你呀。', parentId: topCommentId });
  assert.equal(reply.body.code, 0);
  const replyToReply = await request(app).post(`/api/v1/plaza/moods/${moodTodayA}/comments`).set(B.auth)
    .send({ content: '也谢谢你。', parentId: reply.body.data._id });
  assert.equal(replyToReply.body.code, 0);

  const list = await request(app).get(`/api/v1/plaza/moods/${moodTodayA}/comments`).set(C.auth);
  assert.equal(list.body.data.length, 3);
  const flat = list.body.data.find((c) => String(c._id) === String(replyToReply.body.data._id));
  assert.equal(String(flat.parent_id), String(topCommentId), '回复「回复」应压平到顶层评论');
  assert.equal(list.body.data[0].fromNickname, '北屿');
});

test('plaza: 非 public 心情不可评论；下架保留评论仅本人可看', opts, async () => {
  const past = await Mood.findOne({ uid: A.uid, date: yesterdayYmd() }); // friends 可见性
  assert.equal((await request(app).post(`/api/v1/plaza/moods/${past._id}/comments`).set(B.auth)
    .send({ content: '不该能评' })).body.code, 9001);

  // 公开 → 私密：广场消失、评论保留、仅本人可读评论列表
  await request(app).patch(`/api/v1/moods/${moodTodayA}/visibility`).set(A.auth).send({ visibility: 'private' });
  const plaza = await request(app).get('/api/v1/plaza/moods').set(B.auth);
  assert.ok(!plaza.body.data.some((m) => String(m._id) === String(moodTodayA)), '下架后不应出现在广场');
  assert.equal((await request(app).get(`/api/v1/plaza/moods/${moodTodayA}/comments`).set(B.auth)).body.code, 9001);
  const byOwner = await request(app).get(`/api/v1/plaza/moods/${moodTodayA}/comments`).set(A.auth);
  assert.equal(byOwner.body.data.length, 3, '评论应保留');
  // 恢复公开，供后续 recentExcerpt 测试
  await request(app).patch(`/api/v1/moods/${moodTodayA}/visibility`).set(A.auth).send({ visibility: 'public' });
});

// ============ T3.5 匹配 ============

test('matches: 冷启动 —— 无当日记录时现场生成，不足 3 人补「平常信使」', opts, async () => {
  // C 的候选：B、D（A 因拒收信与 C 已有往来记录被排除）→ 不足 3 人补官方号
  const res = await request(app).get('/api/v1/matches/daily').set(C.auth);
  assert.equal(res.body.code, 0);
  assert.equal(res.body.data.length, 3, 'B + D + 平常信使');
  const nicknames = res.body.data.map((m) => m.profile.nickname);
  assert.ok(nicknames.includes('平常信使'), '冷启动应补官方号');
  assert.ok(!res.body.data.some((m) => String(m.profile._id) === String(A.uid)), '拒收往来者不应被推荐');
  const item = res.body.data[0];
  assert.ok(Array.isArray(item.tagsCommon));
  assert.ok(typeof item.score === 'number' && item.score <= 100);
  assert.ok(item.profile.intro);
  assert.equal(item.profile.account, undefined, '不得泄露账号');
});

test('matches: 已通信关系不再推荐', opts, async () => {
  const res = await request(app).get('/api/v1/matches/daily').set(A.auth);
  assert.equal(res.body.code, 0);
  const uids = res.body.data.map((m) => String(m.profile._id));
  assert.ok(!uids.includes(String(B.uid)), 'A 与 B 已通信，不应推荐');
});

test('matches: skip 后当日不再出现；额度（免费 3）用完 → 1004', opts, async () => {
  const before = await request(app).get('/api/v1/matches/daily').set(C.auth);
  const targets = before.body.data.map((m) => String(m.profile._id));
  await request(app).post(`/api/v1/matches/${targets[0]}/skip`).set(C.auth);
  const after = await request(app).get('/api/v1/matches/daily').set(C.auth);
  assert.ok(!after.body.data.some((m) => String(m.profile._id) === targets[0]), '跳过者应消失');
  assert.equal(after.body.data.length, 2, '免费额度 3 - 已消费 1 = 2');

  await request(app).post(`/api/v1/matches/${targets[1]}/skip`).set(C.auth);
  await request(app).post(`/api/v1/matches/${targets[2]}/skip`).set(C.auth);
  const used = await request(app).get('/api/v1/matches/daily').set(C.auth);
  assert.equal(used.body.code, 1004);
  assert.deepEqual(used.body.data, []);
  assert.match(used.body.message, /今日推荐已用完/);
});

test('matches: 会员额度 5；skip 幂等', opts, async () => {
  await User.updateOne({ _id: C.uid }, { $set: { is_member: true } });
  const res = await request(app).get('/api/v1/matches/daily').set(C.auth);
  assert.equal(res.body.code, 0, '会员额度 5 > 已消费 3，不应 1004');
  await User.updateOne({ _id: C.uid }, { $set: { is_member: false } });
  assert.equal((await request(app).post(`/api/v1/matches/${B.uid}/skip`).set(C.auth)).body.code, 0);
});

// ============ T3.6 用户 ============

test('users: PATCH /me 传啥改啥；非法值逐项拒绝', opts, async () => {
  const res = await request(app).patch('/api/v1/users/me').set(A.auth).send({ nickname: '安然改' });
  assert.equal(res.body.code, 0);
  assert.equal(res.body.data.nickname, '安然改');
  assert.equal(res.body.data.tags.length, 3, '未传字段不应变');

  assert.equal((await request(app).patch('/api/v1/users/me').set(A.auth)
    .send({ intro: zh(19) })).body.code, 1002);
  assert.equal((await request(app).patch('/api/v1/users/me').set(A.auth)
    .send({ intro: zh(61) })).body.code, 1002);
  assert.equal((await request(app).patch('/api/v1/users/me').set(A.auth)
    .send({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] })).body.code, 9001);
  assert.equal((await request(app).patch('/api/v1/users/me').set(A.auth)
    .send({ activeTime: 'noon' })).body.code, 9001);
  await request(app).patch('/api/v1/users/me').set(A.auth).send({ nickname: '安然' });
});

test('users: 他人公开资料只回安全字段 + recentExcerpt ≤50 + 中文标签', opts, async () => {
  const res = await request(app).get(`/api/v1/users/${A.uid}/profile`).set(C.auth);
  assert.equal(res.body.code, 0);
  const p = res.body.data;
  assert.equal(p.nickname, '安然');
  assert.equal(p.isActiveRecently, true);
  assert.equal(p.activeTimeLabel, '夜深');
  assert.equal(p.letterFreqLabel, '每两周一封');
  assert.ok(p.recentExcerpt.length > 0 && p.recentExcerpt.length <= 51, 'recentExcerpt 应 ≤50 字（含省略号 51）');
  // 安全字段之外一概不回
  for (const field of ['account', 'password_hash', 'is_member', 'has_profile', 'member_expire']) {
    assert.equal(p[field], undefined, `${field} 不应下发`);
  }

  const ghost = new mongoose.Types.ObjectId();
  assert.equal((await request(app).get(`/api/v1/users/${ghost}/profile`).set(C.auth)).body.code, 9001);
});
