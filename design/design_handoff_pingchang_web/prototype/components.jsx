/* components.jsx — shared UI components (exported to window) */
const { useState, useEffect, useRef } = React;

/* word counter — Chinese chars + english words + digit groups */
function countWords(text) {
  if (!text) return 0;
  const t = text.trim();
  if (!t) return 0;
  const cn = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = (t.match(/[a-zA-Z]+/g) || []).length;
  const num = (t.match(/\d+/g) || []).length;
  return cn + en + num;
}

/* ---------- Status bar ---------- */
function StatusBar({ dark }) {
  return (
    <div className={"statusbar" + (dark ? " on-dark" : "")}>
      <span>9:41</span>
      <span className="sb-icons">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="6" width="3" height="5" rx="1"/><rect x="4.5" y="4" width="3" height="7" rx="1"/><rect x="9" y="2" width="3" height="9" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M8 2.2c2 0 3.8.8 5.2 2l1.1-1.2C12.6 1.3 10.4.4 8 .4S3.4 1.3 1.7 3l1.1 1.2C4.2 3 6 2.2 8 2.2z" opacity=".9"/><path d="M8 5.2c1.2 0 2.3.5 3.1 1.3l1.1-1.2C11.2 4.2 9.7 3.6 8 3.6s-3.2.6-4.2 1.7l1.1 1.2C5.7 5.7 6.8 5.2 8 5.2z"/><circle cx="8" cy="9" r="1.6"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="8" rx="1.5" fill="currentColor"/><rect x="23" y="4" width="1.5" height="4" rx="0.75" fill="currentColor" opacity=".5"/></svg>
      </span>
    </div>
  );
}

/* ---------- Nav bar (sub pages) ---------- */
function NavBar({ title, onBack }) {
  return (
    <div className="navbar">
      <button className="nav-back" onClick={onBack}>‹<span>返回</span></button>
      <div className="navbar-title">{title}</div>
    </div>
  );
}

