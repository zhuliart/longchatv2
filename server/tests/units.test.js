/**
 * M7 · T7.1 后端单元测试（纯函数，无需 MongoDB）：
 * 匹配打分（Jaccard + 加成 + 上限）、内容审核语义映射与快筛、列表/日期工具、引导门槛权限。
 * 覆盖正常 / 边界 / 异常三类。可离线运行（node --test tests/units.test.js）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// config 在被间接 import 前需要最小环境（独立于任何数据库连接）
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pingchang-unit';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { computeMatchScore, isActiveRecently } = await import('../src/services/match.js');
const { mapRiskLevel, localScan, moderateText, assertClean, LOCAL_BLOCKLIST } =
  await import('../src/services/moderation.js');
const { parsePage, excerpt, isYmd, ymd, asObjectId, PAGE_SIZE, COMMENT_PAGE_SIZE } =
  await import('../src/utils/listing.js');
const { requireProfile } = await import('../src/middlewares/auth.js');

/* ---------- 匹配打分（match.js） ---------- */

const U = (tags, extra = {}) => ({ tags, active_time: 'night', letter_freq: 'weekly', ...extra });

test('computeMatchScore：标签完全相同 → Jaccard 100（再叠加成封顶 100）', () => {
  const { score, tagsCommon } = computeMatchScore(U(['文学', '摄影']), U(['文学', '摄影']));
  assert.equal(score, 100);
  assert.deepEqual(tagsCommon.sort(), ['摄影', '文学']);
});

test('computeMatchScore：标签完全不相交 → 基础 0，仅时段/频率加成', () => {
  // 时段相同 +10、频率相同 +5，无共同标签
  const { score, tagsCommon } = computeMatchScore(U(['文学']), U(['运动']));
  assert.equal(score, 15);
  assert.deepEqual(tagsCommon, []);
});

test('computeMatchScore：部分交集 Jaccard 正确（|∩|=1,|∪|=3 → 33）', () => {
  // 关闭时段/频率加成以隔离 Jaccard
  const a = U(['文学', '摄影'], { active_time: 'night', letter_freq: 'weekly' });
  const b = U(['文学', '运动'], { active_time: 'morning', letter_freq: 'free' });
  const { score } = computeMatchScore(a, b);
  assert.equal(score, 33); // round(1/3*100)=33
});

test('computeMatchScore：近期活跃对方 +8；上限封顶 100', () => {
  const a = U(['x', 'y', 'z']);
  const b = U(['x', 'y', 'z'], { last_active: new Date() }); // 100 + 10 + 5 + 8 → 封顶
  assert.equal(computeMatchScore(a, b).score, 100);
});

test('computeMatchScore：空标签双方 → 0，不抛错', () => {
  assert.equal(computeMatchScore(U([]), U([])).score, 15); // 时段+频率加成，Jaccard 0
  assert.equal(computeMatchScore({}, {}).score, 15);
});

test('isActiveRecently：7 天内 true，之外 false，无 last_active false', () => {
  assert.equal(isActiveRecently({ last_active: new Date() }), true);
  assert.equal(isActiveRecently({ last_active: new Date(Date.now() - 6 * 864e5) }), true);
  assert.equal(isActiveRecently({ last_active: new Date(Date.now() - 8 * 864e5) }), false);
  assert.equal(isActiveRecently({}), false);
});

/* ---------- 内容审核语义映射（moderation.js） ---------- */

test('mapRiskLevel：high→risky / medium→review / 其余→pass', () => {
  assert.equal(mapRiskLevel('high'), 'risky');
  assert.equal(mapRiskLevel('High'), 'risky');
  assert.equal(mapRiskLevel('medium'), 'review');
  assert.equal(mapRiskLevel('low'), 'pass');
  assert.equal(mapRiskLevel('none'), 'pass');
  assert.equal(mapRiskLevel(''), 'pass');
  assert.equal(mapRiskLevel(undefined), 'pass');
});

test('localScan：命中黑词返回该词，未命中返回 null', () => {
  assert.equal(localScan(`约你一起${LOCAL_BLOCKLIST[0]}`), LOCAL_BLOCKLIST[0]);
  assert.equal(localScan('今天天气很好，适合写信'), null);
  assert.equal(localScan(''), null);
  assert.equal(localScan(null), null);
});

test('moderateText：本地命中 → risky；空文本 → pass；未配置 AK → pass', async () => {
  const risky = await moderateText(`我要${LOCAL_BLOCKLIST[0]}`, 'letter');
  assert.equal(risky.verdict, 'risky');
  assert.equal((await moderateText('', 'letter')).verdict, 'pass');
  // 测试环境未配置 ALI_GREEN_AK → 跳过机审直接放行
  assert.equal((await moderateText('一段完全正常的问候语', 'letter')).verdict, 'pass');
});

