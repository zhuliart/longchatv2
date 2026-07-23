/* 写信（T5.4 / T6.3 封存寄出·回信·存草稿·AI 续写/润色）：收信人 + 标题(≤30) + 横线信纸正文
   + 字数门槛进度「已写 n / N 字」+ 灵感面板（静态灵感组 + AI 续写/润色）+ 封存寄出。
   正文 localStorage 自动暂存（T5.7 writeDraft）。
   寄出 POST /letters（回信 POST /letters/:id/reply）→ 成功服务端已删草稿；
   存草稿 POST /drafts；AI POST /ai/inspiration | /ai/polish。 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StatusBar, NavBar } from '../components/chrome.jsx';
import { countWords } from '../utils/countWords.js';
import { FIRST_MIN, REPLY_MIN } from '../constants/index.js';
import { INSPIRATION } from '../constants/index.js';
import { lettersApi, draftsApi, aiApi, anonApi, ApiError } from '../api/index.js';
import { useUI } from '../store/ui.jsx';
import { loadWriteDraft, clearWriteDraft, useWriteDraftAutosave } from '../store/writeDraft.js';

export function WriteScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { toast } = useUI();
  const saved = state ? null : loadWriteDraft(); // 直接进入且无参数时恢复自动暂存
  const params = state || saved || {};
  const replyToId = params.replyToId || null;
  // 旧版暂存可能把信区存成哨兵收件人 '__board'——一并识别为信区模式
  const board = params.board === true || params.targetUid === '__board'; // 寄往匿名信区
  const isFirst = !replyToId && params.isFirst !== false;
  const required = board ? anonApi.BOARD_MIN : replyToId ? REPLY_MIN : isFirst ? FIRST_MIN : REPLY_MIN;
  const [isAnon, setIsAnon] = useState(false); // 匿名寄给指定收件人
  const [title, setTitle] = useState(params.draftTitle || '');
  const [content, setContent] = useState(params.draftBody || '');
  const [draftId, setDraftId] = useState(params.draftId || null);
  const [targetUid] = useState(params.targetUid === '__board' ? '' : params.targetUid || '');
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [inspireOpen, setInspireOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiKind, setAiKind] = useState(null);
  const [aiResults, setAiResults] = useState([]);
  const [aiPolishText, setAiPolishText] = useState('');
  const [aiErr, setAiErr] = useState('');

  const [sentOk, setSentOk] = useState(false); // 寄出成功后关闭自动暂存（防清理后又被回存）
  const [savedClean, setSavedClean] = useState(false); // 存草稿后暂存已清；再编辑才恢复自动暂存
  useWriteDraftAutosave({
    targetUid,
    targetNickname: params.targetNickname || '',
    isFirst,
    board,
    draftId,
    draftTitle: title,
    draftBody: content,
  }, !sentOk && !savedClean);

  /* AI 续写：POST /ai/inspiration（服务端取最近信件拼 prompt → 3 条候选） */
  async function aiContinue() {
    setAiKind('continue'); setAiErr(''); setAiResults([]); setAiPolishText('');
    setAiBusy(true);
    try {
      const { suggestions } = await aiApi.getWritingInspiration({ draft: content, ...(targetUid ? { targetUid } : {}) });
      setAiResults(suggestions || []);
    } catch (err) {
      // 9002/未配置降级已由 client 层 toast；此处给面板内提示
      setAiErr(err instanceof ApiError ? err.message : '灵感暂时休息了，稍后再试～');
    } finally {
      setAiBusy(false);
    }
  }
  /* AI 润色：POST /ai/polish（正文 ≥10 字，不足服务端 1002） */
  async function aiPolish() {
    setAiKind('polish'); setAiErr(''); setAiResults([]); setAiPolishText('');
    const draft = content.trim();
    if (countWords(draft) < 10) { setAiErr('先写下一点内容，我再帮你润色～'); return; }
    setAiBusy(true);
    try {
      const { polished } = await aiApi.polishLetter(draft);
      setAiPolishText(polished || '');
    } catch (err) {
      setAiErr(err instanceof ApiError ? err.message : '润色暂时不可用，稍后再试～');
    } finally {
      setAiBusy(false);
    }
  }

  function insertLine(ln) { setContent((c) => (c ? c + '\n\n' + ln : ln)); }
  const wc = countWords(content);
  const canSend = wc >= required;
  const pct = Math.min(100, (wc / required) * 100);

  function back() { navigate(-1); }

  async function saveDraft() {
    if (savingDraft) return;
    setSavingDraft(true);
    try {
      const res = await draftsApi.saveDraft({
        ...(draftId ? { id: draftId } : {}),
        ...(targetUid ? { targetUid } : {}),
        title,
        content,
        isFirst,
      });
      if (res?._id) setDraftId(res._id);
      setSavedClean(true);
      clearWriteDraft(); // 草稿已入草稿箱：下次写信是新的一封
      toast('草稿已保存 ✦ 可在草稿箱继续');
    } catch {
      /* 网络异常已由 client 层 toast */
    } finally {
      setSavingDraft(false);
    }
  }

  async function send() {
    if (sending) return;
    if (!canSend) { toast(`还需 ${required - wc} 字`); return; }
    if (!board && !replyToId && !targetUid) { toast('先选择收信人'); return; }
    setSending(true);
    try {
      if (board) await anonApi.sendAnonLetter({ title, content });
      else if (replyToId) await lettersApi.replyLetter(replyToId, { title, content });
      else await lettersApi.sendLetter({ targetUid, title, content, isAnonymous: isAnon });
      setSentOk(true); // 先停自动暂存，再清理，防 400ms 竞态回存
      clearWriteDraft();
      toast(board ? '已寄往匿名信区 ✦' : isAnon ? '信已匿名寄出 ✦' : '信件已寄出 ✦');
      navigate(board ? '/' : '/inbox');
    } catch (err) {
      // 1002 字数 / 1001 违规 / 1003 拒收：就地提示不关页
      if (err instanceof ApiError && [1001, 1002, 1003].includes(err.code)) toast(err.message);
      // 9001 已由 client 层 toast
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title={replyToId ? '回信' : board ? '匿名信' : '写信'} onBack={back} />
      <div className="recipient-bar">
        <span className="recipient-label">致：</span>
        <span className="recipient-name">{board ? '◐ 匿名信区' : params.targetNickname || '请选择收信人'}</span>
        {!board && !replyToId && targetUid && (
          <label className={'anon-toggle' + (isAnon ? ' on' : '')}>
            <input type="checkbox" checked={isAnon} onChange={(e) => setIsAnon(e.target.checked)} />
            匿名
          </label>
        )}
      </div>
      {(board || isAnon) && (
        <div className="anon-note">{board ? '所有人可读、可回应，署名固定为「匿名笔友」' : '对方只会看到「匿名笔友」，不会知道是你'}</div>
      )}
      <div className="page-scroll">
        <div className="letter-paper ruled">
          <input className="title-input" placeholder="信件标题（选填）" maxLength={30} value={title} onChange={(e) => { setTitle(e.target.value); setSavedClean(false); }} />
          <div className="paper-divider" />
          <textarea className="content-textarea"
            placeholder={board ? '把想说又不便署名的话，写在这里…（至少30字）' : isFirst ? '写下你想对TA说的话吧（至少150字）' : '写下你的回信（至少100字）'}
            value={content} onChange={(e) => { setContent(e.target.value); setSavedClean(false); }} />
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
          {!board && <div className={'btn btn-ghost' + (savingDraft ? ' btn-disabled' : '')} style={{ padding: '11px 16px' }} onClick={saveDraft}>{savingDraft ? '保存中…' : '存草稿'}</div>}
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
