/* 桌面此刻（T5.5 / T6.2 #1#3#6#7、T6.3 记心情·跳过）：双栏 1fr+392px ——
   左（主栏）=今日心情 + 今日灵魂推荐；右（侧栏）=去年的今天 + 最近的信。
   数据：GET /users/me、/moods/memory-today、/letters/inbox、/matches/daily。 */
import { useNavigate } from 'react-router-dom';
import { MoodFace, MoodBadge, IntensityDots } from '../components/primitives.jsx';
import { EnvelopeCard, SoulCard } from '../components/cards.jsx';
import { MoodWidget } from '../components/MoodWidget.jsx';
import { SkeletonList, ErrorState } from '../components/states.jsx';
import { lettersApi, moodsApi, matchesApi, anonApi, useResource, ApiError } from '../api/index.js';
import { greeting } from '../utils/date.js';
import { DAnonItem } from './DAnon.jsx';
import { useMoods } from '../store/moods.jsx';
import { useUser } from '../store/user.jsx';
import { useUI } from '../store/ui.jsx';

export function DHome() {
  const navigate = useNavigate();
  const { todayMood, saveToday } = useMoods();
  const { me } = useUser();
  const { toast } = useUI();

  const memory = useResource(() => moodsApi.getMemoryToday(), []);
  const inbox = useResource(() => lettersApi.getInbox(0), []);
  const matches = useResource(() => matchesApi.getDailyRecommend(), []);
  const mem = memory.data;
  const souls = matches.data || [];

  async function onMoodSaved(m) {
    try {
      await saveToday(m);
      toast('情绪已记录 ✦');
    } catch (err) {
      if (err instanceof ApiError && (err.code === 1001 || err.code === 1002)) toast(err.message);
    }
  }

  function writeTo(m) {
    navigate('/write', { state: { targetUid: m.profile._id, targetNickname: m.profile.nickname, isFirst: true } });
  }
  async function skip(m) {
    matches.setData((arr) => (arr || []).filter((x) => x._id !== m._id));
    try {
      await matchesApi.skipUser(m.profile._id);
    } catch {
      /* 网络异常已由 client 层 toast */
    }
  }

  return (
    <div className="dsk-page">
      <div className="dsk-head">
        <div className="dsk-title">{greeting()}，{me?.nickname || '朋友'}</div>
        <div className="dsk-sub">今天想写点什么，或者只是记录一种心情？</div>
      </div>
      <div className="dsk-home">
        {/* 左主栏：今日心情 + 今日灵魂 */}
        <div className="dsk-col">
          <div className="card dsk-card">
            <div className="dsk-card-title">
              <span>今天，你怎么样？</span>
              {todayMood && <span className="more" onClick={() => navigate('/journey')}>去旅程看看 ›</span>}
            </div>
            {todayMood ? (
              <>
                <div className="dsk-mood-done">
                  <MoodFace emotion={todayMood.emotion} size={46} />
                  <div>
                    <MoodBadge emotion={todayMood.emotion} label={todayMood.emotionLabel} feeling={todayMood.feeling} />
                    <div style={{ marginTop: 7 }}><IntensityDots value={todayMood.intensity} /></div>
                  </div>
                </div>
                {todayMood.diary && <div className="dsk-mood-diary">{todayMood.diary}</div>}
              </>
            ) : (
              <MoodWidget onSave={onMoodSaved} />
            )}
          </div>

          <div className="card dsk-card">
            <div className="dsk-card-title">
              <span>今日灵魂</span>
              <span className="dsk-souls-note">每日更新 · 真诚相遇</span>
            </div>
            {matches.loading ? (
              <SkeletonList rows={2} />
            ) : matches.error ? (
              <ErrorState onRetry={matches.reload} />
            ) : souls.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 8px' }}>
                <span className="empty-icon">☾</span>
                <span>今天的推荐已看完</span>
                <span className="empty-sub">明天还会有新的灵魂与你相遇</span>
              </div>
            ) : (
              <div className="dsk-souls">
                {souls.map((m) => (
                  <div key={m._id} className="dsk-soul-item">
                    <SoulCard item={m} onClick={() => writeTo(m)} />
                    <div className="dsk-soul-actions">
                      <div className="btn btn-ghost" onClick={() => skip(m)}>跳过</div>
                      <div className="btn btn-primary" onClick={() => writeTo(m)}>写信给TA</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧栏：去年的今天 + 最近的信 */}
        <div className="dsk-col">
          {mem && mem.type === 'mood' && (
            <div className="card dsk-card">
              <div className="dsk-card-title">
                <span>去年的今天</span>
                <span className="more" onClick={() => navigate(`/journey?date=${mem.date}`)}>查看 ›</span>
              </div>
              <div className="dsk-memory-quote">{mem.diary || '这天记录了心情，但没有写下日记。'}</div>
              <div className="dsk-memory-date">{mem.date} · <MoodBadge emotion={mem.emotion} feeling={mem.feeling} /></div>
            </div>
          )}

          <div className="card dsk-card">
            <div className="dsk-card-title">
              <span>最近的信</span>
              <span className="more" onClick={() => navigate('/inbox')}>全部 ›</span>
            </div>
            <div className="dsk-side-list">
              {inbox.loading ? (
                <SkeletonList rows={3} />
              ) : (inbox.data || []).length === 0 ? (
                <div className="empty-state" style={{ padding: '28px 8px' }}>
                  <span className="empty-icon">✉</span>
                  <span>还没有来信</span>
                  <span className="empty-sub">去发现灵魂匹配吧</span>
                </div>
              ) : (
                inbox.data.map((l) => <EnvelopeCard key={l._id} letter={l} onClick={() => navigate(`/inbox?letter=${l._id}`)} />)
              )}
            </div>
          </div>

          <DAnonBoard />
        </div>
      </div>
    </div>
  );
}

/* 匿名信区（树洞）首页小卡：最新 2 封 + 全部入口（独立页 /anon） */
function DAnonBoard() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useResource(() => anonApi.getAnonLetters(0), []);
  const posts = (data || []).slice(0, 2);

  return (
    <div className="card dsk-card">
      <div className="dsk-card-title">
        <span>匿名信区</span>
        <span className="more" onClick={() => navigate('/anon')}>全部 ›</span>
      </div>
      <div className="dsk-souls-note" style={{ marginBottom: 10 }}>没有署名的心里话 · 回信会送进对方的收件箱</div>
      {loading ? (
        <SkeletonList rows={2} />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : posts.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 8px' }}>
          <span className="empty-icon">◐</span>
          <span>还没有匿名信</span>
          <span className="empty-sub" style={{ cursor: 'pointer' }} onClick={() => navigate('/write', { state: { board: true } })}>写下第一封没有署名的心里话 ›</span>
        </div>
      ) : (
        posts.map((post) => <DAnonItem key={post._id} post={post} />)
      )}
    </div>
  );
}
