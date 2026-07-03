/* 桌面我的（T5.5）：资料 + 统计三格 + 会员卡片 + 退出登录 */
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/primitives.jsx';
import { ME, STATS } from '../mocks/index.js';
import { useAuth } from '../store/auth.jsx';
import { useUI } from '../store/ui.jsx';

export function DProfile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useUI();
  return (
    <div className="dsk-page dsk-me">
      <div className="dsk-head">
        <div className="dsk-title">我的</div>
      </div>
      <div className="my-header">
        <Avatar name={ME.nickname} />
        <div className="my-info">
          <div className="my-name">{ME.nickname}</div>
          <div className="my-intro">{ME.intro}</div>
        </div>
        <div className="mood-edit-btn" onClick={() => toast('编辑资料见移动端版式 ✎')}>编辑</div>
      </div>
      <div className="my-tags">{ME.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>

      <div className="card stats-section">
        <div className="stat-item" onClick={() => navigate('/inbox?tab=sent')}><span className="stat-num">{STATS.lettersSent}</span><span className="stat-label">已发出</span></div>
        <div className="stat-divider" />
        <div className="stat-item" onClick={() => navigate('/inbox')}><span className="stat-num">{STATS.lettersReceived}</span><span className="stat-label">已收到</span></div>
        <div className="stat-divider" />
        <div className="stat-item" onClick={() => navigate('/journey')}><span className="stat-num">{STATS.moodDays}</span><span className="stat-label">记录天数</span></div>
      </div>

      <div className="card member-section">
        <div>
          <div className="member-title">{ME.is_member ? '会员用户' : '普通用户'}</div>
          <div className="member-sub">{ME.is_member ? '每日 5 位灵魂推荐' : '每日 3 位灵魂推荐'}</div>
        </div>
        {!ME.is_member && <div className="member-upgrade" onClick={() => toast('会员详情敬请期待 ✦')}>升级会员</div>}
      </div>

      <div className="card menu-section">
        <div className="menu-item menu-danger" onClick={logout}><span className="menu-icon">⇠</span><span className="menu-label">退出登录</span><span className="menu-arrow">›</span></div>
      </div>
    </div>
  );
}
