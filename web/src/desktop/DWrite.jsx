/* 桌面写信（T5.5 / T6.3 封存寄出·回信·存草稿·AI / 匿名）：1fr+316px —— 左=信纸（收信人 chips
   + 匿名信区 + 匿名寄出、标题、横线正文、字数进度、存草稿/封存寄出）；右=AI 灵感栏 + 写信约定卡。
   寄出 POST /letters（回信 /letters/:id/reply；匿名信区 POST /anon/letters）；存草稿 POST /drafts。 */
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { countWords } from '../utils/countWords.js';
import { FIRST_MIN, REPLY_MIN } from '../constants/index.js';
import { lettersApi, draftsApi, aiApi, anonApi, matchesApi, useResource, ApiError } from '../api/index.js';
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
  const matches = useResource(() => matchesApi.getDailyRecommend(), []);
  // 可选收件人 = 通信过的人（回信门槛）+ 今日推荐（首封门槛，去重）
  const recipients = useMemo(() => {
    const known = buildRecipients(inbox.data, sent.data).map((r) => ({ ...r, first: false }));
    const knownIds = new Set(known.map((r) => r.uid));
    const recs = (matches.data || [])
      .filter((m) => !knownIds.has(String(m.profile._id)))
      .map((m) => ({ uid: String(m.profile._id), name: m.profile.nickname, first: true }));
    return [...known, ...recs];
  }, [inbox.data, sent.data, matches.data]);

  const replyToId = replyTo?._id || null;
  // 旧版把信区存成哨兵收件人 '__board'——恢复暂存时识别并清洗，避免出现假 chip
  const savedBoard = !!saved && (saved.board === true || saved.targetUid === '__board');
  const savedUid = saved && saved.targetUid !== '__board' ? saved.targetUid : '';
  const savedName = savedBoard ? '' : (saved && saved.targetNickname) || '';
  const [boardSel, setBoardSel] = useState(params.board === true || savedBoard); // 寄往匿名信区（可再点取消）
  const [toUid, setToUid] = useState(
    replyTo ? String(replyTo.from_uid || '')
      : draft?.to_uid ? String(draft.to_uid)
      : params.targetUid || savedUid || ''
  );
  const [toName, setToName] = useState(
    replyTo ? replyTo.senderNickname
      : draft?.receiverNickname ? draft.receiverNickname
      : params.targetNickname || savedName || ''
  );
  // 是否首封：回信/通信对象=false；推荐/主页带入按 params.isFirst；未知默认 true（宁高勿低，服务端复校）
  const [first, setFirst] = useState(
    replyTo ? false
      : draft ? (draft.required || FIRST_MIN) >= FIRST_MIN
      : params.targetUid ? params.isFirst !== false
      : savedUid ? saved.isFirst !== false
      : true
  );
  const [isAnon, setIsAnon] = useState(false); // 匿名寄给指定收件人
  const [title, setTitle] = useState(replyTo ? '回信：' + (replyTo.title || '') : draft ? draft.title : (saved && saved.draftTitle) || '');
  const [body, setBody] = useState(draft ? String(draft.excerpt || '').replace(/…$/, '') : (saved && saved.draftBody) || '');
  const [draftId, setDraftId] = useState(draft?._id || (saved && saved.draftId) || null);
  const [aiBusy, setAiBusy] = useState(false);
  const [sugs, setSugs] = useState([]);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sentOk, setSentOk] = useState(false); // 寄出成功后关闭自动暂存（防清理后又被回存）
  const [savedClean, setSavedClean] = useState(false); // 存草稿后暂存已清；再编辑才恢复自动暂存
  // 从自动暂存恢复的内容：给「清空重写」入口
  const [showRestored, setShowRestored] = useState(!!saved && !!(saved.draftBody || saved.draftTitle));

  const board = boardSel;
  const required = board ? anonApi.BOARD_MIN : replyToId ? REPLY_MIN : first ? FIRST_MIN : REPLY_MIN;
  const wc = countWords(body);
  const canSend = board ? wc >= required : (replyToId || toUid) && wc >= required;

  useWriteDraftAutosave({ targetUid: toUid, targetNickname: toName, isFirst: first, board, draftId, draftTitle: title, draftBody: body }, !sentOk && !savedClean);

  /* 清空重写：白纸开始（清字段 + 清暂存） */
  function startBlank() {
    setTitle(''); setBody(''); setToUid(''); setToName(''); setBoardSel(false); setFirst(true); setIsAnon(false);
    clearWriteDraft();
    setShowRestored(false);
  }

  function pick(r) { setToUid(r.uid); setToName(r.name); setFirst(r.first !== false); setBoardSel(false); setSavedClean(false); }
  function pickExt() { setBoardSel(false); } // 点回带入的收件人（推荐/主页进入的对象）
  function pickBoard() { setBoardSel((b) => !b); setIsAnon(false); } // 再点一次取消

  async function aiContinue() {
    setAiBusy(true); setSugs([]);
    try {
      const target = toUid && !board ? { targetUid: toUid } : {};
      const { suggestions } = await aiApi.getWritingInspiration({ draft: body, ...target });
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
        title, content: body, isFirst: first,
      });
      if (res?._id) setDraftId(res._id);
      // 草稿已安放进草稿箱：清本地暂存 → 下次「写一封信」是新的一封（再编辑则恢复防丢保护）
      setSavedClean(true);
      clearWriteDraft();
      toast('草稿已保存 ✦ 可在信箱·草稿箱继续');
    } catch {
      /* 异常已由 client 层 toast */
    } finally {
      setSavingDraft(false);
    }
  }

  async function send() {
    if (sending) return;
    if (!board && !replyToId && !toUid) { toast('先选择收信人'); return; }
    if (wc < required) { toast(`还差 ${required - wc} 字（至少 ${required} 字）`); return; }
    setSending(true);
    try {
      if (board) {
        await anonApi.sendAnonLetter({ title, content: body });
        setSentOk(true); // 先停自动暂存，再清理，防 400ms 竞态回存
        clearWriteDraft();
        toast('已寄往匿名信区 ✦ 陌生的回应会慢慢抵达');
        setTimeout(() => navigate('/'), 600);
        return;
      }
      if (replyToId) await lettersApi.replyLetter(replyToId, { title, content: body });
      else await lettersApi.sendLetter({ targetUid: toUid, title, content: body, isAnonymous: isAnon });
      setSentOk(true); // 先停自动暂存，再清理，防 400ms 竞态回存
      clearWriteDraft();
      toast(isAnon ? '信已匿名封存寄出 ✦' : '信已封存寄出 ✦ 它将在合适的时刻抵达');
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
        <div className="dsk-title">{replyTo ? '回一封信' : board ? '写一封匿名信' : '写一封信'}</div>
        <div className="dsk-sub">
          {replyTo ? `回复 ${replyTo.senderNickname} 的「${replyTo.title}」`
            : board ? '寄往匿名信区 —— 所有人可读、可回应，没有人知道是你'
            : '字数不是门槛，是一种慢下来的邀请'}
        </div>
      </div>
      <div className="dsk-write">
        <div className="card dsk-write-paper">
          <div className="dsk-recipient-row">
            <span className="dsk-recipient-label">致</span>
            {replyTo ? (
              <span className="dsk-recipient active">{toName}</span>
            ) : (
              <>
                {toUid && !recipients.some((r) => r.uid === toUid) && (
                  <span className={'dsk-recipient' + (!board ? ' active' : '')} onClick={pickExt}>{toName || '收信人'}</span>
                )}
                {recipients.map((r) => (
                  <span key={r.uid}
                    className={'dsk-recipient' + (!board && toUid === r.uid ? ' active' : '') + (r.first ? ' is-new' : '')}
                    onClick={() => pick(r)}>{r.name}{r.first ? ' ✧' : ''}</span>
                ))}
                {recipients.length === 0 && !toUid && (
                  <span className="dsk-recipient-hint">暂无可选收件人 —— 通信过或今日推荐的人会出现在这里</span>
                )}
                <span className={'dsk-recipient is-board' + (board ? ' active' : '')} onClick={pickBoard}
                  title={board ? '再点一次取消，改寄给某个人' : '寄到所有人可见的匿名信区'}>
                  ◐ 匿名信区{board ? ' ✕' : ''}
                </span>
              </>
            )}
            {!replyTo && !board && toUid && (
              <label className={'anon-toggle' + (isAnon ? ' on' : '')}>
                <input type="checkbox" checked={isAnon} onChange={(e) => setIsAnon(e.target.checked)} />
                匿名寄出
              </label>
            )}
          </div>
          {showRestored && (
            <div className="dsk-restore-bar">
              已恢复上次未寄出的内容
              <span className="dsk-restore-clear" onClick={startBlank}>清空重写</span>
              <span className="dsk-restore-dismiss" onClick={() => setShowRestored(false)}>继续写 ✓</span>
            </div>
          )}
          {board && <div className="dsk-board-note">这封信会出现在所有人的「匿名信区」，署名固定为「匿名笔友」。</div>}
          {isAnon && !board && <div className="dsk-board-note">对方只会看到「匿名笔友」，不会知道这封信来自你。</div>}
          <input className="dsk-write-title" placeholder="标题（可不填，≤30字）" maxLength={30} value={title} onChange={(e) => { setTitle(e.target.value); setSavedClean(false); }} />
          <textarea className="dsk-write-body"
            placeholder={board ? '把想说又不便署名的话，写在这里……' : '亲爱的朋友：\n\n见字如面……'}
            value={body} onChange={(e) => { setBody(e.target.value); setSavedClean(false); }} />
          <div className="dsk-write-foot">
            <span className={'dsk-wc' + (wc >= required ? ' ok' : '')}>
              已写 <b>{wc}</b> / {required} 字{board ? '（匿名信）' : replyToId ? '（回信）' : first ? '（首封）' : ''}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              {!board && <div className={'btn btn-ghost' + (savingDraft ? ' btn-disabled' : '')} onClick={saveDraft}>{savingDraft ? '保存中…' : '存草稿'}</div>}
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
              陌生人的首封信至少 150 字，回信至少 100 字，匿名信至少 30 字。<br />
              没有已读回执，没有催促——对方会在 TA 方便的时候读到。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
