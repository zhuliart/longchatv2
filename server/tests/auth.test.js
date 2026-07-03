import test from 'node:test';
import assert from 'node:assert/strict';

// 测试环境变量须在 import config 之前就位（独立测试库，跑完即删）
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGO_URI =
  process.env.MONGO_URI_TEST ||
  'mongodb://pingchang:pingchang_dev@localhost:27017/pingchang-test-m2?authSource=admin';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { default: mongoose } = await import('mongoose');
const { default: request } = await import('supertest');
const { createApp } = await import('../src/app.js');
const { User, TokenBlacklist } = await import('../src/models/index.js');

let dbUp = true;
try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2500 });
  await mongoose.connection.dropDatabase();
} catch {
  dbUp = false;
  console.warn('⚠ MongoDB 不可达，跳过 auth 接口测试（先 docker compose -f deploy/docker-compose.dev.yml up -d）');
}
const opts = { skip: !dbUp };

test.after(async () => {
  if (dbUp) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

const app = createApp();
const ACCOUNT = 'tester@example.com';
const PASSWORD = 'secret6';
const register = (account = ACCOUNT, password = PASSWORD) =>
  request(app).post('/api/v1/auth/register').send({ account, password });
const login = (account = ACCOUNT, password = PASSWORD) =>
  request(app).post('/api/v1/auth/login').send({ account, password });

let tokens; // { token, refreshToken }

// ---------- T2.1 注册 ----------

test('register: 成功发 token + hasProfile:false', opts, async () => {
  const res = await register();
  assert.equal(res.status, 200);
  assert.equal(res.body.code, 0);
  assert.ok(res.body.data.token);
  assert.ok(res.body.data.refreshToken);
  assert.equal(res.body.data.hasProfile, false);
  tokens = res.body.data;
});

test('register: 重复注册被拒（业务错误）', opts, async () => {
  const res = await register();
  assert.equal(res.status, 200);
  assert.equal(res.body.code, 9001);
  assert.match(res.body.message, /已注册/);
});

test('register: 非法账号 / 密码过短被拒', opts, async () => {
  assert.equal((await register('not-an-account')).body.code, 9001);
  assert.equal((await register('13800000000', '12345')).body.code, 9001);
  assert.equal((await register('13800138000', '123456')).body.code, 0); // 11 位手机号可注册
});

test('register: 库中无明文密码（bcrypt cost≥10）', opts, async () => {
  const doc = await User.findOne({ account: ACCOUNT }).select('+password_hash').lean();
  assert.ok(doc.password_hash.startsWith('$2'), 'password_hash 应为 bcrypt 哈希');
  assert.ok(!doc.password_hash.includes(PASSWORD));
  assert.equal(doc.password, undefined);
  const cost = parseInt(doc.password_hash.split('$')[2], 10);
  assert.ok(cost >= 10, `bcrypt cost 应 ≥10，实际 ${cost}`);
});

// ---------- T2.2 登录 ----------

test('login: 正确密码 → token + hasProfile；更新 last_active', opts, async () => {
  const before = (await User.findOne({ account: ACCOUNT })).last_active;
  await new Promise((r) => setTimeout(r, 10));
  const res = await login();
  assert.equal(res.body.code, 0);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.hasProfile, false);
  const after = (await User.findOne({ account: ACCOUNT })).last_active;
  assert.ok(after > before, 'last_active 应被更新');
});

test('login: 错误密码与不存在账号提示一致，不泄露存在性', opts, async () => {
  const wrongPwd = await login(ACCOUNT, 'wrong-pass');
  const noAccount = await login('ghost@example.com', 'whatever');
  assert.equal(wrongPwd.status, 200);
  assert.equal(wrongPwd.body.code, 9001);
  assert.equal(noAccount.body.code, 9001);
  assert.equal(wrongPwd.body.message, noAccount.body.message);
});

// ---------- T2.4 JWT 鉴权中间件 ----------

test('鉴权：无 token / 伪 token / 用 refresh 当 access → 401', opts, async () => {
  assert.equal((await request(app).get('/api/v1/users/me')).status, 401);
  assert.equal(
    (await request(app).get('/api/v1/users/me').set('Authorization', 'Bearer bogus')).status,
    401
  );
  assert.equal(
    (await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${tokens.refreshToken}`)).status,
    401
  );
});

test('鉴权：health 与 auth 之外的任意业务路径均须 token', opts, async () => {
  assert.equal((await request(app).get('/api/v1/letters/inbox')).status, 401);
  assert.equal((await request(app).get('/api/v1/health')).status, 200); // health 公开（部署探活）
});

// ---------- T2.5 引导门槛 ----------

test('引导门槛：hasProfile=false 只放行 profile 提交与 me', opts, async () => {
  const auth = { Authorization: `Bearer ${tokens.token}` };
  const me = await request(app).get('/api/v1/users/me').set(auth);
  assert.equal(me.body.code, 0);
  const gated = await request(app).post('/api/v1/letters').set(auth).send({});
  assert.equal(gated.status, 200);
  assert.equal(gated.body.code, 9001);
  assert.match(gated.body.message, /完成注册引导/);
});

test('POST /users/profile: intro 字数与标签数被服务端复校', opts, async () => {
  const auth = { Authorization: `Bearer ${tokens.token}` };
  const base = { nickname: '拾光', tags: ['文学', '摄影', '冥想'] };
  const shortIntro = await request(app).post('/api/v1/users/profile').set(auth)
    .send({ ...base, intro: '字'.repeat(19) });
  assert.equal(shortIntro.body.code, 1002);
  assert.match(shortIntro.body.message, /20-60字之间，当前19字/);
  const fewTags = await request(app).post('/api/v1/users/profile').set(auth)
    .send({ ...base, tags: ['文学', '摄影'], intro: '字'.repeat(30) });
  assert.equal(fewTags.body.code, 9001);
  const badEnum = await request(app).post('/api/v1/users/profile').set(auth)
    .send({ ...base, intro: '字'.repeat(30), activeTime: 'noon' });
  assert.equal(badEnum.body.code, 9001);
});

test('POST /users/profile: 成功 → has_profile=true，门槛放开，重复提交被拒', opts, async () => {
  const auth = { Authorization: `Bearer ${tokens.token}` };
  const res = await request(app).post('/api/v1/users/profile').set(auth).send({
    nickname: '拾光',
    intro: '习惯在夜里写字的人，喜欢旧书的味道和一切慢下来的事物。',
    tags: ['文学', '摄影', '冥想'],
    activeTime: 'night',
    letterFreq: 'biweekly',
  });
  assert.equal(res.body.code, 0);
  assert.equal(res.body.data.nickname, '拾光');

  const me = await request(app).get('/api/v1/users/me').set(auth);
  assert.equal(me.body.data.hasProfile, true);
  assert.deepEqual(
    [me.body.data.lettersSent, me.body.data.lettersReceived, me.body.data.moodDays],
    [0, 0, 0]
  );

  // 门槛已放开：业务路由不再被「完成引导」拒绝（进入真实路由的参数校验）
  const gated = await request(app).post('/api/v1/letters').set(auth).send({});
  assert.equal(gated.status, 200);
  assert.doesNotMatch(gated.body.message, /完成注册引导/);

  const dup = await request(app).post('/api/v1/users/profile').set(auth).send({
    nickname: 'x', intro: '字'.repeat(30), tags: ['a', 'b', 'c'],
  });
  assert.equal(dup.body.code, 9001);
  assert.match(dup.body.message, /已注册/);
});

// ---------- T2.3 logout / refresh ----------

test('refresh: 轮换 —— 旧 refresh 拉黑，新 token 可用', opts, async () => {
  const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
  assert.equal(res.body.code, 0);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.hasProfile, true);

  const reuse = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
  assert.equal(reuse.status, 401, '旧 refresh 复用应 401');
  tokens = res.body.data;

  const me = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${tokens.token}`);
  assert.equal(me.body.code, 0);
});

test('logout: 登出后 refresh 失效（TTL 黑名单）', opts, async () => {
  const out = await request(app).post('/api/v1/auth/logout').send({ refreshToken: tokens.refreshToken });
  assert.equal(out.body.code, 0);
  const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
  assert.equal(res.status, 401);
  assert.ok(await TokenBlacklist.exists({}), '黑名单应有记录');
});

test('logout: 幂等 —— 重复登出仍 200', opts, async () => {
  const out = await request(app).post('/api/v1/auth/logout').send({ refreshToken: tokens.refreshToken });
  assert.equal(out.body.code, 0);
  assert.equal((await request(app).post('/api/v1/auth/logout').send({})).body.code, 0);
});

test('token_blacklist: TTL 索引已建（expireAfterSeconds=0）', opts, async () => {
  await TokenBlacklist.syncIndexes();
  const idx = await TokenBlacklist.collection.indexes();
  const ttl = idx.find((i) => i.key.expires_at === 1);
  assert.equal(ttl?.expireAfterSeconds, 0);
});

// ---------- T2.2 登录限速（放最后：会占满该账号额度） ----------

test('限速：同 IP+account 连续失败 10 次后第 11 次 429', opts, async () => {
  const account = 'bruteforce@example.com';
  await register(account, 'right-pass');
  for (let i = 0; i < 10; i += 1) {
    const res = await login(account, 'wrong-pass');
    assert.equal(res.status, 200, `第 ${i + 1} 次失败仍应 200`);
    assert.equal(res.body.code, 9001);
  }
  const blocked = await login(account, 'wrong-pass');
  assert.equal(blocked.status, 429);
  assert.match(blocked.body.message, /尝试次数过多/);
  // 换一个 account 不受影响（双维度中的 account 维度独立计数）
  const other = await login('someoneelse@example.com', 'whatever');
  assert.equal(other.status, 200);
});
