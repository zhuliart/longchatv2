/* 此刻（首页，T5.4 / T6.2 #1#3#6#7、T6.3 记心情）：问候语 + 今日心情卡
   （未记录→内嵌 MoodWidget / 已记录→徽章+日记+修改）+ 快捷磁贴 + 今日灵魂 hero
   + 去年的今天 + 最近来信。数据：GET /users/me、/matches/daily、/moods/memory-today、/letters/inbox。 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../components/chrome.jsx';
import { Avatar, MoodBadge } from '../components/primitives.jsx';
import { EnvelopeCard } from '../components/cards.jsx';
import { MoodWidget } from '../components/MoodWidget.jsx';
import { SkeletonList } from '../components/states.jsx';
import { lettersApi, matchesApi, moodsApi, useResource, ApiError } from '../api/index.js';
import { greeting, formatCnDate } from '../utils/date.js';
import { useMoods } from '../store/moods.jsx';
import { useUser } from '../store/user.jsx';
import { useUI } from '../store/ui.jsx';

/* 「去年的今天」显示日期：mood 有 date，letter 从 created_at 取；渲染成「年M月D日」 */
function memoryDate(mem) {
  if (!mem) return '';
  const d = mem.date || (mem.created_at ? String(mem.created_at).slice(0, 10) : '');
  return d.replace(/-0?(\d+)-0?(\d+)/, '年$1月$2日').replace(/^(\d+)年/, '$1年');
}

