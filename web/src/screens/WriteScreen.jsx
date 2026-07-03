/* 写信（T5.4）：收信人 + 标题(≤30) + 横线信纸正文 + 字数门槛进度「已写 n / N 字」
   + 灵感面板（静态灵感组 + AI 续写/润色占位，M6 接通 POST /ai/*）+ 封存寄出。
   正文 localStorage 自动暂存（T5.7 writeDraft）。 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StatusBar, NavBar } from '../components/chrome.jsx';
import { countWords } from '../utils/countWords.js';
import { FIRST_MIN, REPLY_MIN } from '../constants/index.js';
import { INSPIRATION, AI_MOCK_SUGGESTIONS } from '../mocks/index.js';
import { useUI } from '../store/ui.jsx';
import { loadWriteDraft, clearWriteDraft, useWriteDraftAutosave } from '../store/writeDraft.js';

export function WriteScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { toast } = useUI();
  const saved = state ? null : loadWriteDraft(); // 直接进入且无参数时恢复自动暂存
  const params = state || saved || {};
  const isFirst = params.isFirst !== false;
  const required = isFirst ? FIRST_MIN : REPLY_MIN;
  const [title, setTitle] = useState(params.draftTitle || '');
  const [content, setContent] = useState(params.draftBody || '');
  const [sending, setSending] = useState(false);
  const [inspireOpen, setInspireOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiKind, setAiKind] = useState(null);
  const [aiResults, setAiResults] = useState([]);
  const [aiPolishText, setAiPolishText] = useState('');
  const [aiErr, setAiErr] = useState('');

  useWriteDraftAutosave({
    targetNickname: params.targetNickname || '',
    isFirst,
    draftId: params.draftId,
    draftTitle: title,
    draftBody: content,
  });

  /* AI 续写占位：M6 接通 POST /ai/inspiration（shimmer 加载 → 候选点击插入） */
  function aiContinue() {
    setAiKind('continue'); setAiErr(''); setAiResults([]); setAiPolishText('');
    setAiBusy(true);
    setTimeout(() => { setAiResults(AI_MOCK_SUGGESTIONS); setAiBusy(false); }, 900);
  }
  /* AI 润色占位：M6 接通 POST /ai/polish（正文 ≥10 字） */
  function aiPolish() {
    setAiKind('polish'); setAiErr(''); setAiResults([]); setAiPolishText('');
    const draft = content.trim();
    if (countWords(draft) < 10) { setAiErr('先写下一点内容，我再帮你润色～'); return; }
    setAiBusy(true);
    setTimeout(() => { setAiPolishText(draft); setAiBusy(false); }, 900);
  }

  function insertLine(ln) { setContent((c) => (c ? c + '\n\n' + ln : ln)); }
  const wc = countWords(content);
  const canSend = wc >= required;
  const pct = Math.min(100, (wc / required) * 100);

  function back() { navigate(-1); }
  function send() {
    if (!canSend || sending) return;
    setSending(true);
    // M6 接通 POST /letters（寄出成功后服务端删除对应草稿）
    setTimeout(() => { clearWriteDraft(); toast('信件已寄出 ✦'); back(); }, 700);
  }

  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title="写信" onBack={back} />
      <div className="recipient-bar">
        <span className="recipient-label">致：</span>
        <span className="recipient-name">{params.targetNickname || '请选择收信人'}</span>
      </div>
      <div className="page-scroll">
        <div className="letter-paper ruled">
          <input className="title-input" placeholder="信件标题（选填）" maxLength={30} value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="paper-divider" />
          <textarea className="content-textarea"
            placeholder={isFirst ? '写下你想对TA说的话吧（至少150字）' : '写下你的回信（至少100字）'}
            value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="counter-bar">
            <span className={'counter-text ' + (canSend ? 'counter-ok' : 'counter-warn')}>{wc} / {required} 字</span>
            {!canSend && wc > 0 && <span className="counter-text counter-warn">还需 {required - wc} 字</span>}
          </div>
        </div>
        <div className="counter-progress"><i style={{ width: pct + '%' }} /></div>
      </div>
      <div className="send-area">
        <button className="inspire-btn" onClick={() => setInspireOpen(true)} aria-label="灵感笔记">
          <span className="inspire-glyph">❋</span>
          <span className="inspire-label">灵感</span>
        </button>
        <div className="send-right">
          <div className="btn btn-ghost" style={{ padding: '11px 16px' }} onClick={() => toast('草稿已保存')}>存草稿</div>
          <div className={'btn btn-primary' + (!canSend || sending ? ' btn-disabled' : '')} onClick={send}>{sending ? '寄出中...' : '封存寄出'}</div>
        </div>
      </div>
      {inspireOpen && (
        <div className="sheet-mask" onClick={() => setInspireOpen(false)}>
          <div className="sheet inspire-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">灵感笔记</span>
              <span className="sheet-close" onClick={() => setInspireOpen(false)}>✕</span>
            </div>
            <div className="sheet-scroll">
              <div className="ai-inspire">
                <div className="ai-inspire-head">
                  <span className="ai-badge">AI</span>
                  <span className="ai-inspire-title">灵感推演</span>
                  <span className="ai-inspire-note">学习你的笔触</span>
                </div>
                <div className="ai-actions">
                  <button className="ai-action" onClick={aiContinue} disabled={aiBusy}>
                    <span className="ai-action-glyph">✎</span><span>顺着我的风格续写</span>
                  </button>
                  <button className="ai-action" onClick={aiPolish} disabled={aiBusy}>
                    <span className="ai-action-glyph">✦</span><span>帮我润色这段</span>
                  </button>
                </div>
                {aiBusy && (
                  <div className="ai-loading"><span className="ai-dots"><i/><i/><i/></span>正在揣摩你的笔触……</div>
                )}
                {aiErr && <div className="ai-error">{aiErr}</div>}
                {!aiBusy && aiKind === 'continue' && aiResults.length > 0 && (
                  <div className="ai-results">
                    {aiResults.map((r, i) => (
                      <button className="ai-suggestion" key={i} onClick={() => { insertLine(r); toast('已添加到信里'); }}>
                        <span>{r}</span><span className="inspire-add">＋</span>
                      </button>
                    ))}
                    <button className="ai-regen" onClick={aiContinue}>换一批</button>
                  </div>
                )}
                {!aiBusy && aiKind === 'polish' && aiPolishText && (
                  <div className="ai-polish">
                    <div className="ai-polish-label">润色后的版本</div>
                    <div className="ai-polish-text">{aiPolishText}</div>
                    <div className="ai-polish-actions">
                      <button className="ai-apply" onClick={() => { setContent(aiPolishText); setInspireOpen(false); toast('已换为润色版本'); }}>替换原文</button>
                      <button className="ai-regen" onClick={aiPolish}>再润一次</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="inspire-divider"><span>或者，从这些开始</span></div>
              <p className="inspire-intro">不知道从哪儿落笔？挑一句开始，或只是读一读，让思绪慢慢展开。</p>
              {INSPIRATION.map((g) => (
                <div className="inspire-group" key={g.label}>
                  <div className="inspire-group-title">{g.label}</div>
                  {g.lines.map((ln) => (
                    <button className="inspire-line" key={ln}
                      onClick={() => { insertLine(ln); setInspireOpen(false); }}>
                      <span>{ln}</span>
                      <span className="inspire-add">＋</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
