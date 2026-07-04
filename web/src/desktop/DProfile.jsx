/* 桌面我的（T5.5 / T6.2 #1#2）：资料 + 统计三格 + 会员卡片 + 退出登录。
   资料统计来自 GET /users/me（user store），退出登录接 POST /auth/logout。 */
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/primitives.jsx';
import { SkeletonList } from '../components/states.jsx';
import { useAuth } from '../store/auth.jsx';
import { useUser } from '../store/user.jsx';
import { useUI } from '../store/ui.jsx';

export function DProfile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { me } = useUser();
  const { toast } = useUI();
  if (!me) {
    return (
      <div className="dsk-page dsk-me">
        <div className="dsk-head"><div className="dsk-title">我的</div></div>
        <SkeletonList rows={3} />
      </div>
    );
  }
  return (
    <div className="dsk-page dsk-me">
      <div className="dsk-head">
        <div className="dsk-title">我的</div>
      </div>
      <div className="my-header">
        <Avatar name={me.nickname} />
        <div className="my-info">
          <div className="my-name">{me.nickname}</div>
          <div className="my-intro">{me.intro}</div>
        </div>
        <div className="mood-edit-btn" onClick={() => toast('编辑资料见移动端版式 ✎')}>编辑</div>
      </div>
      <div className="my-tags">{me.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>

      <div className="card stats-section">
        <div className="stat-item" onClick={() => navigate('/inbox?tab=sent')}><span className="stat-num">{me.lettersSent}</span><span className="stat-label">已发出</span></div>
        <div className="stat-divider" />
        <div className="stat-item" onClick={() => navigate('/inbox')}><span className="stat-num">{me.lettersReceived}</span><span className="stat-label">已收到</span></div>
        <div className="stat-divider" />
        <div className="stat-item" onClick={() => navigate('/journey')}><span className="stat-num">{me.moodDays}</span><span className="stat-label">记录天数</span></div>
      </div>

      <div className="card member-section">
        <div>
          <div className="member-title">{me.is_member ? '会员用户' : '普通用户'}</div>
          <div className="member-sub">{me.is_member ? '每日 5 位灵魂推荐' : '每日 3 位灵魂推荐'}</div>
        </div>
        {!me.is_member && <div className="member-upgrade" onClick={() => toast('会员详情敬请期待 ✦')}>升级会员</div>}
      </div>

      <div className="card menu-section">
        <div className="menu-item menu-danger" onClick={logout}><span className="menu-icon">⇠</span><span className="menu-label">退出登录</span><span className="menu-arrow">›</span></div>
      </div>
    </div>
  );
}