export function HomeScreen() {
  const navigate = useNavigate();
  const { todayMood, saveToday } = useMoods();
  const { me } = useUser();
  const { dark, toggleDark, toast } = useUI();
  const [editing, setEditing] = useState(false);

  const matches = useResource(() => matchesApi.getDailyRecommend(), []);
  const memory = useResource(() => moodsApi.getMemoryToday(), []);
  const inbox = useResource(() => lettersApi.getInbox(0), []);

  const top = (matches.data || [])[0];
  const mem = memory.data; // 可能为 null（去年无记录）
  const recent = (inbox.data || []).slice(0, 2);

  async function onMoodSaved(m) {
    try {
      await saveToday(m);
      toast('情绪已记录 ✦');
      setEditing(false);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 1001 || err.code === 1002)) toast(err.message);
    }
  }

  const tiles = [
    { key: 'write', icon: '✎', label: '写信', cls: 'qt-1', go: () => navigate('/write', top ? { state: { targetUid: top.profile._id, targetNickname: top.profile.nickname, isFirst: true } } : { state: { isFirst: true } }) },
    { key: 'inbox', icon: '✉', label: '信箱', cls: 'qt-2', go: () => navigate('/inbox') },
    { key: 'journey', icon: '❍', label: '旅程', cls: 'qt-3', go: () => navigate('/journey') },
    { key: 'match', icon: '☾', label: '推荐', cls: 'qt-4', go: () => navigate('/match') },
  ];

  return (
    <div className="page">
      <StatusBar dark />
      <div className="page-scroll tab-fade">
        <div className="home-header">
          <div className="home-toprow">
            <div className="home-greeting">
              <div className="home-hello">{greeting()}，</div>
              <div className="home-name">{me?.nickname || '朋友'}<span className="seal-dot">🌙</span></div>
            </div>
            <button className={'theme-orb' + (dark ? ' is-dark' : '')} onClick={toggleDark} aria-label="切换深色模式">
              <span className="orb-glyph">{dark ? '☾' : '☀'}</span>
            </button>
            <Avatar name={me?.nickname || '·'} className="home-avatar" />
          </div>
          <div className="home-tagline">慢下来，好好说话 · {formatCnDate()}</div>
        </div>

        {/* 快捷入口 */}
        <div className="quick-tiles">
          {tiles.map((t) => (
            <div key={t.key} className={'quick-tile ' + t.cls} onClick={t.go}>
              <span className="qt-icon">{t.icon}</span>
              <span className="qt-label">{t.label}</span>
            </div>
          ))}
        </div>

        {/* 今日心情 */}
        <div className="section">
          <div className="section-header">
            <span className="section-title ribbon"><span className="ribbon-banner"><span className="rb-mark">✶</span>此刻心情</span></span>
          </div>
          {!todayMood && (
            <div className="card fade-in">
              <div className="mood-prompt-title">今天，你怎么样？</div>
              <div className="mood-prompt-sub">记录此刻的心情</div>
              <MoodWidget onSave={onMoodSaved} />
            </div>
          )}
          {todayMood && !editing && (
            <div className="card fade-in">
              <div className="mood-done-row">
                <div className="mood-done-info">
                  <span className="mood-done-label">今日心情已记录</span>
                  <MoodBadge emotion={todayMood.emotion} label={todayMood.emotionLabel} feeling={todayMood.feeling} withFace />
                </div>
                <div className="mood-edit-btn" onClick={() => setEditing(true)}>修改</div>
              </div>
              {todayMood.diary && <div className="mood-done-diary text-clamp-2">{todayMood.diary}</div>}
            </div>
          )}
          {todayMood && editing && (
            <div className="card fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mood-prompt-title" style={{ fontSize: 18 }}>修改今日心情</span>
                <span style={{ fontSize: 13, color: 'var(--color-ink-secondary)', cursor: 'pointer' }} onClick={() => setEditing(false)}>取消</span>
              </div>
              <MoodWidget existing={todayMood} onSave={onMoodSaved} />
            </div>
          )}
        </div>

        {/* 今日灵魂推荐 — featured hero（无推荐时不展示） */}
        {top && (
          <>
            <div className="section" style={{ marginBottom: 0 }}>
              <div className="section-header">
                <span className="section-title ribbon"><span className="ribbon-banner"><span className="rb-mark">☾</span>今日灵魂</span></span>
                <span className="section-more" onClick={() => navigate('/match')}>全部 ›</span>
              </div>
            </div>
            <div className="featured-hero" onClick={() => navigate(`/peer/${top.profile._id}`)}>
              <div className="fh-label">今日最契合的灵魂</div>
              <div className="fh-row">
                <Avatar name={top.profile.nickname} className="fh-avatar" />
                <div>
                  <div className="fh-name">{top.profile.nickname}</div>
                  {top.profile.isActiveRecently && <div style={{ fontSize: 12, opacity: 0.82, fontFamily: 'var(--font-serif)' }}>近期活跃</div>}
                </div>
                <div className="fh-score"><div className="num">{top.score}<span style={{ fontSize: 14 }}>%</span></div><span className="lbl">契合</span></div>
              </div>
              <div className="fh-intro text-clamp-2">{top.profile.intro}</div>
              <div className="fh-foot">
                <div className="fh-tags">{top.tagsCommon.map((t) => <span key={t} className="fh-tag">{t}</span>)}</div>
                <span className="fh-cta">写信给TA</span>
              </div>
            </div>
          </>
        )}

        {/* 去年的今天（仅当有 mood 类记忆时展示；letter 记忆或无记录不展示卡片） */}
        {mem && mem.type === 'mood' && (
          <div className="section">
            <div className="section-header">
              <span className="section-title ribbon"><span className="ribbon-banner"><span className="rb-mark">❦</span>去年的今天</span></span>
              <span className="section-more" onClick={() => navigate(`/journey?date=${mem.date}`)}>查看 ›</span>
            </div>
            <div className="card memory-card" onClick={() => navigate(`/journey?date=${mem.date}`)}>
              <div className="memory-top">
                <span className="memory-year"><b>一年前</b><span className="dot" />{memoryDate(mem)}</span>
                <MoodBadge emotion={mem.emotion} feeling={mem.feeling} />
              </div>
              <div className="memory-excerpt text-clamp-3">{mem.diary || '这天记录了心情，但没有写下日记。'}</div>
            </div>
          </div>
        )}

        {/* 最近来信 */}
        <div className="section" style={{ marginBottom: 24 }}>
          <div className="section-header">
            <span className="section-title ribbon"><span className="ribbon-banner"><span className="rb-mark">✉</span>最近来信</span></span>
            <span className="section-more" onClick={() => navigate('/inbox')}>信箱 ›</span>
          </div>
          {inbox.loading ? (
            <SkeletonList rows={2} />
          ) : recent.length === 0 ? (
            <div className="empty-state" style={{ padding: '28px 16px' }}>
              <span className="empty-icon">✉</span>
              <span>还没有来信</span>
              <span className="empty-sub">去发现灵魂匹配吧</span>
            </div>
          ) : (
            recent.map((l) => (
              <EnvelopeCard key={l._id} letter={l} onClick={() => navigate(`/letter/${l._id}`, { state: { name: l.senderNickname } })} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
