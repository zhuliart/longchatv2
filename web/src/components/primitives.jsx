/* 基础组件（T5.3，自原型 components.jsx 迁移，去 window 全局化）：
   Avatar / MoodFace / MoodBadge / IntensityDots / IntensitySlider */
import { useRef } from 'react';
import { EMOTION_LABEL } from '../constants/index.js';

export function Avatar({ name, className }) {
  return (
    <div className={'avatar' + (className ? ' ' + className : '')}>
      <span>{name ? name[0] : '匿'}</span>
    </div>
  );
}

/* ---------- 五情绪脸谱（粗几何 SVG） ---------- */
export function MoodFace({ emotion, size }) {
  const s = size || 56;
  const INK = '#2A2017';
  const eyeWhite = '#FFFFFF';
  const faces = {
    happy: (
      <g>
        <circle cx="24" cy="27" r="6" fill={eyeWhite} /><circle cx="40" cy="27" r="6" fill={eyeWhite} />
        <circle cx="24" cy="28" r="3" fill={INK} /><circle cx="40" cy="28" r="3" fill={INK} />
        <circle cx="16" cy="36" r="3.5" fill="#fff" opacity=".35" /><circle cx="48" cy="36" r="3.5" fill="#fff" opacity=".35" />
        <path d="M21 39 Q32 50 43 39" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      </g>
    ),
    calm: (
      <g>
        <path d="M18 28 Q24 23 30 28" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M34 28 Q40 23 46 28" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M24 40 Q32 45 40 40" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      </g>
    ),
    sad: (
      <g>
        <circle cx="24" cy="29" r="6" fill={eyeWhite} /><circle cx="40" cy="29" r="6" fill={eyeWhite} />
        <circle cx="24" cy="31" r="3" fill={INK} /><circle cx="40" cy="31" r="3" fill={INK} />
        <path d="M44 35 q3 5 0 8 q-3 -3 0 -8 Z" fill="#7FB4E6" />
        <path d="M23 46 Q32 38 41 46" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      </g>
    ),
    anxious: (
      <g>
        <path d="M18 22 L29 25" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M46 22 L35 25" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <circle cx="24" cy="31" r="5.5" fill={eyeWhite} /><circle cx="40" cy="31" r="5.5" fill={eyeWhite} />
        <circle cx="24" cy="31" r="2.6" fill={INK} /><circle cx="40" cy="31" r="2.6" fill={INK} />
        <path d="M22 43 q3 -4 6 0 t6 0 t6 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
    mixed: (
      <g>
        <circle cx="24" cy="29" r="5.5" fill={eyeWhite} /><circle cx="24" cy="29" r="2.8" fill={INK} />
        <path d="M35 29 Q40 25 45 29" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M23 42 q4 -3 8 0 t8 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  };
  return (
    <svg className="mood-face" width={s} height={s} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill={`var(--m-${emotion})`} />
      {faces[emotion] || faces.calm}
    </svg>
  );
}

export function MoodBadge({ emotion, label, feeling, withFace }) {
  return (
    <span className={'mood-badge mood-' + emotion + (withFace ? ' has-face' : '')}>
      {withFace && <MoodFace emotion={emotion} size={18} />}
      {feeling || label || EMOTION_LABEL[emotion]}
    </span>
  );
}

export function IntensityDots({ value, size, onPick }) {
  return (
    <div className="intensity-dots">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={'intensity-dot' + (i <= value ? ' filled' : '')}
          style={size ? { width: size, height: size } : null}
          onClick={onPick ? () => onPick(i) : null}
        />
      ))}
    </div>
  );
}

/* ---------- 强度滑杆（1–5，可拖拽：填充条 + 点刻度 + 圆钮） ---------- */
export function IntensitySlider({ value, color, onChange }) {
  const trackRef = useRef(null);
  const STEPS = 5;
  const accent = color || 'var(--color-accent)';

  function valueFromClientX(clientX) {
    const el = trackRef.current;
    if (!el) return value;
    const r = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return Math.min(STEPS, Math.max(1, Math.round(ratio * (STEPS - 1)) + 1));
  }
  function startDrag(e) {
    e.preventDefault();
    const move = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const v = valueFromClientX(cx);
      if (v !== value) onChange(v);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    move(e);
  }

  const pct = ((value - 1) / (STEPS - 1)) * 100;
  return (
    <div className="intensity-slider" ref={trackRef} onPointerDown={startDrag}>
      <div className="islider-track">
        <div className="islider-fill" style={{ width: pct + '%', background: accent }} />
        <div className="islider-dots">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={'islider-dot' + (i <= value ? ' on' : '')} />
          ))}
        </div>
        <div className="islider-knob" style={{ left: pct + '%', borderColor: accent }}>
          <span style={{ background: accent }} />
        </div>
      </div>
    </div>
  );
}
