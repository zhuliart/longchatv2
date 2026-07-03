import test from 'node:test';
import assert from 'node:assert/strict';

// 测试环境变量须在 import config 之前就位
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pingchang-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { User, Letter, Draft, Mood, MoodComment, Match } = await import('../src/models/index.js');

/** validateSync 后返回出错的路径名集合（不触库，纯 Schema 校验） */
const errPaths = (doc) => Object.keys(doc.validateSync()?.errors || {});

// ---------- T1.1 验收：Schema 校验拦截非法枚举 / 长度 ----------

const validUser = (over = {}) =>
  new User({
    account: 'someone@test.com',
    password_hash: 'x'.repeat(60),
    nickname: '拾光',
    intro: '习惯在夜里写字的人，喜欢旧书的味道和一切慢下来的事物。',
    tags: ['文学', '摄影', '冥想'],
    ...over,
  });

test('users: 合法文档通过；邮箱与 11 位手机号均可', () => {
  assert.deepEqual(errPaths(validUser()), []);
  assert.deepEqual(errPaths(validUser({ account: '13812345678' })), []);
});

test('users: 非法 account / 枚举 / 长度被拦截', () => {
  assert.ok(errPaths(validUser({ account: 'not-an-account' })).includes('account'));
  assert.ok(errPaths(validUser({ account: '12345' })).includes('account'));
  assert.ok(errPaths(validUser({ nickname: '字'.repeat(21) })).includes('nickname'));
  assert.ok(errPaths(validUser({ active_time: 'noon' })).includes('active_time'));
  assert.ok(errPaths(validUser({ letter_freq: 'daily' })).includes('letter_freq'));
});

test('users: intro 20-60 字（countWords 口径），引导前允许为空', () => {
  assert.ok(errPaths(validUser({ intro: '字'.repeat(19) })).includes('intro'));
  assert.deepEqual(errPaths(validUser({ intro: '字'.repeat(20) })), []);
  assert.deepEqual(errPaths(validUser({ intro: '字'.repeat(60) })), []);
  assert.ok(errPaths(validUser({ intro: '字'.repeat(61) })).includes('intro'));
  assert.deepEqual(errPaths(validUser({ intro: '' })), []);
});

test('users: tags 3-5 个，引导前允许为空数组', () => {
  assert.ok(errPaths(validUser({ tags: ['文学', '摄影'] })).includes('tags'));
  assert.ok(errPaths(validUser({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] })).includes('tags'));
  assert.deepEqual(errPaths(validUser({ tags: ['文学', '摄影', '冥想', '自然', '哲学'] })), []);
  assert.deepEqual(errPaths(validUser({ tags: [] })), []);
});

const oid = () => new User()._id; // 造一个 ObjectId

const validLetter = (over = {}) =>
  new Letter({ from_uid: oid(), to_uid: oid(), content: '正文', word_count: 2, ...over });

test('letters: 合法文档通过；标题 >30 字 / 非法 status / 缺 word_count 被拦截', () => {
  assert.deepEqual(errPaths(validLetter()), []);
  assert.ok(errPaths(validLetter({ title: '字'.repeat(31) })).includes('title'));
  assert.ok(errPaths(validLetter({ status: 'draft' })).includes('status'));
  assert.ok(errPaths(validLetter({ word_count: undefined })).includes('word_count'));
  assert.ok(errPaths(validLetter({ content: '' })).includes('content'));
});

test('drafts: to_uid 可空；默认值齐备', () => {
  const d = new Draft({ uid: oid() });
  assert.deepEqual(errPaths(d), []);
  assert.equal(d.to_uid, null);
  assert.equal(d.word_count, 0);
  assert.equal(d.is_first, true);
});

const validMood = (over = {}) =>
  new Mood({ uid: oid(), emotion: 'happy', intensity: 3, date: '2026-07-03', ...over });

test('moods: 合法文档通过；默认 visibility=private / comment_count=0', () => {
  const m = validMood();
  assert.deepEqual(errPaths(m), []);
  assert.equal(m.visibility, 'private');
  assert.equal(m.comment_count, 0);
});

