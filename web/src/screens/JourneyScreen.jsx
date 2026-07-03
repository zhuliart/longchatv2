/* 旅程（T5.4）：我的旅程（可翻月日历情绪彩点 + 当日详情 + 当月走势折线，往日仅可改可见性）
   / 心情广场（公开心情卡 + 两级评论 + 回应输入）。 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StatusBar } from '../components/chrome.jsx';
import { MoodBadge, IntensityDots } from '../components/primitives.jsx';
import { MoodWidget } from '../components/MoodWidget.jsx';
import { TrendChart } from '../components/TrendChart.jsx';
import { VISIBILITY_LABEL } from '../constants/index.js';
import { FEED, ME } from '../mocks/index.js';
import { buildCalendar, buildTrend } from '../utils/calendar.js';
import { pad2 } from '../utils/date.js';
import { useMoods } from '../store/moods.jsx';
import { useUI } from '../store/ui.jsx';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function JourneyScreen() {
  const [params] = useSearchParams();
  const initialDate = params.get('date') || '';
  const initialTab = params.get('tab');
  const { moods, upsertMood } = useMoods();
  const { toast } = useUI();

  const now = new Date();
  const init = initialDate.split('-');
  const hasInit = init.length === 3;
  const [tab, setTab] = useState(initialTab === 'feed' ? 'feed' : 'mine');
  const [year, setYear] = useState(hasInit ? +init[0] : now.getFullYear());
  const [month, setMonth] = useState(hasInit ? +init[1] : now.getMonth() + 1);
  const [selDay, setSelDay] = useState(hasInit ? +init[2] : now.getDate());
  const [comments, setComments] = useState(null); // 打开评论面板的心情
  const [editing, setEditing] = useState(false);

  const cells = buildCalendar(year, month, moods);
  const selDate = `${year}-${pad2(month)}-${pad2(selDay)}`;
  const selMood = moods.find((m) => m.date === selDate);
  const isToday = (d) =>
    year === now.getFullYear() && month === now.getMonth() + 1 && d === now.getDate();
  const todayNum = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const isPast = year * 10000 + month * 100 + selDay < todayNum;

  function shiftMonth(delta) {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y -= 1; } else if (m > 12) { m = 1; y += 1; }
    setYear(y); setMonth(m); setSelDay(1);
  }

  function saveMood(m) {
    // 往日仅改可见性（M6 走 PATCH /moods/:id/visibility），今天全量（PUT /moods/:date）
    upsertMood({ ...selMood, ...m, date: selDate });
    toast(isPast ? '可见性已更新 ✦' : '情绪已记录 ✦');
    setEditing(false);
  }

  return (
    <div className="page">
      <StatusBar />
      <div className="seg-tabs">
        <div className={'seg-tab' + (tab === 'mine' ? ' active' : '')} onClick={() => setTab('mine')}>我的旅程</div>
        <div className={'seg-tab' + (tab === 'feed' ? ' active' : '')} onClick={() => setTab('feed')}>心情广场</div>
      </div>

      <div className="page-scroll" style={{ paddingBottom: 24 }} key={tab}>
        {tab === 'mine' && (
          <div className="tab-fade">
            <div className="month-picker">
              <div className="month-arrow" onClick={() => shiftMonth(-1)}>‹</div>
              <span className="month-label">{year}年{month}月</span>
              <div className="month-arrow" onClick={() => shiftMonth(1)}>›</div>
            </div>

            <div className="calendar">
              <div className="cal-weekdays">{WEEKDAYS.map((w) => <span key={w}>{w}</span>)}</div>
              <div className="cal-grid">
                {cells.map((c, i) => c === null ? <div key={i} className="cal-cell empty" /> : (
                  <div key={i}
                    className={'cal-cell' + (c.mood ? ' has-mood' : '') + (c.d === selDay ? ' selected' : '') + (isToday(c.d) ? ' today' : '')}
                    onClick={() => setSelDay(c.d)}>
                    <span className="num">{c.d}</span>
                    {c.mood && <span className="cal-dot" style={{ background: `var(--m-${c.mood.emotion})` }} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              {selMood ? (
                <div className="card fade-in" key={selDay}>
                  <div className="mood-detail-header">
                    <span className="mood-date-label">{year}年{month}月{selDay}日</span>
                    <div className="mood-detail-right">
                      <span className="visibility-badge">{VISIBILITY_LABEL[selMood.visibility]}</span>
                      <MoodBadge emotion={selMood.emotion} feeling={selMood.feeling} withFace />
                    </div>
                  </div>
                  <div className="intensity-row">
                    <span className="intensity-label">心情强度</span>
                    <IntensityDots value={selMood.intensity} />
                  </div>
                  {selMood.diary && <div className="mood-diary-text">{selMood.diary}</div>}
                  <div className="mood-actions">
                    <div className="action-pill" onClick={() => setEditing(true)}>{isPast ? '修改可见性' : '修改心情'}</div>
                    {selMood.visibility === 'public' && (
                      <div className="action-pill" onClick={() => setComments(FEED.find((f) => f.diary === selMood.diary) || FEED[0])}>
                        评论 ({selMood.commentCount})
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card fade-in" key={'e' + selDay}>
                  <div style={{ textAlign: 'center', color: 'var(--color-ink-secondary)', fontFamily: 'var(--font-serif)', padding: '8px 0' }}>{month}月{selDay}日 没有情绪记录</div>
                </div>
              )}
            </div>

            <div className="section">
              <div className="section-header"><span className="section-title">{year}年{month}月 情绪走势</span></div>
              <div className="card"><TrendChart key={year + '-' + month} data={buildTrend(year, month, moods)} moods={moods} /></div>
            </div>
          </div>
        )}

        {tab === 'feed' && (
          <div className="tab-fade" style={{ padding: '14px 16px 0' }}>
            {FEED.map((f) => (
              <div key={f._id} className="card feed-card">
                <div className="feed-card-header">
                  <div>
                    <span className="feed-author-name">{f.authorNickname}</span>
                    <span className="feed-date">{f.date}</span>
                  </div>
                  <MoodBadge emotion={f.emotion} feeling={f.feeling} withFace />
                </div>
                <div className="intensity-row" style={{ marginTop: 10, marginBottom: 0 }}>
                  <IntensityDots value={f.intensity} size={9} />
                </div>
                {f.diary && <div className="feed-diary text-clamp-3">{f.diary}</div>}
                <div className="feed-footer">
                  <span className="comment-btn" onClick={() => setComments(f)}>💬 {f.commentCount} 评论</span>
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'center', color: 'var(--color-ink-secondary)', fontSize: 12, padding: '12px 0', fontFamily: 'var(--font-serif)' }}>— 已到底部 —</div>
          </div>
        )}
      </div>

      {comments && <CommentsSheet mood={comments} onClose={() => setComments(null)} />}
      {editing && selMood && (
        <div className="sheet-mask" onClick={() => setEditing(false)}>
          <div className="sheet edit-mood-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">{isPast ? '修改可见性' : '修改'} {month}月{selDay}日 的心情</span>
              <span className="sheet-close" onClick={() => setEditing(false)}>✕</span>
            </div>
            <div className="sheet-scroll">
              <MoodWidget existing={selMood} onSave={saveMood} lockContent={isPast} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* 两级评论面板（Enter 或按钮提交；M6 接通 POST /plaza/moods/:id/comments） */
