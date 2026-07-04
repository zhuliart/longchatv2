/* 对方主页（T5.4 / T6.3 查看对方主页）：介绍/标签（与我共同的标签高亮）/最近写道 → 写信。
   数据 GET /users/:uid/profile；共同标签由我的标签（user store）与对方标签求交派生。 */
import { useNavigate, useParams } from 'react-router-dom';
import { StatusBar, NavBar } from '../components/chrome.jsx';
import { Avatar } from '../components/primitives.jsx';
import { SkeletonList, ErrorState } from '../components/states.jsx';
import { usersApi, useResource } from '../api/index.js';
import { useUser } from '../store/user.jsx';

export function PeerProfileScreen() {
  const navigate = useNavigate();
  const { uid } = useParams();
  const { me } = useUser();
  const { data: p, loading, error, reload } = useResource(() => usersApi.getProfile(uid), [uid]);
  const back = () => navigate(-1);
  const myTags = me?.tags || [];

  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title="TA 的主页" onBack={back} />
      {loading ? (
        <div className="page-scroll" style={{ padding: 16 }}><SkeletonList rows={3} /></div>
      ) : error || !p ? (
        <div className="page-scroll"><ErrorState message="没能打开 TA 的主页" onRetry={reload} /></div>
      ) : (
        <>
          <div className="page-scroll">
            <div className="profile-header peer">
              <Avatar name={p.nickname} />
              <div className="profile-name">{p.nickname}</div>
              {p.isActiveRecently && <span className="active-badge">近期活跃</span>}
            </div>
            <div className="section">
              <div className="card">
                <span className="section-label">兴趣标签</span>
                <div className="tags-wrap">
                  {p.tags.map((t) => <span key={t} className={'tag' + (myTags.includes(t) ? ' tag-common' : '')}>{t}</span>)}
                </div>
              </div>
            </div>
            <div className="section">
              <div className="card">
                <span className="section-label">关于 TA</span>
                <div className="intro-text">{p.intro}</div>
              </div>
            </div>
            {p.recentExcerpt && (
              <div className="section">
                <div className="card">
                  <span className="section-label">最近写道</span>
                  <div className="excerpt-text">“{p.recentExcerpt}”</div>
                  <span className="excerpt-note">（节选自最近一次公开心情）</span>
                </div>
              </div>
            )}
            <div className="section" style={{ marginBottom: 16 }}>
              <div className="card">
                <div className="pref-row"><span className="pref-label">活跃时段</span><span className="pref-value">{p.activeTimeLabel}</span></div>
                <div className="pref-row"><span className="pref-label">书信频率</span><span className="pref-value">{p.letterFreqLabel}</span></div>
              </div>
            </div>
          </div>
          <div className="action-bar">
            <div className="btn btn-ghost" onClick={back}>返回</div>
            <div className="btn btn-primary" onClick={() => navigate('/write', { state: { targetUid: p._id, targetNickname: p.nickname, isFirst: true } })}>写信给TA</div>
          </div>
        </>
      )}
    </div>
  );
}
