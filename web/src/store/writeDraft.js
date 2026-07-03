import { useEffect, useRef } from 'react';

/* writeDraft（T5.7）：写信内容 localStorage 自动暂存（防误关丢字），
   寄出成功后清除；M6 中「存草稿」另走 POST /drafts。 */

const KEY = 'pc_write_draft';

export function loadWriteDraft() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

export function clearWriteDraft() {
  localStorage.removeItem(KEY);
}

/* 输入停顿 400ms 后落盘 */
export function useWriteDraftAutosave(draft, enabled = true) {
  const first = useRef(true);
  useEffect(() => {
    if (!enabled) return undefined;
    if (first.current) {
      first.current = false;
      return undefined;
    }
    const t = setTimeout(() => {
      if (draft.draftBody || draft.draftTitle) localStorage.setItem(KEY, JSON.stringify(draft));
    }, 400);
    return () => clearTimeout(t);
  }, [draft, enabled]);
}
