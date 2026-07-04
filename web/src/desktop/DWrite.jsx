/* 桌面写信（T5.5 / T6.3 封存寄出·回信·存草稿·AI）：1fr+316px —— 左=信纸（收信人 chips、标题、
   横线正文、字数进度、存草稿/封存寄出）；右=AI 灵感栏 + 写信约定卡。
   收件人 chips 由通信关系派生（收件箱/已发出去重）；寄出 POST /letters（回信 /letters/:id/reply）；
   存草稿 POST /drafts；AI POST /ai/inspiration | /ai/polish。 */
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { countWords } from '../utils/countWords.js';
import { FIRST_MIN, REPLY_MIN } from '../constants/index.js';
import { lettersApi, draftsApi, aiApi, useResource, ApiError } from '../api/index.js';
import { useUI } from '../store/ui.jsx';
import { loadWriteDraft, clearWriteDraft, useWriteDraftAutosave } from '../store/writeDraft.js';

/* 收件箱 + 已发出 → 去重的通信对象（皆为非首封对象） */
function buildRecipients(inbox, sent) {
  const map = new Map();
  (inbox || []).forEach((l) => { if (l.from_uid) map.set(String(l.from_uid), l.senderNickname); });
  (sent || []).forEach((l) => { if (l.to_uid) map.set(String(l.to_uid), l.receiverNickname); });
  return [...map.entries()].map(([uid, name]) => ({ uid, name }));
}

