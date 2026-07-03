/* 灵魂推荐（T5.4）：每日推荐卡（契合分/共同标签高亮/跳过）；用完出空态 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar, NavBar } from '../components/chrome.jsx';
import { SoulCard } from '../components/cards.jsx';
import { MATCHES } from '../mocks/index.js';

export function MatchScreen() {
  const navigate = useNavigate();
  const [list, setList] = useState(MATCHES);
  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title="灵魂推荐" onBack={() => navigate(-1)} />
      <div className="page-scroll" style={{ paddingBottom: 24 }}>
        <div className="home-header" style={{ paddingTop: 18 }}>
          <div className="home-title" style={{ fontSize: 24, letterSpacing: '.12em' }}>今日灵魂推荐</div>
          <div className="home-tagline" style={{ marginTop: 8 }}>每日更新，真诚相遇</div>
        </div>
        {list.length > 0 ? list.map((m) => (
          <div className="rec-item" key={m._id}>
            <SoulCard item={m} onClick={() => navigate(`/peer/${m.profile._id}`)} />
            <div className="rec-actions">
              {/* M6 接通 POST /matches/:targetUid/skip（本地即时移除卡片） */}
              <div className="btn btn-ghost" onClick={() => setList(list.filter((x) => x._id !== m._id))}>跳过</div>
              <div className="btn btn-primary" onClick={() => navigate('/write', { state: { targetNickname: m.profile.nickname, isFirst: true } })}>写信给TA</div>
            </div>
          </div>
        )) : (
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <span className="empty-icon">☽</span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--color-ink)' }}>今天的推荐已看完</span>
            <span className="empty-sub">明天还会有新的灵魂与你相遇</span>
          </div>
        )}
      </div>
    </div>
  );
}
