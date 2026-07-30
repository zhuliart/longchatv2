/* 桌面信箱（T5.5 / T6.2 #3#4#5、T6.3 打开信·回信·归档）：双栏 384px+1fr —— 左=三 Tab+信封卡列表；
   右=阅读窗（空态 → 火漆信封「拆信」→ 展开信纸 + 回信/归档）。
   数据 GET /letters/inbox|sent、/drafts；拆信 GET /letters/:id（服务端置 read）；归档 POST /letters/:id/archive。 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/primitives.jsx';
import { EnvelopeCard, DraftCard } from '../components/cards.jsx';
import { SkeletonList, ErrorState, EmptyState } from '../components/states.jsx';
import { lettersApi, draftsApi, useResource } from '../api/index.js';
import { relativeTime } from '../utils/date.js';
import { useUI } from '../store/ui.jsx';

export function DInbox() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTab = params.get('tab');
  const initialLetter = params.get('letter');
  const { toast } = useUI();
  const [tab, setTab] = useState(initialTab === 'sent' || initialTab === 'draft' ? initialTab : 'inbox');
  const [selId, setSelId] = useState(initialLetter || null);
  const [readIds, setReadIds] = useState([]); // 本次会话里已拆的信

  const inbox = useResource(() => lettersApi.getInbox(0), []);
  const sent = useResource(() => lettersApi.getSent(0), []);
  const drafts = useResource(() => draftsApi.getDrafts(0), []);
  const archived = useResource(() => lettersApi.getArchived(0), []);
  const cur = tab === 'inbox' ? inbox : tab === 'sent' ? sent : tab === 'archived' ? archived : drafts;
  const list = cur.data || [];
  const sel = tab === 'draft' ? null : list.find((x) => x._id === selId) || null;

  useEffect(() => {
    if (initialLetter) { setTab('inbox'); setSelId(initialLetter); }
  }, [initialLetter]);

  const sealed = sel && tab === 'inbox' && sel.status === 'sent' && !readIds.includes(sel._id);

  function goWrite(state) { navigate('/write', { state }); }

  async function openLetter() {
    setReadIds((a) => [...a, sel._id]); // 立即展开
    try {
      await lettersApi.getLetter(sel._id); // 服务端首读置 read
      inbox.setData((arr) => (arr || []).map((l) => (l._id === sel._id ? { ...l, status: 'read' } : l)));
    } catch {
      /* 异常已由 client 层 toast，仍展示已加载的内容 */
    }
  }

  async function unarchive() {
    const id = sel._id;
    try {
      await lettersApi.unarchiveLetter(id);
      toast('已放回收件箱 ✦');
      setSelId(null);
      archived.reload();
      inbox.reload();
    } catch {
      /* 异常已由 client 层 toast */
    }
  }

  async function archive() {
    const id = sel._id;
    try {
      await lettersApi.archiveLetter(id);
      toast('已归档 ✦ 可在「归档」栏找到');
      setSelId(null);
      inbox.reload();
      archived.reload();
    } catch {
      /* 异常已由 client 层 toast */
    }
  }

  return (
    <div className="dsk-page">
      <div className="dsk-head">
        <div className="dsk-title">信箱</div>
        <div className="dsk-sub">慢一点，没关系。信会等你。</div>
      </div>
      <div className="dsk-mail">
        <div className="dsk-pane">
          <div className="seg-tabs">
            <div className={'seg-tab' + (tab === 'inbox' ? ' active' : '')} onClick={() => { setTab('inbox'); setSelId(null); }}>收件箱</div>
            <div className={'seg-tab' + (tab === 'sent' ? ' active' : '')} onClick={() => { setTab('sent'); setSelId(null); }}>已发出</div>
            <div className={'seg-tab' + (tab === 'draft' ? ' active' : '')} onClick={() => { setTab('draft'); setSelId(null); }}>草稿箱</div>
            <div className={'seg-tab' + (tab === 'archived' ? ' active' : '')} onClick={() => { setTab('archived'); setSelId(null); }}>归档</div>
          </div>
          <div className="dsk-mail-list">
            {cur.loading ? (
              <SkeletonList rows={4} />
            ) : cur.error ? (
              <ErrorState onRetry={cur.reload} />
            ) : list.length === 0 ? (
              <EmptyState icon={tab === 'draft' ? '✎' : tab === 'archived' ? '▤' : '✉'}
                title={tab === 'inbox' ? '还没有来信' : tab === 'sent' ? '还没有发出过信件' : tab === 'archived' ? '归档箱是空的' : '还没有草稿'}
                sub={tab === 'inbox' ? '去发现灵魂匹配吧' : tab === 'sent' ? '写下你的第一封信' : tab === 'archived' ? '在信里点「归档」可以把信收进这里' : '未写完的信会自动留在这里'} />
            ) : tab === 'draft' ? (
              list.map((d) => (
                <div key={d._id} className="dsk-mail-item">
                  <DraftCard draft={d} onClick={() => goWrite({ draft: d })} />
                </div>
              ))
            ) : (
              list.map((l) => (
                <div key={l._id} className={'dsk-mail-item' + (sel && sel._id === l._id ? ' active' : '')}>
                  <EnvelopeCard letter={l} sent={tab === 'sent'} onClick={() => setSelId(l._id)} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card dsk-reader">
          {!sel && (
            <div className="dsk-reader-empty">
              <div><span className="glyph">✉</span>从左侧选择一封信{tab === 'draft' ? '，或点击草稿继续书写' : ''}</div>
            </div>
          )}
          {sel && sealed && (
            <div className="dsk-sealed tab-fade" key={sel._id}>
              <div>
                <div className="dsk-sealed-env"><div className="dsk-sealed-seal">常</div></div>
                <div className="dsk-sealed-meta">来自 <b>{sel.senderNickname}</b> 的信 · {sel.word_count} 字 · {relativeTime(sel.created_at)}</div>
                <div className="btn btn-primary" onClick={openLetter}>拆 信</div>
              </div>
            </div>
          )}
          {sel && !sealed && (
            <div className="dsk-letter tab-fade" key={sel._id + '-open'}>
              <div className="dsk-letter-head">
                <Avatar name={tab === 'sent' ? sel.receiverNickname : sel.senderNickname} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="dsk-letter-title">{sel.title || '无标题'}</div>
                  <div className="dsk-letter-meta">
                    {tab === 'sent' ? '致 ' + sel.receiverNickname : '来自 ' + sel.senderNickname} · {sel.word_count} 字 · {relativeTime(sel.created_at)}
                  </div>
                </div>
                {tab === 'sent' && (
                  <span className={'status-chip ' + (sel.status === 'read' ? 'status-read' : 'status-sent')}>
                    {sel.status === 'read' ? '已读' : '已寄出'}
                  </span>
                )}
              </div>
              <div className="dsk-letter-body">{sel.content}</div>
              <div className="dsk-letter-actions">
                {(tab === 'inbox' || tab === 'archived') && <div className="btn btn-primary" onClick={() => goWrite({ replyTo: sel })}>回 信</div>}
                {tab === 'inbox' && <div className="btn btn-ghost" onClick={archive}>归档</div>}
                {tab === 'archived' && <div className="btn btn-ghost" onClick={unarchive}>取消归档</div>}
                {tab === 'sent' && <div className="btn btn-ghost" onClick={() => toast('对方回信后会出现在收件箱 ✦')}>再写一封</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