export function DWrite() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { toast } = useUI();
  const params = state || {};
  const replyTo = params.replyTo;
  const draft = params.draft;
  const saved = state ? null : loadWriteDraft();

  const inbox = useResource(() => lettersApi.getInbox(0), []);
  const sent = useResource(() => lettersApi.getSent(0), []);
  const recipients = useMemo(() => buildRecipients(inbox.data, sent.data), [inbox.data, sent.data]);

  const replyToId = replyTo?._id || null;
  const [toUid, setToUid] = useState(
    replyTo ? String(replyTo.from_uid || '')
      : draft?.to_uid ? String(draft.to_uid)
      : params.targetUid || (saved && saved.targetUid) || ''
  );
  const [toName, setToName] = useState(
    replyTo ? replyTo.senderNickname
      : draft?.receiverNickname ? draft.receiverNickname
      : params.targetNickname || (saved && saved.targetNickname) || ''
  );
  const [title, setTitle] = useState(replyTo ? '回信：' + (replyTo.title || '') : draft ? draft.title : (saved && saved.draftTitle) || '');
  const [body, setBody] = useState(draft ? String(draft.excerpt || '').replace(/…$/, '') : (saved && saved.draftBody) || '');
  const [draftId, setDraftId] = useState(draft?._id || (saved && saved.draftId) || null);
  const [aiBusy, setAiBusy] = useState(false);
  const [sugs, setSugs] = useState([]);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const isFirst = replyToId ? false : !toUid ? true : false; // 选定通信对象皆非首封
  const required = replyToId ? REPLY_MIN : draft ? draft.required : isFirst ? FIRST_MIN : REPLY_MIN;
  const wc = countWords(body);
  const canSend = (replyToId || toUid) && wc >= required;

  useWriteDraftAutosave({ targetUid: toUid, targetNickname: toName, isFirst, draftId, draftTitle: title, draftBody: body });

  function pick(r) { setToUid(r.uid); setToName(r.name); }

  async function aiContinue() {
    setAiBusy(true); setSugs([]);
    try {
      const { suggestions } = await aiApi.getWritingInspiration({ draft: body, ...(toUid ? { targetUid: toUid } : {}) });
      setSugs(suggestions || []);
    } catch {
      /* 降级/异常已由 client 层 toast */
    } finally {
      setAiBusy(false);
    }
  }
  async function aiPolish() {
    if (countWords(body) < 10) { toast('先写下一点内容，再帮你润色'); return; }
    setAiBusy(true);
    try {
      const { polished } = await aiApi.polishLetter(body.trim());
      if (polished) { setBody(polished); toast('润色完成 ✦'); }
    } catch {
      /* 异常已由 client 层 toast */
    } finally {
      setAiBusy(false);
    }
  }
  function insert(s) { setBody((b) => (b ? b.trimEnd() + '\n\n' : '') + s); setSugs([]); }
  function onBack() { navigate('/inbox'); }

  async function saveDraft() {
    if (savingDraft) return;
    setSavingDraft(true);
    try {
      const res = await draftsApi.saveDraft({
        ...(draftId ? { id: draftId } : {}),
        ...(toUid ? { targetUid: toUid } : {}),
        title, content: body, isFirst,
      });
      if (res?._id) setDraftId(res._id);
      toast('草稿已保存 ✦');
    } catch {
      /* 异常已由 client 层 toast */
    } finally {
      setSavingDraft(false);
    }
  }

  async function send() {
    if (sending) return;
    if (!replyToId && !toUid) { toast('先选择收信人'); return; }
    if (wc < required) { toast(`还差 ${required - wc} 字（至少 ${required} 字）`); return; }
    setSending(true);
    try {
      if (replyToId) await lettersApi.replyLetter(replyToId, { title, content: body });
      else await lettersApi.sendLetter({ targetUid: toUid, title, content: body });
      clearWriteDraft();
      toast('信已封存寄出 ✦ 它将在合适的时刻抵达');
      setTimeout(onBack, 600);
    } catch (err) {
      if (err instanceof ApiError && [1001, 1002, 1003].includes(err.code)) toast(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="dsk-page">
      <div className="dsk-back" onClick={onBack}>‹ 返回信箱</div>
      <div className="dsk-head">
        <div className="dsk-title">{replyTo ? '回一封信' : '写一封信'}</div>
        <div className="dsk-sub">{replyTo ? `回复 ${replyTo.senderNickname} 的「${replyTo.title}」` : '字数不是门槛，是一种慢下来的邀请'}</div>
      </div>
      <div className="dsk-write">
        <div className="card dsk-write-paper">
          <div className="dsk-recipient-row">
            <span className="dsk-recipient-label">致</span>
            {replyTo ? (
              <span className="dsk-recipient active">{toName}</span>
            ) : recipients.length === 0 ? (
              <span className="dsk-recipient" style={{ opacity: 0.6 }}>{toName || '暂无通信对象，可先存草稿'}</span>
            ) : (
              recipients.map((r) => (
                <span key={r.uid}
                  className={'dsk-recipient' + (toUid === r.uid ? ' active' : '')}
                  onClick={() => pick(r)}>{r.name}</span>
              ))
            )}
          </div>
          <input className="dsk-write-title" placeholder="标题（可不填，≤30字）" maxLength={30} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="dsk-write-body" placeholder={'亲爱的朋友：\n\n见字如面……'} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="dsk-write-foot">
            <span className={'dsk-wc' + (wc >= required ? ' ok' : '')}>已写 <b>{wc}</b> / {required} 字{replyToId ? '（回信）' : isFirst ? '（首封）' : ''}</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className={'btn btn-ghost' + (savingDraft ? ' btn-disabled' : '')} onClick={saveDraft}>{savingDraft ? '保存中…' : '存草稿'}</div>
              <div className={'btn btn-primary' + (canSend && !sending ? '' : ' btn-disabled')} onClick={send}>{sending ? '寄出中…' : '封存寄出'}</div>
            </div>
          </div>
        </div>

        <div className="dsk-write-side">
          <div className="card dsk-card">
            <div className="dsk-ai-title">✦ 灵感</div>
            <div className="dsk-ai-sub">根据你以往信件的笔触，续写或润色。生成的句子只是提议，采不采用由你。</div>
            <div className="dsk-ai-actions">
              <button className={'dsk-ai-action' + (aiBusy ? ' busy' : '')} onClick={aiContinue} disabled={aiBusy}>✎ 顺着我的风格续写</button>
              <button className={'dsk-ai-action' + (aiBusy ? ' busy' : '')} onClick={aiPolish} disabled={aiBusy}>❋ 帮我润色这段</button>
            </div>
            {aiBusy && <div className="dsk-ai-actions"><div className="dsk-ai-shimmer" /><div className="dsk-ai-shimmer" /></div>}
            {sugs.length > 0 && (
              <div className="dsk-ai-actions tab-fade">
                {sugs.map((s, i) => <div key={i} className="dsk-ai-sug" onClick={() => insert(s)}>{s}</div>)}
              </div>
            )}
          </div>
          <div className="card dsk-card">
            <div className="dsk-ai-title">☾ 写信的约定</div>
            <div className="dsk-ai-sub">
              陌生人的首封信至少 150 字，回信至少 100 字。<br />
              没有已读回执，没有催促——对方会在 TA 方便的时候读到。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
