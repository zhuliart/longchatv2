/* 此刻（首页，T5.4）：问候语 + 今日心情卡（未记录→内嵌 MoodWidget / 已记录→徽章+日记+修改）
   + 快捷磁贴 + 今日灵魂 hero + 去年的今天 + 最近来信。
   问候/日期取真实服务端时间语义（原型硬编码 2026-06-04 不带入）。 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../components/chrome.jsx';
import { Avatar, MoodBadge } from '../components/primitives.jsx';
import { EnvelopeCard } from '../components/cards.jsx';
import { MoodWidget } from '../components/MoodWidget.jsx';
import { ME, MATCHES, MEMORY_TODAY, LETTERS } from '../mocks/index.js';
import { greeting, formatCnDate, ymd } from '../utils/date.js';
import { useMoods } from '../store/moods.jsx';
import { useUI } from '../store/ui.jsx';

export function HomeScreen() {
  const navigate = useNavigate();
  const { todayMood, upsertMood } = useMoods();
  const { dark, toggleDark, toast } = useUI();
  const [editing, setEditing] = useState(false);
  const top = MATCHES[0];

  function onMoodSaved(m) {
    upsertMood({ ...m, date: ymd() });
    toast('情绪已记录 ✦');
    setEditing(false);
  }

  const tiles = [
    { key: 'write', icon: '✎', label: '写信', cls: 'qt-1', go: () => navigate('/write', { state: { targetNickname: top.profile.nickname, isFirst: true } }) },
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
              <div className="home-name">{ME.nickname}<span className="seal-dot">🌙</span></div>
            </div>
            <button className={'theme-orb' + (dark ? ' is-dark' : '')} onClick={toggleDark} aria-label="切换深色模式">
              <span className="orb-glyph">{dark ? '☾' : '☀'}</span>
            </button>
            <Avatar name={ME.nickname} className="home-avatar" />
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

        {/* 今日灵魂推荐 — featured hero */}
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

        {/* 去年的今天 */}
        <div className="section">
          <div className="section-header">
            <span className="section-title ribbon"><span className="ribbon-banner"><span className="rb-mark">❦</span>去年的今天</span></span>
            <span className="section-more" onClick={() => navigate(`/journey?date=${MEMORY_TODAY.displayDate}`)}>查看 ›</span>
          </div>
          <div className="card memory-card" onClick={() => navigate(`/journey?date=${MEMORY_TODAY.displayDate}`)}>
            <div className="memory-top">
              <span className="memory-year"><b>一年前</b><span className="dot" />{MEMORY_TODAY.displayDate.replace(/-0?(\d+)-0?(\d+)/, '年$1月$2日')}</span>
              <MoodBadge emotion={MEMORY_TODAY.emotion} label={MEMORY_TODAY.emotionLabel} />
            </div>
            <div className="memory-excerpt text-clamp-3">{MEMORY_TODAY.displayText}</div>
          </div>
        </div>

        {/* 最近来信 */}
        <div className="section" style={{ marginBottom: 24 }}>
          <div className="section-header">
            <span className="section-title ribbon"><span className="ribbon-banner"><span className="rb-mark">✉</span>最近来信</span></span>
            <span className="section-more" onClick={() => navigate('/inbox')}>信箱 ›</span>
          </div>
          {LETTERS.slice(0, 2).map((l) => (
            <EnvelopeCard key={l._id} letter={l} onClick={() => navigate(`/letter/${l._id}`)} />
          ))}
        </div>
      </div>
    </div>
  );
}
