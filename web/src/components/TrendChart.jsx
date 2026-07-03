/* TrendChart（T5.3）：当月情绪走势折线（SVG），点选出虚线游标 + 放大点 + 下方详情。
   moods 由调用方传入（原型经 window.MOODS 全局查询，已去全局化）。 */
import { useState } from 'react';
import { fmtMonthDay } from '../utils/date.js';
import { MoodBadge, IntensityDots } from './primitives.jsx';

const LEGEND = [['happy', '开心'], ['calm', '平静'], ['sad', '难过'], ['anxious', '焦虑'], ['mixed', '复杂']];

export function TrendChart({ data, moods = [] }) {
  const lastRec = (() => {
    for (let i = data.length - 1; i >= 0; i--) if (data[i].v > 0) return i;
    return data.length - 1;
  })();
  const [sel, setSel] = useState(lastRec);
  const W = 330, H = 140, padX = 6, padY = 14;
  const colorOf = (e) => (e ? `var(--m-${e})` : 'var(--color-ink-secondary)');
  const pts = data.map((d, i) => ({
    x: padX + (i * (W - padX * 2)) / (data.length - 1),
    y: d.v === 0 ? null : padY + (1 - (d.v - 1) / 4) * (H - padY * 2),
    ...d,
  }));
  // 断点分段（无记录日折线断开）
  const segs = [];
  let cur = [];
  pts.forEach((p) => {
    if (p.y === null) { if (cur.length) segs.push(cur); cur = []; }
    else cur.push(p);
  });
  if (cur.length) segs.push(cur);

  // 全量心情记录查表（feeling + diary）：优先全日期，兼容 M-DD
  const norm = (d) => d.split('-').map((s) => s.padStart(2, '0')).join('-');
  const moodByDate = {};
  const moodByFull = {};
  moods.forEach((m) => { moodByDate[m.date.slice(5)] = m; moodByFull[m.date] = m; });

  const selP = pts[sel] || pts[pts.length - 1];
  const selMood = selP ? (selP.date ? moodByFull[selP.date] : moodByDate[norm(selP.d)]) : null;
  const selDiary = selMood ? selMood.diary : selP && selP.note;
  const selFeeling = selMood ? selMood.feeling : null;
  // 轴标签：每 5 天 + 末位
  const labelIdx = pts.map((p, i) => i).filter((i) => i % 5 === 0 || i === pts.length - 1);

  return (
    <div className="trend-wrap">
      <div className="trend-plot">
        <svg className="trend-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {[0, 1, 2, 3].map((g) => (
            <line key={g} x1={padX} x2={W - padX} y1={padY + g * (H - padY * 2) / 3} y2={padY + g * (H - padY * 2) / 3}
              stroke="var(--hairline)" strokeWidth="1" strokeDasharray="2 4" />
          ))}
          {selP && selP.y !== null && (
            <line className="trend-cursor" x1={selP.x} x2={selP.x} y1={padY} y2={H - padY}
              stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="3 3" />
          )}
          {segs.map((seg, si) => (
            <polyline key={si} fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinejoin="round"
              points={seg.map((p) => `${p.x},${p.y}`).join(' ')} />
          ))}
          {pts.filter((p) => p.y !== null).map((p) => (
            <circle key={p.d} cx={p.x} cy={p.y} r={p.d === selP.d ? 5 : 3.5}
              fill={colorOf(p.e)} stroke="var(--color-card)" strokeWidth={p.d === selP.d ? 2 : 1.5} />
          ))}
          {/* 放大的透明命中区 */}
          {pts.filter((p) => p.y !== null).map((p) => (
            <circle key={'h' + p.d} cx={p.x} cy={p.y} r="11" fill="transparent" style={{ cursor: 'pointer' }}
              onClick={() => setSel(data.findIndex((d) => d.d === p.d))} />
          ))}
        </svg>
        <div className="trend-xaxis">
          {labelIdx.map((i) => (
            <span key={i} style={{ left: (pts[i].x / W * 100) + '%' }}>{fmtMonthDay(pts[i].d)}</span>
          ))}
        </div>
      </div>
      <div className="trend-legend">
        {LEGEND.map(([k, lbl]) => (
          <span key={k}><i style={{ background: `var(--m-${k})` }} />{lbl}</span>
        ))}
      </div>
      {selP && (
        <div className="trend-detail" key={selP.d}>
          <div className="trend-detail-head">
            <span className="trend-detail-date">{fmtMonthDay(selP.d)}</span>
            <div className="trend-detail-right">
              <MoodBadge emotion={selP.e} feeling={selFeeling} withFace />
              <IntensityDots value={selP.v} size={8} />
            </div>
          </div>
          {selDiary
            ? <div className="trend-detail-diary">{selDiary}</div>
            : <div className="trend-detail-empty">这天记录了心情，但没有写下日记。</div>}
        </div>
      )}
      <div className="trend-hint">轻触圆点，回看那天的心情与日记</div>
    </div>
  );
}
