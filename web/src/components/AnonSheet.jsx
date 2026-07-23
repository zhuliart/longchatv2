/* 匿名信阅读面板（移动端）：全文 + 回应列表 + 回应输入。发信匿名、回应实名。 */
import { useState } from 'react';
import { anonApi, useResource, ApiError } from '../api/index.js';
import { relativeTime } from '../utils/date.js';
import { useUI } from '../store/ui.jsx';
import { SkeletonList, ErrorState } from './states.jsx';

export function AnonSheet({ post, onClose, onPosted }) {
  const { toast } = useUI();
  const comments = useResource(() => anonApi.getAnonComments(post._id, 0), [post._id]);
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
      if (onPosted && res?.commentCount != null) onPosted(res.commentCount);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 1001 || err.code === 1002)) toast(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="sheet-mask" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-header">
          <span className="sheet-title">🎭 匿名笔友{post.isMine ? '（我）' : ''}</span>
          <span className="sheet-close" onClick={onClose}>✕</span>
        </div>
        <div className="sheet-scroll">
          {post.title && <div className="anon-read-title">{post.title}</div>}
          <div className="anon-read-body">{post.content}</div>
          <div className="anon-read-meta">{relativeTime(post.created_at)} · {post.word_count} 字</div>
          <div className="inspire-divider"><span>回应</span></div>
          {comments.loading ? (
            <SkeletonList rows={2} />
          ) : comments.error ? (
            <ErrorState onRetry={comments.reload} />
          ) : list.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-ink-secondary)', padding: '20px 0', fontFamily: 'var(--font-serif)' }}>还没有回应，说点什么吧</div>
          ) : list.map((c) => (
            <div key={c._id} className={'comment-item' + (c.parent_id ? ' reply' : '')}>
              <div className="comment-head">
                <span className="comment-author">{c.fromNickname}</span>
                <span className="comment-time">{relativeTime(c.created_at)}</span>
              </div>
              <div className="comment-content">{c.content}</div>
            </div>
          ))}
        </div>
        <div className="comment-input-area">
          <div className="comment-input-row">
            <input className="comment-input" placeholder="温柔地回应..." value={input} maxLength={200}
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <div className="comment-send" onClick={send}>{sending ? '发送中…' : '发送'}</div>
          </div>
        </div>
      </div>
    </>
  );
}
