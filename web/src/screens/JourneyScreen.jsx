/* 旅程（T5.4 / T6.2 #8#9#10、T6.3 记心情·改可见性·广场评论）：我的旅程（可翻月日历情绪彩点
   + 当日详情 + 当月走势折线，往日仅可改可见性）/ 心情广场（公开心情卡 + 两级评论 + 回应输入）。
   数据 GET /moods?year=&month=（趋势前端派生）、GET /plaza/moods、/plaza/moods/:id/comments；
   保存今日 PUT /moods/:date；改可见性 PATCH /moods/:id/visibility；评论 POST /plaza/moods/:id/comments。 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StatusBar } from '../components/chrome.jsx';
import { MoodBadge, IntensityDots } from '../components/primitives.jsx';
import { MoodWidget } from '../components/MoodWidget.jsx';
import { TrendChart } from '../components/TrendChart.jsx';
import { SkeletonList, ErrorState } from '../components/states.jsx';
import { VISIBILITY_LABEL } from '../constants/index.js';
import { moodsApi, plazaApi, useResource, ApiError } from '../api/index.js';
import { buildCalendar, buildTrend } from '../utils/calendar.js';
import { pad2, ymd, relativeTime } from '../utils/date.js';
import { useMoods } from '../store/moods.jsx';
import { useUI } from '../store/ui.jsx';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function JourneyScreen() {
  const [params] = useSearchParams();
  const initialDate = params.get('date') || '';
  const initialTab = params.get('tab');
  const { saveToday } = useMoods();
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

  const monthRes = useResource(() => moodsApi.getMoods(year, month), [year, month]);
  const moods = monthRes.data || [];

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

  /* 本地回写当月列表某条心情（保存/改可见性后即时反映月历与详情） */
  function patchLocal(patch, matchDate) {
    monthRes.setData((prev) => {
      const arr = prev ? [...prev] : [];
      const i = arr.findIndex((x) => (matchDate ? x.date === matchDate : x._id === patch._id));
      if (i > -1) arr[i] = { ...arr[i], ...patch };
      else arr.push(patch);
      return arr;
    });
  }

  async function saveMood(m) {
    try {
      if (isPast) {
        const res = await moodsApi.updateMoodVisibility(selMood._id, m.visibility);
        patchLocal({ _id: selMood._id, visibility: res.visibility });
        toast('可见性已更新 ✦');
      } else {
        const merged = await saveToday(m); // 服务端今天，回写 store todayMood
        patchLocal(merged, ymd());
        toast('情绪已记录 ✦');
      }
      setEditing(false);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 1001 || err.code === 1002)) toast(err.message);
    }
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
              {monthRes.loading ? (
                <div className="card fade-in"><SkeletonList rows={2} /></div>
              ) : monthRes.error ? (
                <div className="card fade-in"><ErrorState onRetry={monthRes.reload} /></div>
              ) : selMood ? (
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
                      <div className="action-pill" onClick={() => setComments(selMood)}>
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

        {tab === 'feed' && <PlazaFeed onOpen={setComments} />}
      </div>

      {comments && (
        <CommentsSheet
          mood={comments}
          onClose={() => setComments(null)}
          onPosted={(count) => patchLocal({ _id: comments._id, commentCount: count })}
        />
      )}
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

/* 心情广场列表（GET /plaza/moods） */
function PlazaFeed({ onOpen }) {
  const { data, loading, error, reload } = useResource(() => plazaApi.getPublicMoods(0), []);
  const feed = data || [];
  if (loading) return <div className="tab-fade" style={{ padding: '14px 16px 0' }}><SkeletonList rows={3} /></div>;
  if (error) return <div className="tab-fade"><ErrorState onRetry={reload} /></div>;
  if (feed.length === 0) {
    return (
      <div className="empty-state" style={{ paddingTop: 60 }}>
        <span className="empty-icon">🌍</span>
        <span>广场还很安静</span>
        <span className="empty-sub">把某天的心情设为公开，就会出现在这里</span>
      </div>
    );
  }
  return (
    <div className="tab-fade" style={{ padding: '14px 16px 0' }}>
      {feed.map((f) => (
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
            <span className="comment-btn" onClick={() => onOpen(f)}>💬 {f.commentCount} 评论</span>
          </div>
        </div>
      ))}
      <div style={{ textAlign: 'center', color: 'var(--color-ink-secondary)', fontSize: 12, padding: '12px 0', fontFamily: 'var(--font-serif)' }}>— 已到底部 —</div>
    </div>
  );
}

/* 两级评论面板（Enter 或按钮提交；POST /plaza/moods/:id/comments） */
export function CommentsSheet({ mood, onClose, onPosted }) {
  const { toast } = useUI();
  const { data, loading, error, reload } = useResource(() => plazaApi.getMoodComments(mood._id, 0), [mood._id]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const list = data || [];

  async function send() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await plazaApi.commentOnMood(mood._id, { content });
      setInput('');
      reload();
      if (onPosted && res?.commentCount != null) onPosted(res.commentCount);
    } catch (err) {
      // 违规 1001 / 字数 1002：就地提示不关面板；9001 已由 client 层 toast
      if (err instanceof ApiError && (err.code === 1001 || err.code === 1002)) toast(err.message);
    } finally {
      setSending(false);
    }
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
          {loading ? (
            <SkeletonList rows={2} />
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : list.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-ink-secondary)', padding: '32px 0', fontFamily: 'var(--font-serif)' }}>暂无评论，来说第一句话吧</div>
          ) : list.map((c) => (
            <div key={c._id} className={'comment-item' + (c.parent_id ? ' reply' : '')}>
              <div className="comment-head">
                <span className="comment-author">{c.fromNickname}</span>
                <span className="comment-time">{relativeTime(c.created_at)}</span>
              </div>
              <div className="comment-content">{c.content}</div>
            </div>
          ))}
        </div>
        <div className="comment-input-area">
          <div className="comment-input-row">
            <input className="comment-input" placeholder="说点什么..." value={input} maxLength={200}
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <div className="comment-send" onClick={send}>{sending ? '发送中…' : '发送'}</div>
          </div>
        </div>
      </div>
    </>
  );
}
