/* 卡片组件（T5.3）：SoulCard / EnvelopeCard（未读红点+左侧色条）/ DraftCard */
import { Avatar } from './primitives.jsx';

export function scoreColor(s) {
  if (s >= 85) return 'var(--m-happy)';
  if (s >= 75) return 'var(--color-accent)';
  return 'var(--color-gold)';
}

export function SoulCard({ item, mini, onClick }) {
  const p = item.profile;
  return (
    <div className={'soul-card' + (mini ? ' mini' : '')} onClick={onClick}>
      <div className="soul-card-top">
        <Avatar name={p.nickname} />
        <div style={{ minWidth: 0 }}>
          <div className="soul-name">{p.nickname}</div>
          {p.isActiveRecently && <span style={{ fontSize: 11, color: 'var(--m-calm)' }}>· 近期活跃</span>}
        </div>
        <div className="soul-score" style={{ color: scoreColor(item.score) }}>
          <div><span className="num">{item.score}</span><span className="pct">%</span></div>
          <span className="lbl">契合</span>
        </div>
      </div>
      <div className="soul-intro text-clamp-2">{p.intro}</div>
      <div className="soul-tags">
        {p.tags.slice(0, mini ? 3 : 5).map((t) => (
          <span key={t} className={'tag' + (item.tagsCommon.includes(t) ? ' tag-common' : '')}>{t}</span>
        ))}
      </div>
    </div>
  );
}

export function EnvelopeCard({ letter, sent, onClick }) {
  const name = sent ? letter.receiverNickname : letter.senderNickname;
  const unread = !sent && letter.status === 'sent';
  return (
    <div className="envelope-card" onClick={onClick}>
      {unread && <span className="unread-dot" />}
      <Avatar name={name} />
      <div className="envelope-body">
        <div className="envelope-row">
          <span className="envelope-name">{sent ? '致 ' + name : name}</span>
          <span className="envelope-time">{letter.timeDisplay}</span>
        </div>
        {letter.title && <div className="envelope-subject text-clamp-2">{letter.title}</div>}
        <div className="envelope-excerpt text-clamp-2">{letter.excerpt}</div>
        <div className="envelope-meta">
          <span className="envelope-words">{letter.word_count} 字</span>
          {unread && <span className="date-pill new">未读</span>}
          {sent && (
            <span className={'status-chip ' + (letter.status === 'read' ? 'status-read' : 'status-sent')}>
              {letter.status === 'read' ? '已读' : '已寄出'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function DraftCard({ draft, onClick, onDelete }) {
  const hasRecipient = !!draft.receiverNickname;
  const remaining = Math.max(0, (draft.required || 0) - draft.word_count);
  return (
    <div className="envelope-card draft-card" onClick={onClick}>
      <Avatar name={hasRecipient ? draft.receiverNickname : '…'} />
      <div className="envelope-body">
        <div className="envelope-row">
          <span className="envelope-name">{hasRecipient ? '致 ' + draft.receiverNickname : '未指定收信人'}</span>
          <span className="envelope-time">{draft.timeDisplay}</span>
        </div>
        {draft.title
          ? <div className="envelope-subject text-clamp-2">{draft.title}</div>
          : <div className="envelope-subject draft-untitled">无标题草稿</div>}
        <div className="envelope-excerpt text-clamp-2">{draft.excerpt}</div>
        <div className="envelope-meta">
          <span className="envelope-words">{draft.word_count} 字</span>
          <span className="status-chip status-draft">草稿</span>
          {remaining > 0 && <span className="draft-remaining">还差 {remaining} 字</span>}
          <span className="draft-continue">继续写 ›</span>
        </div>
      </div>
      <button className="draft-del" onClick={(e) => { e.stopPropagation(); onDelete && onDelete(draft._id); }} aria-label="删除草稿">✕</button>
    </div>
  );
}
