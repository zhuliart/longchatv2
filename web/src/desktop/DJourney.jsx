/* 桌面旅程（T5.5 / T6.2 #8#9#10、T6.3 记心情·改可见性·广场评论）：并排 448px+1fr ——
   左=月历+当月走势；右=当日详情（含 MoodWidget，往日锁定为仅可见性）；心情广场=两栏瀑布卡片 + 展开评论。
   数据 GET /moods?year=&month=、/plaza/moods、/plaza/moods/:id/comments。 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Avatar, MoodFace, MoodBadge, IntensityDots } from '../components/primitives.jsx';
import { MoodWidget } from '../components/MoodWidget.jsx';
import { TrendChart } from '../components/TrendChart.jsx';
import { SkeletonList, ErrorState } from '../components/states.jsx';
import { moodsApi, plazaApi, useResource, ApiError } from '../api/index.js';
import { buildCalendar, buildTrend } from '../utils/calendar.js';
import { pad2, ymd, relativeTime } from '../utils/date.js';
import { useMoods } from '../store/moods.jsx';
import { useUI } from '../store/ui.jsx';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function DJourney() {
  const [params] = useSearchParams();
  const initialDate = params.get('date') || '';
  const { saveToday } = useMoods();
  const { toast } = useUI();

  const now = new Date();
  const init = initialDate.split('-');
  const hasInit = init.length === 3;
  const [tab, setTab] = useState('mine');
  const [year, setYear] = useState(hasInit ? +init[0] : now.getFullYear());
  const [month, setMonth] = useState(hasInit ? +init[1] : now.getMonth() + 1);
  const [selDay, setSelDay] = useState(hasInit ? +init[2] : now.getDate());

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
        const merged = await saveToday(m);
        patchLocal(merged, ymd());
        toast('情绪已记录 ✦');
      }
    } catch (err) {
      if (err instanceof ApiError && (err.code === 1001 || err.code === 1002)) toast(err.message);
    }
  }

  return (
    <div className="dsk-page">
      <div className="dsk-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="dsk-title">旅程</div>
          <div className="dsk-sub">情绪的月历，与走过的痕迹</div>
        </div>
        <div className="seg-tabs" style={{ padding: 0 }}>
          <div className={'seg-tab' + (tab === 'mine' ? ' active' : '')} onClick={() => setTab('mine')}>我的旅程</div>
          <div className={'seg-tab' + (tab === 'feed' ? ' active' : '')} onClick={() => setTab('feed')}>心情广场</div>
        </div>
      </div>

      {tab === 'mine' ? (
        <div className="dsk-journey">
          <div className="dsk-col">
            <div className="card dsk-card">
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
            </div>
            <div className="card dsk-card">
              <div className="dsk-card-title"><span>{year}年{month}月 情绪走势</span></div>
              <TrendChart key={year + '-' + month} data={buildTrend(year, month, moods)} moods={moods} />
            </div>
          </div>

          <div className="card dsk-card">
            <div className="dsk-card-title"><span>{year}年{month}月{selDay}日</span></div>
            {monthRes.loading ? (
              <SkeletonList rows={2} />
            ) : monthRes.error ? (
              <ErrorState onRetry={monthRes.reload} />
            ) : selMood ? (
              <div key={selDate} className="tab-fade">
                <div className="dsk-mood-done">
                  <MoodFace emotion={selMood.emotion} size={46} />
                  <div>
                    <MoodBadge emotion={selMood.emotion} feeling={selMood.feeling} />
                    <div style={{ marginTop: 7 }}><IntensityDots value={selMood.intensity} /></div>
                  </div>
                </div>
                {selMood.diary && <div className="dsk-mood-diary">{selMood.diary}</div>}
                <div style={{ marginTop: 18, borderTop: '1px solid var(--hairline)', paddingTop: 16 }}>
                  <div className="dsk-card-title" style={{ fontSize: 14 }}>
                    <span>{isPast ? '修改可见性' : '修改心情'}</span>
                  </div>
                  <MoodWidget key={selDate} existing={selMood} onSave={saveMood} lockContent={isPast} />
                </div>
              </div>
            ) : (
              <div className="dsk-detail-empty" key={selDate}>
                {month}月{selDay}日 没有情绪记录
                {isToday(selDay) && <div style={{ marginTop: 16 }}><MoodWidget onSave={saveMood} /></div>}
              </div>
            )}
          </div>
        </div>
      ) : (
        <DPlaza />
      )}
    </div>
  );
}

/* 心情广场（两栏瀑布 + 行内展开评论；GET /plaza/moods + 评论接口） */
export function DPlaza() {
  const { data, loading, error, reload, setData } = useResource(() => plazaApi.getPublicMoods(0), []);
  const [openId, setOpenId] = useState(null);
  const feed = data || [];

  function bumpCount(id, count) {
    setData((arr) => (arr || []).map((f) => (f._id === id ? { ...f, commentCount: count } : f)));
  }

  if (loading) return <div className="dsk-plaza"><SkeletonList rows={4} /></div>;
  if (error) return <ErrorState onRetry={reload} />;
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
    <div className="dsk-plaza">
      {feed.map((f) => (
        <DPlazaCard key={f._id} card={f} open={openId === f._id}
          onToggle={() => setOpenId(openId === f._id ? null : f._id)}
          onPosted={(count) => bumpCount(f._id, count)} />
      ))}
    </div>
  );
}

function DPlazaCard({ card, open, onToggle, onPosted }) {
  const { toast } = useUI();
  const comments = useResource(() => (open ? plazaApi.getMoodComments(card._id, 0) : Promise.resolve([])), [open, card._id]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const list = comments.data || [];

  async function send() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await plazaApi.commentOnMood(card._id, { content });
      setInput('');
      comments.reload();
      if (res?.commentCount != null) onPosted(res.commentCount);
      toast('评论已送达 ✦');
    } catch (err) {
      if (err instanceof ApiError && (err.code === 1001 || err.code === 1002)) toast(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card dsk-plaza-card">
      <div className="dsk-plaza-head">
        <Avatar name={card.authorNickname} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="dsk-plaza-name">{card.authorNickname}</div>
          <div className="dsk-plaza-date">{card.date}</div>
        </div>
        <MoodBadge emotion={card.emotion} feeling={card.feeling} withFace />
      </div>
      <div className="dsk-plaza-diary">{card.diary}</div>
      <div className="dsk-plaza-foot">
        <IntensityDots value={card.intensity} />
        <span className="dsk-plaza-cc" onClick={onToggle}>
          💬 {card.commentCount} 条回应 {open ? '收起' : '展开'}
        </span>
      </div>
      {open && (
        <div className="dsk-plaza-comments tab-fade">
          {comments.loading ? (
            <div className="dsk-comment" style={{ color: 'var(--color-ink-secondary)' }}>加载中…</div>
          ) : list.length === 0 ? (
            <div className="dsk-comment" style={{ color: 'var(--color-ink-secondary)' }}>还没有回应，说点什么吧</div>
          ) : list.map((c) => (
            <div key={c._id} className={'dsk-comment' + (c.parent_id ? ' is-reply' : '')}>
              <b>{c.fromNickname}</b>：{c.content}
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-ink-secondary)' }}>{relativeTime(c.created_at)}</span>
            </div>
          ))}
          <div className="dsk-comment-row">
            <input placeholder="温柔地回应…" value={input} maxLength={200}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()} />
            <div className="comment-send" onClick={send}>{sending ? '发送中…' : '发送'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
