/* 对方主页（T5.4）：介绍/标签（共同标签高亮）/最近写道 → 写信 */
import { useNavigate, useParams } from 'react-router-dom';
import { StatusBar, NavBar } from '../components/chrome.jsx';
import { Avatar } from '../components/primitives.jsx';
import { ACTIVE_TIME_LABEL, LETTER_FREQ_LABEL } from '../constants/index.js';
import { MATCHES } from '../mocks/index.js';

export function PeerProfileScreen() {
  const navigate = useNavigate();
  const { uid } = useParams();
  const match = MATCHES.find((m) => m.profile._id === uid) || MATCHES[0];
  const p = match.profile;
  const back = () => navigate(-1);
  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title="TA 的主页" onBack={back} />
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
              {p.tags.map((t) => <span key={t} className={'tag' + (match.tagsCommon.includes(t) ? ' tag-common' : '')}>{t}</span>)}
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
              <span className="excerpt-note">（节选自最近一封信）</span>
            </div>
          </div>
        )}
        <div className="section" style={{ marginBottom: 16 }}>
          <div className="card">
            <div className="pref-row"><span className="pref-label">活跃时段</span><span className="pref-value">{ACTIVE_TIME_LABEL[p.active_time]}</span></div>
            <div className="pref-row"><span className="pref-label">书信频率</span><span className="pref-value">{LETTER_FREQ_LABEL[p.letter_freq]}</span></div>
          </div>
        </div>
      </div>
      <div className="action-bar">
        <div className="btn btn-ghost" onClick={back}>跳过</div>
        <div className="btn btn-primary" onClick={() => navigate('/write', { state: { targetNickname: p.nickname, isFirst: true } })}>写信给TA</div>
      </div>
    </div>
  );
}
