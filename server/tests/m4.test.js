import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// ===== Mock 上游服务（须在 import config 之前就位：config 在 import 时读 env）=====

const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });

const reply = (res, obj, status = 200) => {
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
};

const listen = (server) =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));

// 阿里云内容安全 mock：按送审文本中的暗号返回不同 RiskLevel / 故障
const greenServer = http.createServer(async (req, res) => {
  const params = new URLSearchParams(await readBody(req));
  const { content = '' } = JSON.parse(params.get('ServiceParameters') || '{}');
  if (content.includes('宕机样本')) return reply(res, { Code: 500, Message: 'mock down' }, 500);
  if (content.includes('超时样本')) {
    return void setTimeout(() => reply(res, { Code: 200, Data: { RiskLevel: 'none' } }), 800);
  }
  const level = content.includes('高危样本') ? 'high' : content.includes('嫌疑样本') ? 'medium' : 'none';
  reply(res, { Code: 200, Data: { RiskLevel: level } });
});

// DashScope（OpenAI 兼容 chat/completions）mock：aiMode 控制成功/挂起/报错
let aiMode = 'ok';
const aiServer = http.createServer(async (req, res) => {
  const body = JSON.parse(await readBody(req));
  if (aiMode === 'error') return reply(res, { error: 'mock boom' }, 500);
  const system = body.messages?.[0]?.content || '';
  const content = system.includes('润色')
    ? '润色后的信件全文，语句已顺。'
    : JSON.stringify(['候选句子一，愿一切安好。', '候选句子二，见字如面。', '候选句子三，纸短情长。']);
  const payload = { choices: [{ message: { role: 'assistant', content } }] };
  if (aiMode === 'hang') return void setTimeout(() => reply(res, payload), 2000);
  reply(res, payload);
});

const [greenPort, aiPort] = await Promise.all([listen(greenServer), listen(aiServer)]);

// ===== 测试环境变量（独立测试库，跑完即删）=====
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGO_URI =
  process.env.MONGO_URI_TEST ||
  'mongodb://pingchang:pingchang_dev@localhost:27017/pingchang-test-m4?authSource=admin';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.ALI_GREEN_AK_ID = 'test-ak-id';
process.env.ALI_GREEN_AK_SECRET = 'test-ak-secret';
process.env.ALI_GREEN_ENDPOINT = `http://127.0.0.1:${greenPort}`;
process.env.ALI_GREEN_TIMEOUT_MS = '300';
process.env.AI_PROVIDER = 'dashscope';
process.env.DASHSCOPE_API_KEY = 'test-dashscope-key';
process.env.DASHSCOPE_BASE_URL = `http://127.0.0.1:${aiPort}/compatible-mode/v1`;
process.env.AI_DAILY_LIMIT = '3';
process.env.AI_TIMEOUT_MS = '500';

const { default: mongoose } = await import('mongoose');
const { default: request } = await import('supertest');
const { createApp } = await import('../src/app.js');
const { User, Letter, Mood, Match, AiUsage } = await import('../src/models/index.js');
const { localScan, mapRiskLevel, moderateText } = await import('../src/services/moderation.js');
const { parseSuggestions } = await import('../src/services/ai/index.js');
const anthropicProvider = await import('../src/services/ai/providers/anthropic.js');
const { runJob } = await import('../src/jobs/runner.js');
const { dailyMatch } = await import('../src/jobs/dailyMatch.js');
const { memoryToday } = await import('../src/jobs/memoryToday.js');
const { inactivityCheck } = await import('../src/jobs/inactivityCheck.js');
const { ymd } = await import('../src/utils/listing.js');

let dbUp = true;
try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2500 });
  await mongoose.connection.dropDatabase();
} catch {
  dbUp = false;
  console.warn('⚠ MongoDB 不可达，跳过 M4 接口测试（先 docker compose -f deploy/docker-compose.dev.yml up -d）');
}
const opts = { skip: !dbUp };

