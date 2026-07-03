import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { countWords } from '../src/utils/countWords.js';

test('空值与空白', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords(null), 0);
  assert.equal(countWords(undefined), 0);
  assert.equal(countWords('   '), 0);
});

test('纯中文按字计', () => {
  assert.equal(countWords('你好世界'), 4);
  assert.equal(countWords('  今天天气很好  '), 6);
});

test('英文按连续字母段计', () => {
  assert.equal(countWords('hello world'), 2);
  assert.equal(countWords('hello,world'), 2);
});

test('数字按连续数字段计', () => {
  assert.equal(countWords('2026年6月'), 4); // 2026 + 6 + 年 + 月
  assert.equal(countWords('abc123def'), 3); // abc / 123 / def
});

test('中英混排', () => {
  assert.equal(countWords('今天天气 nice，适合 walking!'), 8); // 6 中文字 + 2 英文词
});

test('标点与空格不计', () => {
  assert.equal(countWords('。，！？…—、；：""'), 0);
  assert.equal(countWords('你 好 。 世 界'), 4);
});

test('emoji 不计', () => {
  assert.equal(countWords('😊😊'), 0);
  assert.equal(countWords('开心😊today'), 3); // 开 + 心 + today
});

test('业务门槛边界（首封150/回信100/日记30 由服务端用本函数复算）', () => {
  const zh149 = '字'.repeat(149);
  const zh150 = '字'.repeat(150);
  assert.equal(countWords(zh149), 149);
  assert.equal(countWords(zh150), 150);
});

test('【同源强制】web 端 countWords.js 与 server 端逐字节一致', () => {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const serverFile = readFileSync(`${here}/../src/utils/countWords.js`, 'utf8');
  const webFile = readFileSync(`${here}/../../web/src/utils/countWords.js`, 'utf8');
  assert.equal(
    webFile,
    serverFile,
    'web/src/utils/countWords.js 与 server/src/utils/countWords.js 内容不一致 —— 两处必须同步修改'
  );
});
