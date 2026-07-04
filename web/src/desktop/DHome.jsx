/* 桌面此刻（T5.5 / T6.2 #1#3#7、T6.3 记心情）：双栏 1fr+392px —— 左=今日心情卡+去年的今天；
   右=最近的信。数据：GET /users/me、/moods/memory-today、/letters/inbox。 */
import { useNavigate } from 'react-router-dom';
import { MoodFace, MoodBadge, IntensityDots } from '../components/primitives.jsx';
import { EnvelopeCard } from '../components/cards.jsx';
import { MoodWidget } from '../components/MoodWidget.jsx';
import { SkeletonList } from '../components/states.jsx';
import { lettersApi, moodsApi, useResource, ApiError } from '../api/index.js';
import { greeting } from '../utils/date.js';
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
  const mem = memory.data;

  async function onMoodSaved(m) {
    try {
      await saveToday(m);
      toast('情绪已记录 ✦');
    } catch (err) {
      if (err instanceof ApiError && (err.code === 1001 || err.code === 1002)) toast(err.message);
    }
  }

  return (
    <div className="dsk-page">
      <div className="dsk-head">
        <div className="dsk-title">{greeting()}，{me?.nickname || '朋友'}</div>
        <div className="dsk-sub">今天想写点什么，或者只是记录一种心情？</div>
      </div>
      <div className="dsk-home">
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
        </div>

        <div className="dsk-col">
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
        </div>
      </div>
    </div>
  );
}