test.after(async () => {
  greenServer.closeAllConnections?.();
  aiServer.closeAllConnections?.();
  greenServer.close();
  aiServer.close();
  if (dbUp) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

const app = createApp();
const zh = (n) => '字'.repeat(n);
const TODAY = ymd();

/** 注册 + 引导，返回 { auth, uid } */
async function newUser(account, nickname, tags) {
  const reg = await request(app).post('/api/v1/auth/register').send({ account, password: 'pass66' });
  const auth = { Authorization: `Bearer ${reg.body.data.token}` };
  const prof = await request(app).post('/api/v1/users/profile').set(auth).send({
    nickname,
    intro: '这是一段专门用于接口测试的自我介绍，字数控制在合法范围之内。',
    tags,
    activeTime: 'night',
    letterFreq: 'biweekly',
  });
  assert.equal(prof.body.code, 0, `引导提交应成功：${prof.body.message}`);
  const me = await request(app).get('/api/v1/users/me').set(auth);
  return { auth, uid: me.body.data._id };
}

let A; let B;

test('准备：两个测试用户（intro 过审并标记 pass）', opts, async () => {
  A = await newUser('m4a@test.com', '安然', ['文学', '摄影', '冥想']);
  B = await newUser('m4b@test.com', '北屿', ['文学', '摄影', '旅行']);
  const userA = await User.findById(A.uid);
  assert.equal(userA.moderation, 'pass', '机审通过的 intro 应标记 moderation:pass');
});

// ============ T4.1 内容审核：语义映射单测 ============

test('moderation: mapRiskLevel 语义映射与本地敏感词快筛', async () => {
  assert.equal(mapRiskLevel('high'), 'risky');
  assert.equal(mapRiskLevel('medium'), 'review');
  assert.equal(mapRiskLevel('low'), 'pass');
  assert.equal(mapRiskLevel('none'), 'pass');
  assert.equal(mapRiskLevel(undefined), 'pass');
  assert.equal(localScan('今晚一起研究赌博网站'), '赌博');
  assert.equal(localScan('今晚一起研究数学题'), null);
  assert.equal((await moderateText('')).verdict, 'pass', '空文本直接放行');
});

// ============ T4.1 内容审核：五个挂接点 ============

test('moderation: 违规信件 → 1001 且不落库（本地词 + 机审 high）', opts, async () => {
  const byLocal = await request(app).post('/api/v1/letters').set(A.auth)
    .send({ targetUid: B.uid, content: `参与赌博${zh(150)}` });
  assert.equal(byLocal.body.code, 1001);
  assert.match(byLocal.body.message, /未通过安全检测/);

  const byRemote = await request(app).post('/api/v1/letters').set(A.auth)
    .send({ targetUid: B.uid, content: `高危样本${zh(150)}` });
  assert.equal(byRemote.body.code, 1001);
  assert.equal(await Letter.countDocuments({ from_uid: A.uid }), 0, '违规信件不得落库');
});

test('moderation: 机审 review → 放行并标记待人工；pass → 标记 pass', opts, async () => {
  const review = await request(app).post('/api/v1/letters').set(A.auth)
    .send({ targetUid: B.uid, content: `嫌疑样本${zh(150)}` });
  assert.equal(review.body.code, 0, 'review 应放行');
  assert.equal((await Letter.findById(review.body.data._id)).moderation, 'review');

  const clean = await request(app).post('/api/v1/letters').set(A.auth)
    .send({ targetUid: B.uid, content: zh(150) });
  assert.equal(clean.body.code, 0);
  assert.equal((await Letter.findById(clean.body.data._id)).moderation, 'pass');
});

test('moderation: 审核服务报错/超时 → 放行（fail-open，契约兜底）', opts, async () => {
  const down = await request(app).post('/api/v1/letters').set(A.auth)
    .send({ targetUid: B.uid, content: `宕机样本${zh(150)}` });
  assert.equal(down.body.code, 0, '审核服务 500 时 UGC 仍可写入');
  const letter = await Letter.findById(down.body.data._id);
  assert.equal(letter.moderation, undefined, '未经机审不打 pass/review 标记');

  const slow = await request(app).post('/api/v1/letters').set(A.auth)
    .send({ targetUid: B.uid, content: `超时样本${zh(150)}` });
  assert.equal(slow.body.code, 0, '审核服务超时时 UGC 仍可写入');
});

test('moderation: 日记 / 评论 / intro 挂接点均生效', opts, async () => {
  // 日记违规 → 1001 且 mood 不落库
  const badDiary = await request(app).put(`/api/v1/moods/${TODAY}`).set(B.auth)
    .send({ emotion: 'calm', intensity: 3, diary: `高危样本${zh(30)}` });
  assert.equal(badDiary.body.code, 1001);
  assert.equal(await Mood.countDocuments({ uid: B.uid, date: TODAY }), 0);

  // 干净日记（review 档）→ 放行 + 标记
  const okDiary = await request(app).put(`/api/v1/moods/${TODAY}`).set(B.auth)
    .send({ emotion: 'calm', intensity: 3, visibility: 'public', diary: `嫌疑样本${zh(30)}` });
  assert.equal(okDiary.body.code, 0);
  assert.equal((await Mood.findById(okDiary.body.data._id)).moderation, 'review');

  // 评论违规 → 1001 且计数不加
  const moodId = okDiary.body.data._id;
  const badComment = await request(app).post(`/api/v1/plaza/moods/${moodId}/comments`).set(A.auth)
    .send({ content: '来玩赌博游戏' });
  assert.equal(badComment.body.code, 1001);
  assert.equal((await Mood.findById(moodId)).comment_count, 0, '违规评论不得计数');
  const okComment = await request(app).post(`/api/v1/plaza/moods/${moodId}/comments`).set(A.auth)
    .send({ content: '说得真好，被一个陌生人理解的感觉。' });
  assert.equal(okComment.body.code, 0);

  // intro 违规 → 1001 且引导未完成
  const reg = await request(app).post('/api/v1/auth/register').send({ account: 'm4c@test.com', password: 'pass66' });
  const authC = { Authorization: `Bearer ${reg.body.data.token}` };
  const badIntro = await request(app).post('/api/v1/users/profile').set(authC).send({
    nickname: '沉舟',
    intro: '高危样本，这是一段字数刚好落在合法区间里的自我介绍文案。',
    tags: ['哲学', '天文', '科幻'],
  });
  assert.equal(badIntro.body.code, 1001);
  assert.equal((await request(app).get('/api/v1/users/me').set(authC)).body.data.hasProfile, false);

  // PATCH /me 改 intro 也重新过审
  const badPatch = await request(app).patch('/api/v1/users/me').set(A.auth)
    .send({ intro: '嫌疑样本，这是一段字数刚好落在合法区间里的自我介绍文案。' });
  assert.equal(badPatch.body.code, 0, 'review 档放行');
  assert.equal((await User.findById(A.uid)).moderation, 'review');
});

// ============ T4.2 AI 灵感 ============

test('ai: parseSuggestions 兼容 JSON / 代码块 / 按行兜底', async () => {
  assert.deepEqual(parseSuggestions('["a句子甲乙丙","b句子甲乙丙","c句子甲乙丙","d句子甲乙丙"]').length, 3);
  assert.deepEqual(parseSuggestions('```json\n["句子甲乙丙丁"]\n```'), ['句子甲乙丙丁']);
  assert.deepEqual(parseSuggestions('1. 第一条候选句\n- 第二条候选句\n• 第三条候选句'), [
    '第一条候选句', '第二条候选句', '第三条候选句',
  ]);
  assert.deepEqual(parseSuggestions(''), []);
});

test('ai: anthropic provider 未配置密钥时明确报错（密钥仅服务端）', async () => {
  await assert.rejects(
    anthropicProvider.complete({ system: 's', prompt: 'p', timeoutMs: 100 }),
    /ANTHROPIC_API_KEY 未配置/
  );
});

test('ai: polish 不足 10 字 → 1002（不消耗额度）', opts, async () => {
  const res = await request(app).post('/api/v1/ai/polish').set(A.auth).send({ text: '太短了' });
  assert.equal(res.body.code, 1002);
  assert.match(res.body.message, /先写下一点内容，再帮你润色/);
  assert.equal(await AiUsage.countDocuments({ uid: A.uid }), 0);
});

test('ai: 续写返回 3 条候选；润色返回全文；成功才计数', opts, async () => {
  const insp = await request(app).post('/api/v1/ai/inspiration').set(A.auth)
    .send({ draft: '窗外下了一整天的雨', targetUid: B.uid });
  assert.equal(insp.body.code, 0);
  assert.equal(insp.body.data.suggestions.length, 3);

  const pol = await request(app).post('/api/v1/ai/polish').set(A.auth)
    .send({ text: '今天心情还不错，想给你写一封信说说近况。' });
  assert.equal(pol.body.code, 0);
  assert.ok(pol.body.data.polished.includes('润色后'));

  const usage = await AiUsage.findOne({ uid: A.uid, date: TODAY });
  assert.equal(usage.count, 2, '两次成功调用各计一次');
});

test('ai: 超时/上游报错 → 9002 友好降级，不报 500、不占额度', opts, async () => {
  aiMode = 'hang';
  const hung = await request(app).post('/api/v1/ai/inspiration').set(A.auth).send({});
  assert.equal(hung.status, 200);
  assert.equal(hung.body.code, 9002);
  assert.match(hung.body.message, /稍后再试/);

  aiMode = 'error';
  const errored = await request(app).post('/api/v1/ai/polish').set(A.auth)
    .send({ text: '这段文字足够十个字了吧，帮我润色。' });
  assert.equal(errored.status, 200);
  assert.equal(errored.body.code, 9002);

  aiMode = 'ok';
  assert.equal((await AiUsage.findOne({ uid: A.uid, date: TODAY })).count, 2, '失败调用不计数');
});

test('ai: 每日限频（AI_DAILY_LIMIT=3）用完 → 1004', opts, async () => {
  const third = await request(app).post('/api/v1/ai/inspiration').set(A.auth).send({});
  assert.equal(third.body.code, 0, '第 3 次仍在额度内');
  const fourth = await request(app).post('/api/v1/ai/inspiration').set(A.auth).send({});
  assert.equal(fourth.body.code, 1004);
  assert.match(fourth.body.message, /次数已用完/);
  const fourthPolish = await request(app).post('/api/v1/ai/polish').set(A.auth)
    .send({ text: '润色与续写共用同一份每日额度。' });
  assert.equal(fourthPolish.body.code, 1004, '续写与润色共用额度');
});

// ============ T4.3 定时任务 ============

test('jobs: runner 防重入 —— 并发触发同名任务只跑一个', async () => {
  const slow = () => new Promise((resolve) => setTimeout(() => resolve('done'), 120));
  const [first, second] = await Promise.all([runJob('reentry-test', slow), runJob('reentry-test', slow)]);
  assert.ok([first, second].includes('done'));
  assert.ok([first, second].includes(null), '重入的一次应被跳过');
});

test('jobs: dailyMatch 全量计算 → matches 出数据，GET /matches/daily 可读', opts, async () => {
  const D = await newUser('m4d@test.com', '远山', ['哲学', '音乐', '园艺']);
  const E = await newUser('m4e@test.com', '青山', ['哲学', '音乐', '茶道']);
  await Match.deleteMany({});

  const result = await runJob('dailyMatch', dailyMatch);
  assert.ok(result.users >= 4, `应覆盖全量已引导用户，实际 ${result.users}`);
  assert.ok(result.matched > 0);

  const pair = await Match.findOne({ uid_a: D.uid, uid_b: E.uid });
  assert.equal(pair.status, 'pending', '任务写入的记录应为 pending');

  const daily = await request(app).get('/api/v1/matches/daily').set(D.auth);
  assert.equal(daily.body.code, 0);
  assert.ok(daily.body.data.some((m) => String(m.profile._id) === String(E.uid)), '推荐里应有共同标签者');

  // 已通信关系被排除：A 与 B 在前面测试里已有信件往来
  assert.equal(await Match.countDocuments({ uid_a: A.uid, uid_b: B.uid }), 0, '已通信不参与推荐');
});

test('jobs: inactivityCheck 标记 7/14/30 天未回应；有回信则清除', opts, async () => {
  const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const [l10, l40, l20] = await Letter.create(
    [
      { from_uid: A.uid, to_uid: B.uid, content: zh(150), word_count: 150, status: 'sent', is_first: false, created_at: daysAgo(10) },
      { from_uid: A.uid, to_uid: B.uid, content: zh(150), word_count: 150, status: 'read', is_first: false, created_at: daysAgo(40) },
      { from_uid: B.uid, to_uid: A.uid, content: zh(150), word_count: 150, status: 'read', is_first: false, created_at: daysAgo(20), inactive_days: 7 },
    ],
    { timestamps: false }
  );
  await Letter.create(
    [{ from_uid: A.uid, to_uid: B.uid, parent_id: l20._id, content: zh(100), word_count: 100, status: 'sent', is_first: false, created_at: daysAgo(18) }],
    { timestamps: false }
  );

  const result = await runJob('inactivityCheck', inactivityCheck);
  assert.equal((await Letter.findById(l10._id)).inactive_days, 7);
  assert.equal((await Letter.findById(l40._id)).inactive_days, 30);
  assert.equal((await Letter.findById(l20._id)).inactive_days, undefined, '已获回信应清除标记');
  assert.ok(result.checked >= 3);
  assert.equal(result.cleared, 1);
  const bucket7 = result.inactiveLetters.find((b) => b.threshold === '7天未回应');
  assert.ok(bucket7.count >= 1);
});

test('jobs: memoryToday 统计有去年今日记忆的用户（MVP 记日志占位）', opts, async () => {
  const lastYear = `${parseInt(TODAY.slice(0, 4), 10) - 1}${TODAY.slice(4)}`;
  await Mood.create({
    uid: A.uid, emotion: 'calm', intensity: 3, visibility: 'private', date: lastYear,
  });
  const result = await runJob('memoryToday', memoryToday);
  assert.equal(result.date, lastYear);
  assert.ok(result.users >= 1, 'A 有去年今日的心情记录');
});
