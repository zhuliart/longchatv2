/* 桌面写信（T5.5）：1fr+316px —— 左=信纸（收信人 chips 区分「首封」、标题、横线正文、
   字数进度、存草稿/封存寄出）；右=AI 灵感栏（shimmer 占位，M6 接通）+ 写信约定卡。 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { countWords } from '../utils/countWords.js';
import { FIRST_MIN, REPLY_MIN } from '../constants/index.js';
import { RECIPIENTS, AI_MOCK_SUGGESTIONS } from '../mocks/index.js';
import { useUI } from '../store/ui.jsx';
import { loadWriteDraft, clearWriteDraft, useWriteDraftAutosave } from '../store/writeDraft.js';

export function DWrite() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { toast } = useUI();
  const params = state || {};
  const replyTo = params.replyTo;
  const draft = params.draft;
  const saved = state ? null : loadWriteDraft();
  const [to, setTo] = useState(
    replyTo ? replyTo.senderNickname
      : draft && draft.receiverNickname ? draft.receiverNickname
      : params.targetNickname || (saved && saved.targetNickname) || ''
  );
  const [title, setTitle] = useState(replyTo ? '回信：' + replyTo.title : draft ? draft.title : (saved && saved.draftTitle) || '');
  const [body, setBody] = useState(draft ? draft.excerpt.replace(/……$/, '') : (saved && saved.draftBody) || '');
  const [aiBusy, setAiBusy] = useState(false);
  const [sugs, setSugs] = useState([]);
  const rec = RECIPIENTS.find((r) => r.name === to);
  const isFirst = rec ? rec.first : true;
  const required = replyTo ? REPLY_MIN : draft ? draft.required : isFirst ? FIRST_MIN : REPLY_MIN;
  const wc = countWords(body);
  const ok = to && wc >= required;

  useWriteDraftAutosave({ targetNickname: to, isFirst, draftTitle: title, draftBody: body });

  /* AI 续写/润色占位：M6 接通 POST /ai/inspiration | /ai/polish */
  function aiContinue() {
    setAiBusy(true); setSugs([]);
    setTimeout(() => { setSugs(AI_MOCK_SUGGESTIONS); setAiBusy(false); }, 900);
  }
  function aiPolish() {
    if (countWords(body) < 10) { toast('先写下一点内容，再帮你润色'); return; }
    setAiBusy(true);
    setTimeout(() => { setAiBusy(false); toast('润色完成 ✦'); }, 900);
  }
  function insert(s) { setBody((b) => (b ? b.trimEnd() + '\n\n' : '') + s); setSugs([]); }
  function onBack() { navigate('/inbox'); }
  function send() {
    if (!ok) { toast(!to ? '先选择收信人' : `还差 ${required - wc} 字（${isFirst && !replyTo ? '首封至少 ' + required : '至少 ' + required} 字）`); return; }
    // M6 接通 POST /letters | /letters/:id/reply
    clearWriteDraft();
    toast('信已封存寄出 ✦ 它将在合适的时刻抵达');
    setTimeout(onBack, 900);
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
            {RECIPIENTS.map((r) => (
              <span key={r.name}
                className={'dsk-recipient' + (to === r.name ? ' active' : '') + (r.first ? ' is-new' : '')}
                onClick={() => setTo(r.name)}>{r.name}</span>
            ))}
          </div>
          <input className="dsk-write-title" placeholder="标题（可不填，≤30字）" maxLength={30} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="dsk-write-body" placeholder={'亲爱的朋友：\n\n见字如面……'} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="dsk-write-foot">
            <span className={'dsk-wc' + (wc >= required ? ' ok' : '')}>已写 <b>{wc}</b> / {required} 字{replyTo ? '（回信）' : isFirst ? '（首封）' : ''}</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="btn btn-ghost" onClick={() => toast('草稿已保存 ✦')}>存草稿</div>
              <div className={'btn btn-primary' + (ok ? '' : ' btn-disabled')} onClick={send}>封存寄出</div>
            </div>
          </div>
        </div>

        <div className="dsk-write-side">
          <div className="card dsk-card">
            <div className="dsk-ai-title">✦ 灵感</div>
            <div className="dsk-ai-sub">根据你以往信件的笔触，续写或润色。生成的句子只是提议，采不采用由你。</div>
            <div className="dsk-ai-actions">
              <button className={'dsk-ai-action' + (aiBusy ? ' busy' : '')} onClick={aiContinue}>✎ 顺着我的风格续写</button>
              <button className={'dsk-ai-action' + (aiBusy ? ' busy' : '')} onClick={aiPolish}>❋ 帮我润色这段</button>
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
