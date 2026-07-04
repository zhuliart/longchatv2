/* 文本工具（T6.2）：信件正文 → 列表摘要。
   接口返回信件为完整 content（不含 excerpt），前端按需截取预览。 */
export function excerpt(str, n = 40) {
  const s = String(str || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}
