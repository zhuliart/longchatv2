/* 信箱（T5.4）：收件箱/已发出/草稿箱三段 Tab + 信封卡列表 + FAB ✎（继续写/重新写）+ 删草稿确认 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StatusBar } from '../components/chrome.jsx';
import { EnvelopeCard, DraftCard } from '../components/cards.jsx';
import { LETTERS, SENT, DRAFTS } from '../mocks/index.js';
import { FIRST_MIN } from '../constants/index.js';

const EMPTY_TEXT = {
  inbox: ['还没有来信', '去发现灵魂匹配吧'],
  sent: ['还没有发出过信件', '写下你的第一封信'],
  draft: ['还没有草稿', '未写完的信会自动留在这里'],
};

export function InboxScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTab = params.get('tab');
  const [tab, setTab] = useState(initialTab === 'sent' || initialTab === 'draft' ? initialTab : 'inbox');
  const [drafts, setDrafts] = useState(DRAFTS);
  const [confirmId, setConfirmId] = useState(null);
  const [fabMenu, setFabMenu] = useState(false);
  const confirmDraft = drafts.find((d) => d._id === confirmId);
  const latestDraft = drafts[0];

  function writeFromDraft(d) {
    navigate('/write', {
      state: {
        targetNickname: d.receiverNickname || '',
        isFirst: (d.required || 0) >= FIRST_MIN,
        draftId: d._id,
        draftTitle: d.title,
        draftBody: d.excerpt,
      },
    });
  }
  function startNew() {
    setFabMenu(false);
    navigate('/write', { state: { isFirst: true } });
  }
  function continueWriting() {
    setFabMenu(false);
    if (drafts.length > 1) { setTab('draft'); return; }
    if (latestDraft) writeFromDraft(latestDraft);
    else startNew();
  }

  const list = tab === 'inbox' ? LETTERS : tab === 'sent' ? SENT : drafts;
  const emptyText = EMPTY_TEXT[tab];

  return (
    <div className="page">
      <StatusBar />
      <div className="seg-tabs seg-tabs-3">
        <div className={'seg-tab' + (tab === 'inbox' ? ' active' : '')} onClick={() => setTab('inbox')}>收件箱</div>
        <div className={'seg-tab' + (tab === 'sent' ? ' active' : '')} onClick={() => setTab('sent')}>已发出</div>
        <div className={'seg-tab' + (tab === 'draft' ? ' active' : '')} onClick={() => setTab('draft')}>
          草稿箱{drafts.length > 0 && <span className="seg-count">{drafts.length}</span>}
        </div>
      </div>
      <div className="page-scroll" style={{ padding: '12px 16px 24px' }} key={tab}>
        <div className="tab-fade">
          {list.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">{tab === 'draft' ? '✎' : '✉'}</span>
              <span>{emptyText[0]}</span>
              <span className="empty-sub">{emptyText[1]}</span>
            </div>
          ) : tab === 'draft' ? (
            list.map((d) => (
              <DraftCard key={d._id} draft={d} onClick={() => writeFromDraft(d)} onDelete={(id) => setConfirmId(id)} />
            ))
          ) : (
            list.map((l) => (
              <EnvelopeCard key={l._id} letter={l} sent={tab === 'sent'}
                onClick={() => navigate(`/letter/${l._id}${tab === 'sent' ? '?sent=1' : ''}`)} />
            ))
          )}
        </div>
      </div>
      <button className="fab" onClick={() => setFabMenu(true)}>✎</button>
      {fabMenu && (
        <div className="sheet-mask" onClick={() => setFabMenu(false)}>
          <div className="sheet fab-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="fab-sheet-grip" />
            <div className="fab-sheet-title">写一封信</div>
            <button className="fab-option" onClick={continueWriting}>
              <span className="fab-option-glyph">✎</span>
              <span className="fab-option-text">
                <span className="fab-option-label">继续写</span>
                <span className="fab-option-sub">
                  {drafts.length === 0 ? '暂无草稿，将开始新的一封'
                    : drafts.length === 1 ? '接着写「' + (latestDraft.title || '未命名草稿') + '」'
                    : '草稿箱里还有 ' + drafts.length + ' 封未写完'}
                </span>
              </span>
              <span className="fab-option-arrow">›</span>
            </button>
            <button className="fab-option" onClick={startNew}>
              <span className="fab-option-glyph">✦</span>
              <span className="fab-option-text">
                <span className="fab-option-label">重新写</span>
                <span className="fab-option-sub">从一张空白信纸开始</span>
              </span>
              <span className="fab-option-arrow">›</span>
            </button>
            <button className="fab-sheet-cancel" onClick={() => setFabMenu(false)}>取消</button>
          </div>
        </div>
      )}
      {confirmDraft && (
        <div className="confirm-mask" onClick={() => setConfirmId(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">删除这封草稿？</div>
            <div className="confirm-sub">「<b>{confirmDraft.title || (confirmDraft.receiverNickname ? '致 ' + confirmDraft.receiverNickname : '无标题草稿')}</b>」将被删除，删除后无法恢复。</div>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmId(null)}>取消</button>
              <button className="btn confirm-del" onClick={() => { setDrafts((arr) => arr.filter((x) => x._id !== confirmId)); setConfirmId(null); }}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