export function CommentsSheet({ mood, onClose }) {
  const [list, setList] = useState(mood.comments || []);
  const [input, setInput] = useState('');
  function send() {
    if (!input.trim()) return;
    setList([...list, { _id: 'c' + Date.now(), fromNickname: ME.nickname, content: input.trim(), created_at: '刚刚', parent_id: null }]);
    setInput('');
  }
  return (
    <>
      <div className="sheet-mask" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-header">
          <span className="sheet-title">评论</span>
          <span className="sheet-close" onClick={onClose}>✕</span>
        </div>
        <div className="sheet-scroll">
          {list.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-ink-secondary)', padding: '32px 0', fontFamily: 'var(--font-serif)' }}>暂无评论，来说第一句话吧</div>
          ) : list.map((c) => (
            <div key={c._id} className={'comment-item' + (c.parent_id ? ' reply' : '')}>
              <div className="comment-head">
                <span className="comment-author">{c.fromNickname}</span>
                <span className="comment-time">{c.created_at}</span>
              </div>
              <div className="comment-content">{c.content}</div>
            </div>
          ))}
        </div>
        <div className="comment-input-area">
          <div className="comment-input-row">
            <input className="comment-input" placeholder="说点什么..." value={input} maxLength={200}
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <div className="comment-send" onClick={send}>发送</div>
          </div>
        </div>
      </div>
    </>
  );
}
