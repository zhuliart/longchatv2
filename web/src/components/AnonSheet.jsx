/* 匿名信阅读面板（移动端）：全文 + 「回信」（私信落作者收件箱，仅公开回信人数）。 */
import { useNavigate } from 'react-router-dom';
import { relativeTime } from '../utils/date.js';

export function AnonSheet({ post, onClose }) {
  const navigate = useNavigate();
  return (
    <>
      <div className="sheet-mask" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-header">
          <span className="sheet-title">◐ 匿名笔友{post.isMine ? '（我）' : ''}</span>
          <span className="sheet-close" onClick={onClose}>✕</span>
        </div>
        <div className="sheet-scroll">
          {post.title && <div className="anon-read-title">{post.title}</div>}
          <div className="anon-read-body">{post.content}</div>
          <div className="anon-read-meta">
            {relativeTime(post.created_at)} · {post.word_count} 字 · ✉ {post.replyCount || 0} 人回信
            {post.isMine ? '（会送进你的收件箱）' : ''}
          </div>
        </div>
        {!post.isMine && (
          <div className="comment-input-area">
            <div className="btn btn-primary" style={{ width: '100%' }}
              onClick={() => { onClose(); navigate('/write', { state: { anonReply: { id: post._id, title: post.title } } }); }}>
              写一封回信（对方看得到你是谁，但TA仍保持匿名）
            </div>
          </div>
        )}
      </div>
    </>
  );
}