/* ---------- Tab bar ---------- */
const TABS = [
  { key: "home", label: "此刻", glyph: "❀" },
  { key: "inbox", label: "信箱", glyph: "✉" },
  { key: "journey", label: "旅程", glyph: "❍" },
  { key: "me", label: "我的", glyph: "❖" },
];
function TabBar({ active, onChange, onCompose, composeOpen }) {
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);
  return (
    <div className="tabbar">
      <svg className="tabbar-bg" viewBox="0 0 393 72" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,0 L393,0 L393,72 L0,72 Z" />
      </svg>
      <div className="tabbar-row">
        {left.map((t) => (
          <button key={t.key} className={"tabbar-item" + (active === t.key ? " active" : "")} onClick={() => onChange(t.key)}>
            <span className="glyph">{t.glyph}</span>
            <span>{t.label}</span>
          </button>
        ))}
        <button className={"tabbar-item tabbar-center-item" + (composeOpen ? " is-open" : "")} onClick={onCompose}>
          <span className="center-glyph">{composeOpen ? "✕" : "✎"}</span>
          <span>{composeOpen ? "收起" : "写信"}</span>
        </button>
        {right.map((t) => (
          <button key={t.key} className={"tabbar-item" + (active === t.key ? " active" : "")} onClick={() => onChange(t.key)}>
            <span className="glyph">{t.glyph}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* expanding radial compose menu */
function ComposeMenu({ open, onClose, onPick }) {
  const actions = [
    { key: "mood", icon: "✶", label: "记心情", pos: "pos-q1", go: () => onPick("home") },
    { key: "draft", icon: "❏", label: "草稿箱", pos: "pos-q2", go: () => onPick("inbox", { tab: "draft" }) },
    { key: "write", icon: "✎", label: "写信", pos: "pos-q3", primary: true, go: () => onPick("write", { isFirst: true }) },
    { key: "plaza", icon: "✿", label: "心情广场", pos: "pos-q4", go: () => onPick("journey", { tab: "feed" }) },
    { key: "match", icon: "☾", label: "找笔友", pos: "pos-q5", go: () => onPick("match") },
  ];
  return (
    <div className={"compose-overlay" + (open ? " open" : "")} aria-hidden={!open}>
      <div className="compose-backdrop" onClick={onClose} />
      <div className="compose-title">想做些什么<small>慢慢来，不必着急</small></div>
      {actions.map((a) => (
        <div key={a.key} className={"compose-action " + a.pos + (a.primary ? " primary" : "")}>
          <button className="compose-bubble" onClick={a.go}>{a.icon}</button>
          <span className="compose-clabel">{a.label}</span>
        </div>
      ))}
    </div>
  );
}

function Avatar({ name, className }) {
  return <div className={"avatar" + (className ? " " + className : "")}><span>{name ? name[0] : "匿"}</span></div>;
}

/* ---------- Emoji mood faces (bold geometric) ---------- */
function MoodFace({ emotion, size }) {
  const s = size || 56;
  const INK = "#2A2017";
  const eyeWhite = "#FFFFFF";
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

function MoodBadge({ emotion, label, feeling, withFace }) {
  return (
    <span className={"mood-badge mood-" + emotion + (withFace ? " has-face" : "")}>
      {withFace && <MoodFace emotion={emotion} size={18} />}
      {feeling || label || EMOTION_LABEL[emotion]}
    </span>
  );
}

function IntensityDots({ value, size, onPick }) {
  return (
    <div className="intensity-dots">
      {[1,2,3,4,5].map((i) => (
        <div key={i}
          className={"intensity-dot" + (i <= value ? " filled" : "")}
          style={size ? { width: size, height: size } : null}
          onClick={onPick ? () => onPick(i) : null} />
      ))}
    </div>
  );
}

/* draggable intensity slider — filled bar + dotted remainder + round knob */
function IntensitySlider({ value, color, onChange }) {
  const trackRef = useRef(null);
  const STEPS = 5;
  const accent = color || "var(--color-accent)";

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
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    move(e);
  }

  const pct = ((value - 1) / (STEPS - 1)) * 100;
  return (
    <div className="intensity-slider" ref={trackRef} onPointerDown={startDrag}>
      <div className="islider-track">
        <div className="islider-fill" style={{ width: pct + "%", background: accent }} />
        <div className="islider-dots">
          {[1,2,3,4,5].map((i) => (
            <span key={i} className={"islider-dot" + (i <= value ? " on" : "")} />
          ))}
        </div>
        <div className="islider-knob" style={{ left: pct + "%", borderColor: accent }}>
          <span style={{ background: accent }} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Soul card ---------- */
function scoreColor(s) {
  if (s >= 85) return "var(--m-happy)";
  if (s >= 75) return "var(--color-accent)";
  return "var(--color-gold)";
}
function SoulCard({ item, mini, onClick }) {
  const p = item.profile;
  return (
    <div className={"soul-card" + (mini ? " mini" : "")} onClick={onClick}>
      <div className="soul-card-top">
        <Avatar name={p.nickname} />
        <div style={{ minWidth: 0 }}>
          <div className="soul-name">{p.nickname}</div>
          {p.isActiveRecently && <span style={{ fontSize: 11, color: "var(--m-calm)" }}>· 近期活跃</span>}
        </div>
        <div className="soul-score" style={{ color: scoreColor(item.score) }}>
          <div><span className="num">{item.score}</span><span className="pct">%</span></div>
          <span className="lbl">契合</span>
        </div>
      </div>
      <div className="soul-intro text-clamp-2">{p.intro}</div>
      <div className="soul-tags">
        {p.tags.slice(0, mini ? 3 : 5).map((t) => (
          <span key={t} className={"tag" + (item.tagsCommon.includes(t) ? " tag-common" : "")}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Envelope card ---------- */
function EnvelopeCard({ letter, sent, onClick }) {
  const name = sent ? letter.receiverNickname : letter.senderNickname;
  const unread = !sent && letter.status === "sent";
  return (
    <div className="envelope-card" onClick={onClick}>
      {unread && <span className="unread-dot" />}
      <Avatar name={name} />
      <div className="envelope-body">
        <div className="envelope-row">
          <span className="envelope-name">{sent ? "致 " + name : name}</span>
          <span className="envelope-time">{letter.timeDisplay}</span>
        </div>
        {letter.title && <div className="envelope-subject text-clamp-2">{letter.title}</div>}
        <div className="envelope-excerpt text-clamp-2">{letter.excerpt}</div>
        <div className="envelope-meta">
          <span className="envelope-words">{letter.word_count} 字</span>
          {unread && <span className="date-pill new">未读</span>}
          {sent && (
            <span className={"status-chip " + (letter.status === "read" ? "status-read" : "status-sent")}>
              {letter.status === "read" ? "已读" : "已寄出"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Draft card ---------- */
function DraftCard({ draft, onClick, onDelete }) {
  const hasRecipient = !!draft.receiverNickname;
  const remaining = Math.max(0, (draft.required || 0) - draft.word_count);
  return (
    <div className="envelope-card draft-card" onClick={onClick}>
      <Avatar name={hasRecipient ? draft.receiverNickname : "…"} />
      <div className="envelope-body">
        <div className="envelope-row">
          <span className="envelope-name">{hasRecipient ? "致 " + draft.receiverNickname : "未指定收信人"}</span>
          <span className="envelope-time">{draft.timeDisplay}</span>
        </div>
        {draft.title
          ? <div className="envelope-subject text-clamp-2">{draft.title}</div>
          : <div className="envelope-subject draft-untitled">无标题草稿</div>}
        <div className="envelope-excerpt text-clamp-2">{draft.excerpt}</div>
        <div className="envelope-meta">
          <span className="envelope-words">{draft.word_count} 字</span>
          <span className="status-chip status-draft">草稿</span>
          {remaining > 0 && <span className="draft-remaining">还差 {remaining} 字</span>}
          <span className="draft-continue">继续写 ›</span>
        </div>
      </div>
      <button className="draft-del" onClick={(e) => { e.stopPropagation(); onDelete && onDelete(draft._id); }} aria-label="删除草稿">✕</button>
    </div>
  );
}

/* ---------- Mood widget ---------- */
function MoodWidget({ existing, onSave, lockContent }) {
  const [emotion, setEmotion] = useState(existing ? existing.emotion : "");
  const [feeling, setFeeling] = useState(existing && existing.feeling ? existing.feeling : "");
  const [intensity, setIntensity] = useState(existing ? existing.intensity : 3);
  const [diary, setDiary] = useState(existing ? existing.diary || "" : "");
  const [visibility, setVisibility] = useState(existing ? existing.visibility || "private" : "private");
  const diaryCount = countWords(diary);
  const diaryValid = diaryCount === 0 || diaryCount >= 30;
  const isEdit = !!existing;
  const feelingOptions = (window.EMOTION_FEELINGS && window.EMOTION_FEELINGS[emotion]) || [];

  function pickEmotion(key) {
    setEmotion(key);
    setFeeling(""); // reset refinement when the primary changes
  }

  // Past entries are immutable history — only their visibility can change.
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
              <div key={v.key} className={"visibility-item" + (visibility === v.key ? " active" : "")} onClick={() => setVisibility(v.key)}>
                <span className="visibility-icon">{v.icon}</span>
                <span className="visibility-text">{v.label}</span>
              </div>
            ))}
          </div>
          {visibility === "public" && <span className="visibility-tip">公开后，陌生人可以评论并与你成为笔友</span>}
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
            className={"emotion-item" + (emotion === e.key ? " active" : "")}
            onClick={() => pickEmotion(e.key)}>
            <span className="emotion-face-wrap"><MoodFace emotion={e.key} size={50} /></span>
            <span className="emotion-name">{e.label}</span>
          </button>
        ))}
      </div>

      {emotion && feelingOptions.length > 0 && (
        <div className="feeling-section" style={{ "--feel-color": `var(--m-${emotion})` }}>
          <span className="feeling-label">再具体一点？<small>选填</small></span>
          <div className="feeling-select">
            {feelingOptions.map((f) => (
              <button key={f}
                className={"feeling-chip" + (feeling === f ? " active" : "")}
                onClick={() => setFeeling(feeling === f ? "" : f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {emotion && (
        <div className="intensity-section">
          <span className="intensity-label">心情强度</span>
          <IntensitySlider value={intensity} color={EMOTIONS.find((e) => e.key === emotion) ? EMOTIONS.find((e) => e.key === emotion).color : null} onChange={setIntensity} />
          <span className="intensity-tag">{["", "很轻", "轻微", "适中", "明显", "强烈"][intensity]}</span>
        </div>
      )}

      {emotion && (
        <div className="diary-section">
          <div className="diary-label-row">
            <span className="diary-label">写几句话（选填）</span>
            <span className={"diary-count" + (!diaryValid ? " count-warn" : "")} style={!diaryValid ? { color: "var(--color-seal)" } : null}>{diaryCount} 字</span>
          </div>
          <textarea className="diary-input" placeholder="此刻你想说什么...（若填写至少30字）" value={diary} onChange={(e) => setDiary(e.target.value)} />
        </div>
      )}

      {emotion && (
        <div className="visibility-section">
          <span className="visibility-label">谁可以看到</span>
          <div className="visibility-options">
            {VISIBILITY_OPTIONS.map((v) => (
              <div key={v.key} className={"visibility-item" + (visibility === v.key ? " active" : "")} onClick={() => setVisibility(v.key)}>
                <span className="visibility-icon">{v.icon}</span>
                <span className="visibility-text">{v.label}</span>
              </div>
            ))}
          </div>
          {visibility === "public" && <span className="visibility-tip">公开后，陌生人可以评论并与你成为笔友</span>}
        </div>
      )}

      {emotion && (
        <div className={"save-btn btn btn-primary" + (!diaryValid ? " btn-disabled" : "")}
          onClick={() => diaryValid && onSave({ emotion, feeling, emotionLabel: feeling || EMOTION_LABEL[emotion], intensity, diary, visibility, date: "2026-06-04" })}>
          {isEdit ? "更新心情" : "记录此刻"}
        </div>
      )}
    </div>
  );
}

/* ---------- Trend chart (SVG line) ---------- */
function TrendChart({ data }) {
  const lastRec = (() => { for (let i = data.length - 1; i >= 0; i--) if (data[i].v > 0) return i; return data.length - 1; })();
  const [sel, setSel] = useState(lastRec);
  const W = 330, H = 140, padX = 6, padY = 14;
  const colorOf = (e) => e ? `var(--m-${e})` : "var(--color-ink-secondary)";
  const pts = data.map((d, i) => ({
    x: padX + (i * (W - padX * 2)) / (data.length - 1),
    y: d.v === 0 ? null : padY + (1 - (d.v - 1) / 4) * (H - padY * 2),
    ...d,
  }));
  // build segments skipping breaks
  const segs = [];
  let cur = [];
  pts.forEach((p) => {
    if (p.y === null) { if (cur.length) segs.push(cur); cur = []; }
    else cur.push(p);
  });
  if (cur.length) segs.push(cur);
  const legend = [["happy","开心"],["calm","平静"],["sad","难过"],["anxious","焦虑"],["mixed","复杂"]];

  // lookup full mood records (feeling + diary) by full date when available,
  // else fall back to M-DD matching for legacy data.
  const norm = (d) => d.split("-").map((s) => s.padStart(2, "0")).join("-");
  const moodByDate = {};
  const moodByFull = {};
  (window.MOODS || []).forEach((m) => { moodByDate[m.date.slice(5)] = m; moodByFull[m.date] = m; });
  const fmtDate = (d) => { const a = d.split("-"); return parseInt(a[0], 10) + "月" + parseInt(a[1], 10) + "日"; };

  const selP = pts[sel] || pts[pts.length - 1];
  const selMood = selP ? (selP.date ? moodByFull[selP.date] : moodByDate[norm(selP.d)]) : null;
  const selDiary = selMood ? selMood.diary : (selP && selP.note);
  const selFeeling = selMood ? selMood.feeling : null;
  // axis labels every 5 days + last
  const labelIdx = pts.map((p, i) => i).filter((i) => i % 5 === 0 || i === pts.length - 1);

  return (
    <div className="trend-wrap">
      <div className="trend-plot">
        <svg className="trend-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {[0,1,2,3].map((g) => (
            <line key={g} x1={padX} x2={W-padX} y1={padY + g*(H-padY*2)/3} y2={padY + g*(H-padY*2)/3}
              stroke="var(--hairline)" strokeWidth="1" strokeDasharray="2 4" />
          ))}
          {selP && selP.y !== null && (
            <line className="trend-cursor" x1={selP.x} x2={selP.x} y1={padY} y2={H-padY}
              stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="3 3" />
          )}
          {segs.map((seg, si) => (
            <polyline key={si} fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinejoin="round"
              points={seg.map((p) => `${p.x},${p.y}`).join(" ")} />
          ))}
          {pts.filter((p) => p.y !== null).map((p) => (
            <circle key={p.d} cx={p.x} cy={p.y} r={p.d === selP.d ? 5 : 3.5}
              fill={colorOf(p.e)} stroke="var(--color-card)" strokeWidth={p.d === selP.d ? 2 : 1.5} />
          ))}
          {/* enlarged transparent hit targets */}
          {pts.filter((p) => p.y !== null).map((p) => (
            <circle key={"h" + p.d} cx={p.x} cy={p.y} r="11" fill="transparent" style={{ cursor: "pointer" }}
              onClick={() => setSel(data.findIndex((d) => d.d === p.d))} />
          ))}
        </svg>
        <div className="trend-xaxis">
          {labelIdx.map((i) => (
            <span key={i} style={{ left: (pts[i].x / W * 100) + "%" }}>{fmtDate(pts[i].d)}</span>
          ))}
        </div>
      </div>
      <div className="trend-legend">
        {legend.map(([k, lbl]) => (
          <span key={k}><i style={{ background: `var(--m-${k})` }} />{lbl}</span>
        ))}
      </div>
      {selP && (
        <div className="trend-detail" key={selP.d}>
          <div className="trend-detail-head">
            <span className="trend-detail-date">{fmtDate(selP.d)}</span>
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

Object.assign(window, {
  countWords, StatusBar, NavBar, TabBar, TABS, ComposeMenu, Avatar, MoodBadge, MoodFace, IntensityDots, IntensitySlider,
  SoulCard, EnvelopeCard, DraftCard, MoodWidget, TrendChart, scoreColor,
});
