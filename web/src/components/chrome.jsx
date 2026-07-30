/* 移动端页面骨架（T5.3）：StatusBar / NavBar / TabBar / ComposeMenu */

/* 顶部留白（原「伪状态栏」已移除：真机自带时间/电量，避免重复；仅留呼吸空隙） */
export function StatusBar() {
  return <div className="statusbar-space" aria-hidden="true" />;
}

export function NavBar({ title, onBack }) {
  return (
    <div className="navbar">
      <button className="nav-back" onClick={onBack}>‹<span>返回</span></button>
      <div className="navbar-title">{title}</div>
    </div>
  );
}

export const TABS = [
  { key: 'home', label: '此刻', glyph: '❀' },
  { key: 'inbox', label: '信箱', glyph: '✉' },
  { key: 'journey', label: '旅程', glyph: '❍' },
  { key: 'me', label: '我的', glyph: '❖' },
];

export function TabBar({ active, onChange, onCompose, composeOpen }) {
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);
  return (
    <div className="tabbar">
      <svg className="tabbar-bg" viewBox="0 0 393 72" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,0 L393,0 L393,72 L0,72 Z" />
      </svg>
      <div className="tabbar-row">
        {left.map((t) => (
          <button key={t.key} className={'tabbar-item' + (active === t.key ? ' active' : '')} onClick={() => onChange(t.key)}>
            <span className="glyph">{t.glyph}</span>
            <span>{t.label}</span>
          </button>
        ))}
        <button className={'tabbar-item tabbar-center-item' + (composeOpen ? ' is-open' : '')} onClick={onCompose}>
          <span className="center-glyph">{composeOpen ? '✕' : '✎'}</span>
          <span>{composeOpen ? '收起' : '写信'}</span>
        </button>
        {right.map((t) => (
          <button key={t.key} className={'tabbar-item' + (active === t.key ? ' active' : '')} onClick={() => onChange(t.key)}>
            <span className="glyph">{t.glyph}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* 中键展开的放射菜单 */
export function ComposeMenu({ open, onClose, onPick }) {
  const actions = [
    { key: 'mood', icon: '✶', label: '记心情', pos: 'pos-q1', go: () => onPick('home') },
    { key: 'draft', icon: '❏', label: '草稿箱', pos: 'pos-q2', go: () => onPick('inbox', { tab: 'draft' }) },
    { key: 'write', icon: '✎', label: '写信', pos: 'pos-q3', primary: true, go: () => onPick('write', { isFirst: true }) },
    { key: 'plaza', icon: '✿', label: '心情广场', pos: 'pos-q4', go: () => onPick('journey', { tab: 'feed' }) },
    { key: 'match', icon: '☾', label: '找笔友', pos: 'pos-q5', go: () => onPick('match') },
  ];
  return (
    <div className={'compose-overlay' + (open ? ' open' : '')} aria-hidden={!open}>
      <div className="compose-backdrop" onClick={onClose} />
      <div className="compose-title">想做些什么<small>慢慢来，不必着急</small></div>
      {actions.map((a) => (
        <div key={a.key} className={'compose-action ' + a.pos + (a.primary ? ' primary' : '')}>
          <button className="compose-bubble" onClick={a.go}>{a.icon}</button>
          <span className="compose-clabel">{a.label}</span>
        </div>
      ))}
    </div>
  );
}
