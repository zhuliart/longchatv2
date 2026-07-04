/* 边界状态组件（T6.5）：加载骨架（默认 3 条）/ 取信 spinner / 加载失败重试 / 空态。
   全站列表与详情统一复用，保证断网·慢网·业务错误路径观感一致。 */

export function SkeletonList({ rows = 3 }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="加载中">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-avatar" />
          <div className="skeleton-lines">
            <span className="skeleton-line w60" />
            <span className="skeleton-line w90" />
            <span className="skeleton-line w40" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* 「正在取信…」等场景的圆形 spinner */
export function Spinner({ label = '正在取信…' }) {
  return (
    <div className="spinner-state">
      <span className="spinner-ring" />
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
}

/* 加载失败：文案 + 重试按钮（网络异常已由 client 层 toast，这里给就地重试入口） */
export function ErrorState({ message = '加载失败了', onRetry }) {
  return (
    <div className="load-error">
      <span className="load-error-icon">···</span>
      <span className="load-error-msg">{message}</span>
      {onRetry && (
        <button className="btn btn-ghost load-error-retry" onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  );
}

/* 通用空态（图标 + 主文案 + 副文案，可选行动按钮） */
export function EmptyState({ icon = '✉', title, sub, actionLabel, onAction, style }) {
  return (
    <div className="empty-state" style={style}>
      <span className="empty-icon">{icon}</span>
      {title && <span>{title}</span>}
      {sub && <span className="empty-sub">{sub}</span>}
      {actionLabel && onAction && (
        <button className="btn btn-primary empty-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
