import test from 'node:test';
import assert from 'node:assert/strict';

// 测试环境变量须在 import config 之前就位（独立测试库，跑完即删）
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGO_URI =
  process.env.MONGO_URI_TEST ||
  'mongodb://pingchang:pingchang_dev@localhost:27017/pingchang-test-anon?authSource=admin';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { default: mongoose } = await import('mongoose');
const { default: request } = await import('supertest');
const { createApp } = await import('../src/app.js');

let dbUp = true;
try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2500 });
  await mongoose.connection.dropDatabase();
} catch {
  dbUp = false;
  console.warn('⚠ MongoDB 不可达，跳过匿名信接口测试（先 docker compose -f deploy/docker-compose.dev.yml up -d）');
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

const A = { account: 'anon-a@test.dev', pwd: 'test123456' };
const B = { account: 'anon-b@test.dev', pwd: 'test123456' };

async function mkUser(u, nickname) {
  const reg = await request(app).post('/api/v1/auth/register').send({ account: u.account, password: u.pwd });
  u.token = reg.body.data.token;
  u.auth = { Authorization: `Bearer ${u.token}` };
  const prof = await request(app).post('/api/v1/users/profile').set(u.auth).send({
    nickname,
    intro: '这是一段专门用于接口测试的自我介绍，字数控制在合法范围之内。',
    tags: ['文学', '摄影', '冥想'],
  });
  assert.equal(prof.body.code, 0);
  const me = await request(app).get('/api/v1/users/me').set(u.auth);
  u.uid = me.body.data._id;
}

let postId = null;
let letterId = null;

test('准备：两个测试用户', opts, async () => {
  await mkUser(A, '匿甲');
  await mkUser(B, '匿乙');
});

test('anon: 匿名信 29 字 → 1002（边界），30 字 → 成功', opts, async () => {
  const fail = await request(app).post('/api/v1/anon/letters').set(A.auth).send({ content: zh(29) });
  assert.equal(fail.body.code, 1002);
  assert.match(fail.body.message, /至少需要30字，当前29字/);
  const ok = await request(app).post('/api/v1/anon/letters').set(A.auth).send({ title: '树洞', content: zh(30) });
  assert.equal(ok.body.code, 0);
  postId = ok.body.data._id;
});

test('anon: 列表不泄露作者身份；isMine 仅对本人为 true', opts, async () => {
  const mine = await request(app).get('/api/v1/anon/letters').set(A.auth);
  assert.equal(mine.body.code, 0);
  const p = mine.body.data.find((x) => x._id === postId);
  assert.ok(p);
  assert.equal(p.isMine, true);
  assert.equal(p.uid, undefined, '响应不得包含 uid');
  assert.equal(p.authorNickname, undefined, '响应不得包含作者昵称');

  const other = await request(app).get('/api/v1/anon/letters').set(B.auth);
  assert.equal(other.body.data.find((x) => x._id === postId).isMine, false);
});

test('anon: 树洞回信 —— 99 字 1002；100 字落作者收件箱（作者见实名，回信人见匿名）', opts, async () => {
  // 自己回自己的匿名信 → 拒绝
  assert.equal((await request(app).post(`/api/v1/anon/letters/${postId}/reply`).set(A.auth)
    .send({ content: zh(100) })).body.code, 9001);
  // 边界：99 → 1002
  assert.equal((await request(app).post(`/api/v1/anon/letters/${postId}/reply`).set(B.auth)
    .send({ content: zh(99) })).body.code, 1002);
  // 100 → 成功，计数 +1
  const ok = await request(app).post(`/api/v1/anon/letters/${postId}/reply`).set(B.auth)
    .send({ content: zh(100) });
  assert.equal(ok.body.code, 0);
  const list = await request(app).get('/api/v1/anon/letters').set(B.auth);
  assert.equal(list.body.data.find((x) => x._id === postId).replyCount, 1);

  // 作者 A 收件箱：能看到 B 实名的回信
  const aInbox = await request(app).get('/api/v1/letters/inbox').set(A.auth);
  const got = aInbox.body.data[0];
  assert.equal(got.senderNickname, '匿乙');
  // B 已发出：收件人（树洞作者）对 B 保持匿名
  const bSent = await request(app).get('/api/v1/letters/sent').set(B.auth);
  assert.equal(bSent.body.data[0].receiverNickname, '匿名笔友');
  assert.equal(bSent.body.data[0].to_uid, null);

  // A 从收件箱正常回信 → B 收到的信寄件人仍是「匿名笔友」（线程内持续脱敏）
  const reply = await request(app).post(`/api/v1/letters/${got._id}/reply`).set(A.auth)
    .send({ content: zh(100) });
  assert.equal(reply.body.code, 0);
  const bInbox = await request(app).get('/api/v1/letters/inbox').set(B.auth);
  assert.equal(bInbox.body.data[0].senderNickname, '匿名笔友');
  assert.equal(bInbox.body.data[0].from_uid, null);
});

test('letters: 匿名直寄 —— 收件人视角隐去寄件人，寄件人视角正常', opts, async () => {
  const sent = await request(app).post('/api/v1/letters').set(A.auth)
    .send({ targetUid: B.uid, content: zh(150), title: '匿名的问候', isAnonymous: true });
  assert.equal(sent.body.code, 0);
  letterId = sent.body.data._id;

  // B 收件箱：匿名笔友，且不下发 from_uid
  const inbox = await request(app).get('/api/v1/letters/inbox').set(B.auth);
  const l = inbox.body.data.find((x) => x._id === letterId);
  assert.equal(l.senderNickname, '匿名笔友');
  assert.equal(l.from_uid, null);
  assert.equal(l.isAnonymous, true);

  // B 读详情：同样脱敏
  const detail = await request(app).get(`/api/v1/letters/${letterId}`).set(B.auth);
  assert.equal(detail.body.data.senderNickname, '匿名笔友');
  assert.equal(detail.body.data.from_uid, null);

  // A（寄件人）看已发出：正常显示收件人
  const sentList = await request(app).get('/api/v1/letters/sent').set(A.auth);
  assert.equal(sentList.body.data.find((x) => x._id === letterId).receiverNickname, '匿乙');
});

test('letters: 匿名线程 —— 收件人回信实名可见；原寄件人再回信保持匿名', opts, async () => {
  // B 回信（B 是实名的）
  const reply = await request(app).post(`/api/v1/letters/${letterId}/reply`).set(B.auth)
    .send({ content: zh(100) });
  assert.equal(reply.body.code, 0);
  const aInbox = await request(app).get('/api/v1/letters/inbox').set(A.auth);
  assert.equal(aInbox.body.data[0].senderNickname, '匿乙', 'A 应看到 B 实名');

  // A 在同一线程再回信 → 自动保持匿名（否则一回信即暴露）
  const reply2 = await request(app).post(`/api/v1/letters/${letterId}/reply`).set(A.auth)
    .send({ content: zh(100) });
  assert.equal(reply2.body.code, 0);
  const bInbox = await request(app).get('/api/v1/letters/inbox').set(B.auth);
  assert.equal(bInbox.body.data[0].senderNickname, '匿名笔友', 'A 的线程内回信应保持匿名');
});
