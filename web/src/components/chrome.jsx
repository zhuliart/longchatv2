/* 移动端页面骨架（T5.3）：StatusBar / NavBar / TabBar / ComposeMenu */
import { useEffect, useState } from 'react';
import { pad2 } from '../utils/date.js';

/* 伪状态栏：保留原型 54px 顶部节奏；时间改为真实时钟（"9:41" 为设计稿痕迹） */
export function StatusBar({ dark }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={'statusbar' + (dark ? ' on-dark' : '')}>
      <span>{now.getHours()}:{pad2(now.getMinutes())}</span>
      <span className="sb-icons">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="6" width="3" height="5" rx="1"/><rect x="4.5" y="4" width="3" height="7" rx="1"/><rect x="9" y="2" width="3" height="9" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M8 2.2c2 0 3.8.8 5.2 2l1.1-1.2C12.6 1.3 10.4.4 8 .4S3.4 1.3 1.7 3l1.1 1.2C4.2 3 6 2.2 8 2.2z" opacity=".9"/><path d="M8 5.2c1.2 0 2.3.5 3.1 1.3l1.1-1.2C11.2 4.2 9.7 3.6 8 3.6s-3.2.6-4.2 1.7l1.1 1.2C5.7 5.7 6.8 5.2 8 5.2z"/><circle cx="8" cy="9" r="1.6"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="8" rx="1.5" fill="currentColor"/><rect x="23" y="4" width="1.5" height="4" rx="0.75" fill="currentColor" opacity=".5"/></svg>
      </span>
    </div>
  );
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
