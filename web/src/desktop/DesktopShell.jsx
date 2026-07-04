/* 桌面壳层（T5.5）：侧栏 232px（logo + ✎主按钮 + 四导航（信箱未读角标）+ 底部用户切片）
   + 内容区 max-width 1180；断点 <1160 侧栏收成 74px 图标栏（desktop.css）。 */
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/primitives.jsx';
import { lettersApi, useResource } from '../api/index.js';
import { useUser } from '../store/user.jsx';

const DSK_NAV = [
  { key: 'home', path: '/', label: '此刻', glyph: '✶' },
  { key: 'inbox', path: '/inbox', label: '信箱', glyph: '✉' },
  { key: 'journey', path: '/journey', label: '旅程', glyph: '❍' },
  { key: 'me', path: '/me', label: '我的', glyph: '❖' },
];

export function DSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { me } = useUser();
  // 未读角标：取收件箱首页未读（status==='sent'）计数（轻量，随壳层挂载刷新）
  const { data: inbox } = useResource(() => lettersApi.getInbox(0), []);
  const unread = (inbox || []).filter((l) => l.status === 'sent').length;
  return (
    <aside className="dsk-side">
      <div className="dsk-brand">
        <div className="dsk-brand-seal">常</div>
        <div className="dsk-brand-text">
          <div className="dsk-brand-name">平常</div>
          <div className="dsk-brand-sub">写信 · 记情绪 · 慢慢遇见</div>
        </div>
      </div>
      <div className="dsk-write-btn">
        <div className="btn btn-primary" onClick={() => navigate('/write')}>✎ <span className="lbl">写一封信</span></div>
      </div>
      {DSK_NAV.map((n) => (
        <div key={n.key} className={'dsk-nav-item' + (pathname === n.path ? ' active' : '')} onClick={() => navigate(n.path)}>
          <span className="dsk-nav-glyph">{n.glyph}</span>
          <span className="lbl">{n.label}</span>
          {n.key === 'inbox' && unread > 0 && <span className="dsk-nav-badge">{unread}</span>}
        </div>
      ))}
      <div className="dsk-side-foot">
        <div className="dsk-user-chip" onClick={() => navigate('/me')}>
          <Avatar name={me?.nickname || '·'} />
          <div className="dsk-user-text">
            <div className="dsk-user-name">{me?.nickname || '…'}</div>
            <div className="dsk-user-sub">{me?.is_member ? '会员用户' : '普通用户'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function DesktopShell() {
  return (
    <>
      <DSidebar />
      <main className="dsk-main"><Outlet /></main>
    </>
  );
}
