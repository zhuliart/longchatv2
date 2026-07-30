/* 桌面匿名信区独立页（侧栏 🎭 入口）：全部匿名信瀑布流 + 展开回应 + 写一封。
   发信匿名、回应实名、全员可看。GET/POST /anon/*。 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { anonApi, useResource } from '../api/index.js';
import { relativeTime } from '../utils/date.js';
import { SkeletonList, ErrorState, EmptyState } from '../components/states.jsx';

const PAGE_SIZE = 10;

/* 单封匿名信：只公开回信人数；「回信」走私信落作者收件箱。DHome 首页小卡复用 */
export function DAnonItem({ post }) {
  const navigate = useNavigate();
  return (
    <div className="dsk-anon-item">
      <div className="dsk-anon-head">
        <span className="dsk-anon-mask">◐</span>
        <span className="dsk-anon-name">匿名笔友{post.isMine ? '（我）' : ''}</span>
        <span className="dsk-anon-time">{relativeTime(post.created_at)}</span>
      </div>
      {post.title && <div className="dsk-anon-title">{post.title}</div>}
      <div className="dsk-anon-body">{post.content}</div>
      <div className="dsk-anon-foot-row">
        <span className="dsk-anon-count">✉ {post.replyCount || 0} 人回信{post.isMine ? '（会送进你的收件箱）' : ''}</span>
        {!post.isMine && (
          <span className="dsk-anon-reply"
            onClick={() => navigate('/write', { state: { anonReply: { id: post._id, title: post.title } } })}>
            回 信 ›
          </span>
        )}
      </div>
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

  const goWrite = () => navigate('/write', { state: { board: true } });

  return (
    <div className="dsk-page">
      <div className="dsk-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="dsk-title">匿名信区</div>
          <div className="dsk-sub">没有署名的心里话 —— 谁都可以读；回信不公开，会送进作者的收件箱</div>
        </div>
        <div className="btn btn-primary" onClick={goWrite}>✎ 写一封匿名信</div>
      </div>

      {first.loading ? (
        <SkeletonList rows={4} />
      ) : first.error ? (
        <ErrorState onRetry={first.reload} />
      ) : posts.length === 0 ? (
        <EmptyState icon="◐" title="信区还空着"
          sub="第一封没有署名的心里话，由你来写吧"
          actionLabel="写一封匿名信" onAction={goWrite} style={{ paddingTop: 70 }} />
      ) : (
        <>
          <div className="dsk-anon-grid">
            {posts.map((post) => (
              <div key={post._id} className="card dsk-anon-card">
                <DAnonItem post={post} />
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