test('assertClean：命中黑词抛 1001（内容未通过安全检测）；正常返回落库标记', async () => {
  await assert.rejects(() => assertClean(`售卖${LOCAL_BLOCKLIST.find((w) => w === '售卖枪支') || '售卖枪支'}`, 'letter'),
    (e) => e.code === 1001);
  // 正常文本：未配置机审 → state 为 null（未经机审放行）
  assert.equal(await assertClean('一段正常的自我介绍文本', 'intro'), null);
});

/* ---------- 列表 / 日期工具（listing.js） ---------- */

test('parsePage：负数/非法/0 归一为 0，正整数原样', () => {
  assert.equal(parsePage('0'), 0);
  assert.equal(parsePage('3'), 3);
  assert.equal(parsePage('-1'), 0);
  assert.equal(parsePage('abc'), 0);
  assert.equal(parsePage(undefined), 0);
  assert.equal(PAGE_SIZE, 10);
  assert.equal(COMMENT_PAGE_SIZE, 20);
});

test('excerpt：压平换行、超长截断加省略号、短文本原样', () => {
  assert.equal(excerpt('你好\n\n世界', 60), '你好 世界');
  assert.equal(excerpt('一二三四五', 3), '一二三…');
  assert.equal(excerpt('', 10), '');
  assert.equal(excerpt(null), '');
});

test('isYmd：合法 YYYY-MM-DD true，其余 false', () => {
  assert.equal(isYmd('2026-07-04'), true);
  assert.equal(isYmd('2026-7-4'), false);
  assert.equal(isYmd('2026/07/04'), false);
  assert.equal(isYmd(''), false);
});

test('ymd：Date → 本地零填充日期串', () => {
  assert.equal(ymd(new Date(2026, 0, 5)), '2026-01-05');
  assert.match(ymd(), /^\d{4}-\d{2}-\d{2}$/);
});

test('asObjectId：非法格式抛 9001（避免 CastError 变 500）；合法返回 ObjectId', () => {
  assert.throws(() => asObjectId('not-an-id', '参数不合法'), (e) => e.code === 9001);
  const oid = asObjectId('64b7f0c2e1a2b3c4d5e6f7a8');
  assert.equal(String(oid), '64b7f0c2e1a2b3c4d5e6f7a8');
});

/* ---------- 引导门槛权限（middlewares/auth.js requireProfile） ---------- */

function runProfile(user, method, path) {
  const calls = [];
  const req = { user, method, path };
  const next = (err) => calls.push(err);
  requireProfile(req, {}, next);
  return calls[0];
}

test('requireProfile：已完成引导 → 放行（next 无错）', () => {
  assert.equal(runProfile({ has_profile: true }, 'GET', '/letters/inbox'), undefined);
});

test('requireProfile：未完成引导访问白名单（提交引导 / 看自己）→ 放行', () => {
  assert.equal(runProfile({ has_profile: false }, 'POST', '/users/profile'), undefined);
  assert.equal(runProfile({ has_profile: false }, 'GET', '/users/me'), undefined);
});

test('requireProfile：未完成引导访问业务接口 → next(9001 请先完成注册引导)', () => {
  const err = runProfile({ has_profile: false }, 'GET', '/letters/inbox');
  assert.ok(err);
  assert.equal(err.code, 9001);
  assert.match(err.message, /完成注册引导/);
});

/* ---------- 客户端本地「今天」（listing.clientYmd / shiftYmd） ---------- */

const { shiftYmd, clientYmd } = await import('../src/utils/listing.js');

test('shiftYmd：跨月/跨年偏移正确', () => {
  assert.equal(shiftYmd('2026-07-19', -1), '2026-07-18');
  assert.equal(shiftYmd('2026-07-31', 1), '2026-08-01');
  assert.equal(shiftYmd('2026-01-01', -1), '2025-12-31');
});

test('clientYmd：合法且在服务端±1天内 → 采用客户端日期；越界/非法 → 回退服务端', () => {
  const mk = (v) => ({ get: (h) => (h === 'X-Client-Date' ? v : null) });
  const server = ymd();
  // 服务端当天 ±1 天：采用
  assert.equal(clientYmd(mk(server)), server);
  assert.equal(clientYmd(mk(shiftYmd(server, 1))), shiftYmd(server, 1));
  assert.equal(clientYmd(mk(shiftYmd(server, -1))), shiftYmd(server, -1));
  // 越界（+2 天）/ 非法 / 缺失：回退服务端当天
  assert.equal(clientYmd(mk(shiftYmd(server, 2))), server);
  assert.equal(clientYmd(mk('not-a-date')), server);
  assert.equal(clientYmd(mk(null)), server);
});
