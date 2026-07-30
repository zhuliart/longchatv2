/* 信箱（T5.4 / T6.2 #3#4#5、T6.3 删草稿）：收件箱/已发出/草稿箱三段 Tab + 信封卡列表
   + FAB ✎（继续写/重新写）+ 删草稿确认。数据来自 GET /letters/inbox|sent、GET /drafts；
   删除草稿 DELETE /drafts/:id。 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StatusBar } from '../components/chrome.jsx';
import { EnvelopeCard, DraftCard } from '../components/cards.jsx';
import { SkeletonList, ErrorState, EmptyState } from '../components/states.jsx';
import { lettersApi, draftsApi, useResource } from '../api/index.js';
import { FIRST_MIN } from '../constants/index.js';
import { useUI } from '../store/ui.jsx';

const EMPTY = {
  inbox: { icon: '✉', title: '还没有来信', sub: '去发现灵魂匹配吧', to: '/match', action: '去看看推荐' },
  sent: { icon: '✉', title: '还没有发出过信件', sub: '写下你的第一封信', to: '/write', action: '写一封信' },
  draft: { icon: '✎', title: '还没有草稿', sub: '未写完的信会自动留在这里' },
  archived: { icon: '▤', title: '归档箱是空的', sub: '在信里点「归档」可以把信收进这里' },
};

export function InboxScreen() {
  const navigate = useNavigate();
  const { toast } = useUI();
  const [params] = useSearchParams();
  const initialTab = params.get('tab');
  const [tab, setTab] = useState(['sent', 'draft', 'archived'].includes(initialTab) ? initialTab : 'inbox');
  const [confirmId, setConfirmId] = useState(null);
  const [fabMenu, setFabMenu] = useState(false);

  const inbox = useResource(() => lettersApi.getInbox(0), []);
  const sent = useResource(() => lettersApi.getSent(0), []);
  const drafts = useResource(() => draftsApi.getDrafts(0), []);
  const archived = useResource(() => lettersApi.getArchived(0), []);

  const draftList = drafts.data || [];
  const confirmDraft = draftList.find((d) => d._id === confirmId);
  const latestDraft = draftList[0];

  function writeFromDraft(d) {
    navigate('/write', {
      state: {
        targetUid: d.to_uid || '',
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
    if (draftList.length > 1) { setTab('draft'); return; }
    if (latestDraft) writeFromDraft(latestDraft);
    else startNew();
  }

  async function doDelete() {
    const id = confirmId;
    setConfirmId(null);
    try {
      await draftsApi.deleteDraft(id);
      drafts.reload();
      toast('草稿已删除');
    } catch {
      /* 网络异常已由 client 层 toast */
    }
  }

  const cur = tab === 'inbox' ? inbox : tab === 'sent' ? sent : tab === 'archived' ? archived : drafts;

  async function unarchive(id) {
    try {
      await lettersApi.unarchiveLetter(id);
      toast('已放回收件箱 ✦');
      archived.reload();
      inbox.reload();
    } catch {
      /* 异常已由 client 层 toast */
    }
  }
  const list = cur.data || [];
  const cfg = EMPTY[tab];

  return (
    <div className="page">
      <StatusBar />
      <div className="seg-tabs seg-tabs-3">
        <div className={'seg-tab' + (tab === 'inbox' ? ' active' : '')} onClick={() => setTab('inbox')}>收件箱</div>
        <div className={'seg-tab' + (tab === 'sent' ? ' active' : '')} onClick={() => setTab('sent')}>已发出</div>
        <div className={'seg-tab' + (tab === 'draft' ? ' active' : '')} onClick={() => setTab('draft')}>
          草稿{draftList.length > 0 && <span className="seg-count">{draftList.length}</span>}
        </div>
        <div className={'seg-tab' + (tab === 'archived' ? ' active' : '')} onClick={() => setTab('archived')}>归档</div>
      </div>
      <div className="page-scroll" style={{ padding: '12px 16px 24px' }} key={tab}>
        <div className="tab-fade">
          {cur.loading ? (
            <SkeletonList rows={3} />
          ) : cur.error ? (
            <ErrorState onRetry={cur.reload} />
          ) : list.length === 0 ? (
            <EmptyState icon={cfg.icon} title={cfg.title} sub={cfg.sub}
              actionLabel={cfg.action} onAction={cfg.to ? () => navigate(cfg.to) : undefined} />
          ) : tab === 'draft' ? (
            list.map((d) => (
              <DraftCard key={d._id} draft={d} onClick={() => writeFromDraft(d)} onDelete={(id) => setConfirmId(id)} />
            ))
          ) : tab === 'archived' ? (
            list.map((l) => (
              <div key={l._id} className="archived-item">
                <EnvelopeCard letter={l}
                  onClick={() => navigate(`/letter/${l._id}`, { state: { name: l.senderNickname } })} />
                <div className="archived-restore" onClick={() => unarchive(l._id)}>↩ 取消归档，放回收件箱</div>
              </div>
            ))
          ) : (
            list.map((l) => (
              <EnvelopeCard key={l._id} letter={l} sent={tab === 'sent'}
                onClick={() => navigate(`/letter/${l._id}${tab === 'sent' ? '?sent=1' : ''}`,
                  { state: { name: tab === 'sent' ? l.receiverNickname : l.senderNickname } })} />
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
                  {draftList.length === 0 ? '暂无草稿，将开始新的一封'
                    : draftList.length === 1 ? '接着写「' + (latestDraft.title || '未命名草稿') + '」'
                    : '草稿箱里还有 ' + draftList.length + ' 封未写完'}
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
              <button className="btn confirm-del" onClick={doDelete}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
