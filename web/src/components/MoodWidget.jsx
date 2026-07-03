/* MoodWidget（T5.3）：5 主情绪 → 二级细分 chips → 强度滑杆 → 日记（≥30 字）→ 可见性三档；
   lockContent 模式：往日记录只读，仅可改可见性（契约 §6）。 */
import { useState } from 'react';
import { EMOTIONS, EMOTION_LABEL, EMOTION_FEELINGS, VISIBILITY_OPTIONS, DIARY_MIN } from '../constants/index.js';
import { countWords } from '../utils/countWords.js';
import { MoodFace, MoodBadge, IntensityDots, IntensitySlider } from './primitives.jsx';

export function MoodWidget({ existing, onSave, lockContent }) {
  const [emotion, setEmotion] = useState(existing ? existing.emotion : '');
  const [feeling, setFeeling] = useState(existing && existing.feeling ? existing.feeling : '');
  const [intensity, setIntensity] = useState(existing ? existing.intensity : 3);
  const [diary, setDiary] = useState(existing ? existing.diary || '' : '');
  const [visibility, setVisibility] = useState(existing ? existing.visibility || 'private' : 'private');
  const diaryCount = countWords(diary);
  const diaryValid = diaryCount === 0 || diaryCount >= DIARY_MIN;
  const isEdit = !!existing;
  const feelingOptions = EMOTION_FEELINGS[emotion] || [];

  function pickEmotion(key) {
    setEmotion(key);
    setFeeling(''); // 主情绪变更时重置细分
  }

  /* 往日心情是已写下的历史，仅可见性可改 */
  if (lockContent) {
    return (
      <div className="mood-widget">
        <div className="locked-note">往日心情是已经写下的记录，无法再更改，但你可以调整谁能看到它。</div>
        <div className="locked-summary">
          <div className="locked-summary-head">
            <MoodBadge emotion={existing.emotion} feeling={existing.feeling} withFace />
            <IntensityDots value={existing.intensity} />
          </div>
          {existing.diary && <div className="locked-summary-diary">{existing.diary}</div>}
        </div>
        <div className="visibility-section">
          <span className="visibility-label">谁可以看到</span>
          <div className="visibility-options">
            {VISIBILITY_OPTIONS.map((v) => (
              <div key={v.key} className={'visibility-item' + (visibility === v.key ? ' active' : '')} onClick={() => setVisibility(v.key)}>
                <span className="visibility-icon">{v.icon}</span>
                <span className="visibility-text">{v.label}</span>
              </div>
            ))}
          </div>
          {visibility === 'public' && <span className="visibility-tip">公开后，陌生人可以评论并与你成为笔友</span>}
        </div>
        <div className="save-btn btn btn-primary" onClick={() => onSave({ visibility })}>更新可见性</div>
      </div>
    );
  }

  return (
    <div className="mood-widget">
      <div className="emotion-select">
        {EMOTIONS.map((e) => (
          <button key={e.key}
            className={'emotion-item' + (emotion === e.key ? ' active' : '')}
            onClick={() => pickEmotion(e.key)}>
            <span className="emotion-face-wrap"><MoodFace emotion={e.key} size={50} /></span>
            <span className="emotion-name">{e.label}</span>
          </button>
        ))}
      </div>

      {emotion && feelingOptions.length > 0 && (
        <div className="feeling-section" style={{ '--feel-color': `var(--m-${emotion})` }}>
          <span className="feeling-label">再具体一点？<small>选填</small></span>
          <div className="feeling-select">
            {feelingOptions.map((f) => (
              <button key={f}
                className={'feeling-chip' + (feeling === f ? ' active' : '')}
                onClick={() => setFeeling(feeling === f ? '' : f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {emotion && (
        <div className="intensity-section">
          <span className="intensity-label">心情强度</span>
          <IntensitySlider value={intensity} color={`var(--m-${emotion})`} onChange={setIntensity} />
          <span className="intensity-tag">{['', '很轻', '轻微', '适中', '明显', '强烈'][intensity]}</span>
        </div>
      )}

      {emotion && (
        <div className="diary-section">
          <div className="diary-label-row">
            <span className="diary-label">写几句话（选填）</span>
            <span className={'diary-count' + (!diaryValid ? ' count-warn' : '')} style={!diaryValid ? { color: 'var(--color-seal)' } : null}>{diaryCount} 字</span>
          </div>
          <textarea className="diary-input" placeholder="此刻你想说什么...（若填写至少30字）" value={diary} onChange={(e) => setDiary(e.target.value)} />
        </div>
      )}

      {emotion && (
        <div className="visibility-section">
          <span className="visibility-label">谁可以看到</span>
          <div className="visibility-options">
            {VISIBILITY_OPTIONS.map((v) => (
              <div key={v.key} className={'visibility-item' + (visibility === v.key ? ' active' : '')} onClick={() => setVisibility(v.key)}>
                <span className="visibility-icon">{v.icon}</span>
                <span className="visibility-text">{v.label}</span>
              </div>
            ))}
          </div>
          {visibility === 'public' && <span className="visibility-tip">公开后，陌生人可以评论并与你成为笔友</span>}
        </div>
      )}

      {emotion && (
        <div className={'save-btn btn btn-primary' + (!diaryValid ? ' btn-disabled' : '')}
          onClick={() => diaryValid && onSave({ emotion, feeling, emotionLabel: feeling || EMOTION_LABEL[emotion], intensity, diary, visibility })}>
          {isEdit ? '更新心情' : '记录此刻'}
        </div>
      )}
    </div>
  );
}
