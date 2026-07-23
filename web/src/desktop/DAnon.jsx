/* 桌面匿名信区独立页（侧栏 🎭 入口）：全部匿名信瀑布流 + 展开回应 + 写一封。
   发信匿名、回应实名、全员可看。GET/POST /anon/*。 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { anonApi, useResource, ApiError } from '../api/index.js';
import { relativeTime } from '../utils/date.js';
import { useUI } from '../store/ui.jsx';
import { SkeletonList, ErrorState, EmptyState } from '../components/states.jsx';

const PAGE_SIZE = 10;

/* 单封匿名信（含展开回应）；DHome 首页小卡复用 */
export function DAnonItem({ post, open, onToggle, onPosted }) {
  const { toast } = useUI();
  const comments = useResource(() => (open ? anonApi.getAnonComments(post._id, 0) : Promise.resolve([])), [open, post._id]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const list = comments.data || [];

  async function send() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await anonApi.commentOnAnon(post._id, { content });
      setInput('');
      comments.reload();
      if (res?.commentCount != null) onPosted(res.commentCount);
      toast('回应已送达 ✦');
    } catch (err) {
      if (err instanceof ApiError && (err.code === 1001 || err.code === 1002)) toast(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="dsk-anon-item">
      <div className="dsk-anon-head">
        <span className="dsk-anon-mask">🎭</span>
        <span className="dsk-anon-name">匿名笔友{post.isMine ? '（我）' : ''}</span>
        <span className="dsk-anon-time">{relativeTime(post.created_at)}</span>
      </div>
      {post.title && <div className="dsk-anon-title">{post.title}</div>}
      <div className={'dsk-anon-body' + (open ? '' : ' text-clamp-3')}>{post.content}</div>
      <div className="dsk-anon-foot" onClick={onToggle}>💬 {post.commentCount} 条回应 {open ? '收起' : '展开'}</div>
      {open && (
        <div className="dsk-plaza-comments tab-fade">
          {comments.loading ? (
            <div className="dsk-comment" style={{ color: 'var(--color-ink-secondary)' }}>加载中…</div>
          ) : list.length === 0 ? (
            <div className="dsk-comment" style={{ color: 'var(--color-ink-secondary)' }}>还没有回应，说点什么吧</div>
          ) : list.map((c) => (
            <div key={c._id} className={'dsk-comment' + (c.parent_id ? ' is-reply' : '')}>
              <b>{c.fromNickname}</b>：{c.content}
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-ink-secondary)' }}>{relativeTime(c.created_at)}</span>
            </div>
          ))}
          <div className="dsk-comment-row">
            <input placeholder="温柔地回应…" value={input} maxLength={200}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()} />
            <div className="comment-send" onClick={send}>{sending ? '发送中…' : '发送'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DAnon() {
  const navigate = useNavigate();
  const [pages, setPages] = useState([]); // 已加载各页
  const [loadingMore, setLoadingMore] = useState(false);
  const [end, setEnd] = useState(false);
  const first = useResource(async () => {
    const data = await anonApi.getAnonLetters(0);
    setPages([data]);
    setEnd(data.length < PAGE_SIZE);
    return data;
  }, []);
  const [openId, setOpenId] = useState(null);
  const posts = pages.flat();

  async function loadMore() {
    if (loadingMore || end) return;
    setLoadingMore(true);
    try {
      const next = await anonApi.getAnonLetters(pages.length);
      setPages((p) => [...p, ...(next.length ? [next] : [])]);
      if (next.length < PAGE_SIZE) setEnd(true);
    } catch {
      /* 网络异常已由 client 层 toast */
    } finally {
      setLoadingMore(false);
    }
  }

  function bump(id, count) {
    setPages((ps) => ps.map((page) => page.map((x) => (x._id === id ? { ...x, commentCount: count } : x))));
  }

  const goWrite = () => navigate('/write', { state: { board: true } });

  return (
    <div className="dsk-page">
      <div className="dsk-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="dsk-title">🎭 匿名信区</div>
          <div className="dsk-sub">没有署名的心里话 —— 发信匿名，回应实名，谁都可以读</div>
        </div>
        <div className="btn btn-primary" onClick={goWrite}>✎ 写一封匿名信</div>
      </div>

      {first.loading ? (
        <SkeletonList rows={4} />
      ) : first.error ? (
        <ErrorState onRetry={first.reload} />
      ) : posts.length === 0 ? (
        <EmptyState icon="🎭" title="信区还空着"
          sub="第一封没有署名的心里话，由你来写吧"
          actionLabel="写一封匿名信" onAction={goWrite} style={{ paddingTop: 70 }} />
      ) : (
        <>
          <div className="dsk-anon-grid">
            {posts.map((post) => (
              <div key={post._id} className="card dsk-anon-card">
                <DAnonItem post={post} open={openId === post._id}
                  onToggle={() => setOpenId(openId === post._id ? null : post._id)}
                  onPosted={(c) => bump(post._id, c)} />
              </div>
            ))}
          </div>
          <div className="dsk-anon-more">
            {end ? <span className="dim">— 已到底部 —</span>
              : <div className="btn btn-ghost" onClick={loadMore}>{loadingMore ? '加载中…' : '看更多'}</div>}
          </div>
        </>
      )}
    </div>
  );
}
