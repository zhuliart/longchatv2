/* 灵魂推荐（T5.4 / T6.2 #6、T6.3 跳过）：每日推荐卡（契合分/共同标签高亮/跳过）；用完出空态。
   数据 GET /matches/daily（额度用完服务端 1004 → 空数组）；跳过 POST /matches/:uid/skip 后本地即时移除。 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar, NavBar } from '../components/chrome.jsx';
import { SoulCard } from '../components/cards.jsx';
import { SkeletonList, ErrorState } from '../components/states.jsx';
import { matchesApi, useResource } from '../api/index.js';

export function MatchScreen() {
  const navigate = useNavigate();
  const { data, loading, error, reload, setData } = useResource(() => matchesApi.getDailyRecommend(), []);
  const [skipping, setSkipping] = useState(null);
  const list = data || [];

  async function skip(m) {
    if (skipping) return;
    setSkipping(m._id);
    // 本地即时移除卡片，后台落库；失败也不回滚（幂等，明日重算）
    setData((arr) => (arr || []).filter((x) => x._id !== m._id));
    try {
      await matchesApi.skipUser(m.profile._id);
    } catch {
      /* 网络异常已由 client 层 toast */
    } finally {
      setSkipping(null);
    }
  }

  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title="灵魂推荐" onBack={() => navigate(-1)} />
      <div className="page-scroll" style={{ paddingBottom: 24 }}>
        <div className="home-header" style={{ paddingTop: 18 }}>
          <div className="home-title" style={{ fontSize: 24, letterSpacing: '.12em' }}>今日灵魂推荐</div>
          <div className="home-tagline" style={{ marginTop: 8 }}>每日更新，真诚相遇</div>
        </div>
        {loading ? (
          <div style={{ padding: '0 16px' }}><SkeletonList rows={3} /></div>
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : list.length > 0 ? list.map((m) => (
          <div className="rec-item" key={m._id}>
            <SoulCard item={m} onClick={() => navigate(`/peer/${m.profile._id}`)} />
            <div className="rec-actions">
              <div className="btn btn-ghost" onClick={() => skip(m)}>跳过</div>
              <div className="btn btn-primary" onClick={() => navigate('/write', { state: { targetUid: m.profile._id, targetNickname: m.profile.nickname, isFirst: true } })}>写信给TA</div>
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
