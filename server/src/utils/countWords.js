/**
 * 字数统计 —— 前后端同源实现（步骤书 T0.5，语义与原型 components.jsx 一致）。
 * 规则：去首尾空格；中文按字、英文按连续字母段、数字按连续数字段各计 1；
 * 标点、空格、emoji 不计。校验以服务端计算结果为准，不信任前端传值。
 *
 * ⚠️ 本文件在 web/src/utils/countWords.js 有一份逐字节相同的拷贝，
 *    由 server/tests/countWords.test.js 强制校验一致 —— 改动必须两处同步。
 */
export function countWords(text) {
  if (!text) return 0;
  const t = String(text).trim();
  if (!t) return 0;
  const cn = (t.match(/[一-龥]/g) || []).length;
  const en = (t.match(/[a-zA-Z]+/g) || []).length;
  const num = (t.match(/\d+/g) || []).length;
  return cn + en + num;
}
