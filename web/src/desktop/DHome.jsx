/* 桌面此刻（T5.5）：双栏 1fr+392px —— 左=今日心情卡+去年的今天；右=最近的信 */
import { useNavigate } from 'react-router-dom';
import { MoodFace, MoodBadge, IntensityDots } from '../components/primitives.jsx';
import { EnvelopeCard } from '../components/cards.jsx';
import { MoodWidget } from '../components/MoodWidget.jsx';
import { ME, MEMORY_TODAY, LETTERS } from '../mocks/index.js';
import { greeting, ymd } from '../utils/date.js';
import { useMoods } from '../store/moods.jsx';
import { useUI } from '../store/ui.jsx';

export function DHome() {
  const navigate = useNavigate();
  const { todayMood, upsertMood } = useMoods();
  const { toast } = useUI();

  function onMoodSaved(m) {
    upsertMood({ ...m, date: ymd() });
    toast('情绪已记录 ✦');
  }

  return (
    <div className="dsk-page">
      <div className="dsk-head">
        <div className="dsk-title">{greeting()}，{ME.nickname}</div>
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

          <div className="card dsk-card">
            <div className="dsk-card-title">
              <span>去年的今天</span>
              <span className="more" onClick={() => navigate(`/journey?date=${MEMORY_TODAY.displayDate}`)}>查看 ›</span>
            </div>
            <div className="dsk-memory-quote">{MEMORY_TODAY.displayText}</div>
            <div className="dsk-memory-date">{MEMORY_TODAY.displayDate} · <MoodBadge emotion={MEMORY_TODAY.emotion} feeling={MEMORY_TODAY.feeling} /></div>
          </div>
        </div>

        <div className="dsk-col">
          <div className="card dsk-card">
            <div className="dsk-card-title">
              <span>最近的信</span>
              <span className="more" onClick={() => navigate('/inbox')}>全部 ›</span>
            </div>
            <div className="dsk-side-list">
              {LETTERS.map((l) => <EnvelopeCard key={l._id} letter={l} onClick={() => navigate(`/inbox?letter=${l._id}`)} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
