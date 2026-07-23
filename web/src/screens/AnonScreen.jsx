/* 匿名信区独立页（移动端，/anon）：全部匿名信 + 阅读面板（回应）+ 写一封。
   发信匿名、回应实名、全员可看。 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar, NavBar } from '../components/chrome.jsx';
import { AnonSheet } from '../components/AnonSheet.jsx';
import { SkeletonList, ErrorState, EmptyState } from '../components/states.jsx';
import { anonApi, useResource } from '../api/index.js';
import { relativeTime } from '../utils/date.js';

const PAGE_SIZE = 10;

export function AnonScreen() {
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [end, setEnd] = useState(false);
  const first = useResource(async () => {
    const data = await anonApi.getAnonLetters(0);
    setPages([data]);
    setEnd(data.length < PAGE_SIZE);
    return data;
  }, []);
  const [open, setOpen] = useState(null);
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
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title="匿名信区" onBack={() => navigate(-1)} />
      <div className="page-scroll" style={{ padding: '12px 16px 24px' }}>
        <div className="anon-page-sub">没有署名的心里话 —— 发信匿名，回应实名，谁都可以读</div>
        {first.loading ? (
          <SkeletonList rows={3} />
        ) : first.error ? (
          <ErrorState onRetry={first.reload} />
        ) : posts.length === 0 ? (
          <EmptyState icon="◐" title="信区还空着" sub="第一封没有署名的心里话，由你来写吧"
            actionLabel="写一封匿名信" onAction={goWrite} style={{ paddingTop: 60 }} />
        ) : (
          <>
            {posts.map((post) => (
              <div key={post._id} className="card feed-card" onClick={() => setOpen(post)}>
                <div className="feed-card-header">
                  <div>
                    <span className="feed-author-name">◐ 匿名笔友{post.isMine ? '（我）' : ''}</span>
                    <span className="feed-date">{relativeTime(post.created_at)}</span>
                  </div>
                </div>
                {post.title && <div className="anon-card-title">{post.title}</div>}
                <div className="feed-diary text-clamp-3">{post.content}</div>
                <div className="feed-footer">
                  <span className="comment-btn">💬 {post.commentCount} 回应</span>
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
              {end
                ? <span style={{ color: 'var(--color-ink-secondary)', fontSize: 12, fontFamily: 'var(--font-serif)' }}>— 已到底部 —</span>
                : <div className="btn btn-ghost" onClick={loadMore}>{loadingMore ? '加载中…' : '看更多'}</div>}
            </div>
          </>
        )}
      </div>
      <button className="fab" onClick={goWrite} aria-label="写一封匿名信">✎</button>
      {open && (
        <AnonSheet post={open} onClose={() => setOpen(null)}
          onPosted={(count) => bump(open._id, count)} />
      )}
    </div>
  );
}