test('moods: 非法枚举 / 强度 / 日期格式被拦截', () => {
  assert.ok(errPaths(validMood({ emotion: 'angry' })).includes('emotion'));
  assert.ok(errPaths(validMood({ intensity: 0 })).includes('intensity'));
  assert.ok(errPaths(validMood({ intensity: 6 })).includes('intensity'));
  assert.ok(errPaths(validMood({ intensity: 2.5 })).includes('intensity'));
  assert.ok(errPaths(validMood({ visibility: 'all' })).includes('visibility'));
  assert.ok(errPaths(validMood({ date: '2026/07/03' })).includes('date'));
  assert.ok(errPaths(validMood({ feeling: '字'.repeat(9) })).includes('feeling'));
});

test('moods: 日记填则 ≥30 字（29 拒 / 30 过 / 空可）', () => {
  assert.ok(errPaths(validMood({ diary: '字'.repeat(29) })).includes('diary'));
  assert.deepEqual(errPaths(validMood({ diary: '字'.repeat(30) })), []);
  assert.deepEqual(errPaths(validMood({ diary: '' })), []);
});

const validComment = (over = {}) =>
  new MoodComment({ mood_id: oid(), from_uid: oid(), content: '说得真好', ...over });

test('mood_comments: 1-200 字（200 过 / 201 拒 / 纯表情 0 字拒）；顶层 parent_id=null', () => {
  const c = validComment();
  assert.deepEqual(errPaths(c), []);
  assert.equal(c.parent_id, null);
  assert.deepEqual(errPaths(validComment({ content: '字'.repeat(200) })), []);
  assert.ok(errPaths(validComment({ content: '字'.repeat(201) })).includes('content'));
  assert.ok(errPaths(validComment({ content: '😊😊' })).includes('content'));
  assert.ok(errPaths(validComment({ content: '' })).includes('content'));
});

const validMatch = (over = {}) =>
  new Match({ uid_a: oid(), uid_b: oid(), score: 86, tags_common: ['文学'], ...over });

test('matches: score 0-100；非法 status 被拦截；默认 pending', () => {
  const m = validMatch();
  assert.deepEqual(errPaths(m), []);
  assert.equal(m.status, 'pending');
  assert.ok(errPaths(validMatch({ score: 101 })).includes('score'));
  assert.ok(errPaths(validMatch({ score: -1 })).includes('score'));
  assert.ok(errPaths(validMatch({ status: 'done' })).includes('status'));
});

// ---------- T1.2 验收：索引定义与步骤书表逐条一致 ----------

/** schema.indexes() → 便于比对的 { keys, unique } 列表 */
const indexList = (model) =>
  model.schema.indexes().map(([keys, opts]) => ({ keys, unique: !!opts.unique }));

test('索引定义与 T1.2 表一致（8 条，unique 标记正确）', () => {
  assert.deepEqual(indexList(User), [{ keys: { account: 1 }, unique: true }]);
  assert.deepEqual(indexList(Letter), [
    { keys: { to_uid: 1, status: 1 }, unique: false },
    { keys: { from_uid: 1, created_at: -1 }, unique: false },
  ]);
  assert.deepEqual(indexList(Draft), [{ keys: { uid: 1, updated_at: -1 }, unique: false }]);
  assert.deepEqual(indexList(Mood), [
    { keys: { uid: 1, date: 1 }, unique: true },
    { keys: { visibility: 1, created_at: -1 }, unique: false },
  ]);
  assert.deepEqual(indexList(MoodComment), [
    { keys: { mood_id: 1, created_at: 1 }, unique: false },
  ]);
  assert.deepEqual(indexList(Match), [{ keys: { uid_a: 1, updated_at: -1 }, unique: false }]);
});

test('集合名与契约一致（users/letters/drafts/moods/mood_comments/matches）', () => {
  assert.deepEqual(
    [User, Letter, Draft, Mood, MoodComment, Match].map((m) => m.collection.name),
    ['users', 'letters', 'drafts', 'moods', 'mood_comments', 'matches']
  );
});
