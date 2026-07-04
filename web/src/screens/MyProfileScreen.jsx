/* 我的（T5.4 / T6.2 #1#2）：头像昵称介绍 + 统计三格 + 菜单（含退出登录）+ 会员卡片。
   资料与统计来自 GET /users/me（user store），退出登录接 POST /auth/logout。 */
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../components/chrome.jsx';
import { Avatar } from '../components/primitives.jsx';
import { SkeletonList } from '../components/states.jsx';
import { useAuth } from '../store/auth.jsx';
import { useUser } from '../store/user.jsx';

export function MyProfileScreen() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { me } = useUser();
  return (
    <div className="page">
      <StatusBar />
      <div className="page-scroll tab-fade" style={{ paddingBottom: 24 }}>
        {!me ? (
          <div style={{ padding: '16px' }}><SkeletonList rows={3} /></div>
        ) : (
          <>
        <div className="my-header">
          <Avatar name={me.nickname} />
          <div className="my-info">
            <div className="my-name">{me.nickname}</div>
            <div className="my-intro text-clamp-2">{me.intro}</div>
          </div>
          <div className="mood-edit-btn" onClick={() => navigate('/edit')}>编辑</div>
        </div>
        <div className="my-tags">{me.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>

        <div className="card stats-section">
          <div className="stat-item" onClick={() => navigate('/inbox?tab=sent')}><span className="stat-num">{me.lettersSent}</span><span className="stat-label">已发出</span></div>
          <div className="stat-divider" />
          <div className="stat-item" onClick={() => navigate('/inbox')}><span className="stat-num">{me.lettersReceived}</span><span className="stat-label">已收到</span></div>
          <div className="stat-divider" />
          <div className="stat-item" onClick={() => navigate('/journey')}><span className="stat-num">{me.moodDays}</span><span className="stat-label">记录天数</span></div>
        </div>

        <div className="card menu-section">
          <div className="menu-item" onClick={() => navigate('/inbox?tab=sent')}><span className="menu-icon">✉</span><span className="menu-label">已发出的信</span><span className="menu-arrow">›</span></div>
          <div className="menu-item" onClick={() => navigate('/journey')}><span className="menu-icon">❍</span><span className="menu-label">情绪旅程</span><span className="menu-arrow">›</span></div>
          <div className="menu-item" onClick={() => navigate('/edit')}><span className="menu-icon">✎</span><span className="menu-label">编辑资料</span><span className="menu-arrow">›</span></div>
          <div className="menu-item" onClick={() => navigate('/onboarding')}><span className="menu-icon">✦</span><span className="menu-label">重看注册引导</span><span className="menu-arrow">›</span></div>
          <div className="menu-item menu-danger" onClick={logout}><span className="menu-icon">⇠</span><span className="menu-label">退出登录</span><span className="menu-arrow">›</span></div>
        </div>

        <div className="card member-section">
          <div>
            <div className="member-title">{me.is_member ? '会员用户' : '普通用户'}</div>
            <div className="member-sub">{me.is_member ? '每日 5 位灵魂推荐' : '每日 3 位灵魂推荐'}</div>
          </div>
          {!me.is_member && <div className="member-upgrade">升级会员</div>}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
