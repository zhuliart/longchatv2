/* screens2.jsx — Journey, Match, PeerProfile, MyProfile, Onboarding, Edit */
const { useState: useState2 } = React;

/* ============================ JOURNEY (情绪旅程) ============================ */
function buildCalendar(year, month, moods) {
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const byDay = {};
  moods.forEach((m) => {
    const a = m.date.split("-");
    if (+a[0] === year && +a[1] === month) byDay[parseInt(a[2], 10)] = m;
  });
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push({ d, mood: byDay[d] });
  return cells;
}
const pad2 = (n) => String(n).padStart(2, "0");

// Build a month's day-by-day emotion trend from the mood records.
function buildTrend(year, month, moods) {
  const days = new Date(year, month, 0).getDate();
  const byDay = {};
  moods.forEach((m) => {
    const a = m.date.split("-");
    if (+a[0] === year && +a[1] === month) byDay[parseInt(a[2], 10)] = m;
  });
  const arr = [];
  for (let d = 1; d <= days; d++) {
    const mo = byDay[d];
    arr.push({
      d: month + "-" + pad2(d),
      date: year + "-" + pad2(month) + "-" + pad2(d),
      v: mo ? mo.intensity : 0,
      e: mo ? mo.emotion : null,
    });
  }
  return arr;
}

function JourneyScreen({ nav, moods, initialTab, initialDate }) {
  const init = (initialDate || "").split("-");
  const hasInit = init.length === 3;
  const [tab, setTab] = useState2(initialTab === "feed" ? "feed" : "mine");
  const [year, setYear] = useState2(hasInit ? +init[0] : 2026);
  const [month, setMonth] = useState2(hasInit ? +init[1] : 6);
  const [selDay, setSelDay] = useState2(hasInit ? +init[2] : 4);
  const [comments, setComments] = useState2(null); // mood obj when open
  const [moodList, setMoodList] = useState2(moods);
  const [editing, setEditing] = useState2(false);
  const cells = buildCalendar(year, month, moodList);
  const selDate = year + "-" + pad2(month) + "-" + pad2(selDay);
  const selMood = moodList.find((m) => m.date === selDate);
  const isToday = (d) => year === 2026 && month === 6 && d === 4;
  const todayNum = 2026 * 10000 + 6 * 100 + 4;
  const isPast = (year * 10000 + month * 100 + selDay) < todayNum;

  function shiftMonth(delta) {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y -= 1; } else if (m > 12) { m = 1; y += 1; }
    setYear(y); setMonth(m); setSelDay(1);
  }

  function saveMood(m) {
    const updated = Object.assign({}, selMood, m, { date: selMood.date, _id: selMood._id });
    setMoodList((arr) => arr.map((x) => x._id === selMood._id ? updated : x));
    const gi = window.MOODS.findIndex((x) => x._id === selMood._id);
    if (gi > -1) window.MOODS[gi] = updated;
    setEditing(false);
  }

  return (
    <div className="page">
      <StatusBar />
      <div className="seg-tabs">
        <div className={"seg-tab" + (tab === "mine" ? " active" : "")} onClick={() => setTab("mine")}>我的旅程</div>
        <div className={"seg-tab" + (tab === "feed" ? " active" : "")} onClick={() => setTab("feed")}>心情广场</div>
      </div>

      <div className="page-scroll" style={{ paddingBottom: 24 }} key={tab}>
        {tab === "mine" && (
          <div className="tab-fade">
            <div className="month-picker">
              <div className="month-arrow" onClick={() => shiftMonth(-1)}>‹</div>
              <span className="month-label">{year}年{month}月</span>
              <div className="month-arrow" onClick={() => shiftMonth(1)}>›</div>
            </div>

            <div className="calendar">
              <div className="cal-weekdays">{["日","一","二","三","四","五","六"].map((w) => <span key={w}>{w}</span>)}</div>
              <div className="cal-grid">
                {cells.map((c, i) => c === null ? <div key={i} className="cal-cell empty" /> : (
                  <div key={i}
                    className={"cal-cell" + (c.mood ? " has-mood" : "") + (c.d === selDay ? " selected" : "") + (isToday(c.d) ? " today" : "")}
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
                    <div className="action-pill" onClick={() => setEditing(true)}>{isPast ? "修改可见性" : "修改心情"}</div>
                    {selMood.visibility === "public" && <div className="action-pill" onClick={() => setComments(FEED.find((f) => f.diary === selMood.diary) || FEED[0])}>评论 ({selMood.commentCount})</div>}
                  </div>
                </div>
              ) : (
                <div className="card fade-in" key={"e" + selDay}>
                  <div style={{ textAlign: "center", color: "var(--color-ink-secondary)", fontFamily: "var(--font-serif)", padding: "8px 0" }}>{month}月{selDay}日 没有情绪记录</div>
                </div>
              )}
            </div>

            <div className="section">
              <div className="section-header"><span className="section-title">{year}年{month}月 情绪走势</span></div>
              <div className="card"><TrendChart key={year + "-" + month} data={buildTrend(year, month, moodList)} /></div>
            </div>
          </div>
        )}

        {tab === "feed" && (
          <div className="tab-fade" style={{ padding: "14px 16px 0" }}>
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
            <div style={{ textAlign: "center", color: "var(--color-ink-secondary)", fontSize: 12, padding: "12px 0", fontFamily: "var(--font-serif)" }}>— 已到底部 —</div>
          </div>
        )}
      </div>

      {comments && <CommentsSheet mood={comments} onClose={() => setComments(null)} />}
      {editing && selMood && (
        <div className="sheet-mask" onClick={() => setEditing(false)}>
          <div className="sheet edit-mood-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">{isPast ? "修改可见性" : "修改"} {month}月{selDay}日 的心情</span>
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

function CommentsSheet({ mood, onClose }) {
  const [list, setList] = useState2(mood.comments || []);
  const [input, setInput] = useState2("");
  function send() {
    if (!input.trim()) return;
    setList([...list, { _id: "c" + Date.now(), fromNickname: "拾光", content: input.trim(), created_at: "刚刚", parent_id: null }]);
    setInput("");
  }
  return (
    <React.Fragment>
      <div className="sheet-mask" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-header">
          <span className="sheet-title">评论</span>
          <span className="sheet-close" onClick={onClose}>✕</span>
        </div>
        <div className="sheet-scroll">
          {list.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--color-ink-secondary)", padding: "32px 0", fontFamily: "var(--font-serif)" }}>暂无评论，来说第一句话吧</div>
          ) : list.map((c) => (
            <div key={c._id} className={"comment-item" + (c.parent_id ? " reply" : "")}>
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
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
            <div className="comment-send" onClick={send}>发送</div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============================ MATCH (灵魂推荐) ============================ */
function MatchScreen({ nav, back }) {
  const [list, setList] = useState2(MATCHES);
  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title="灵魂推荐" onBack={back} />
      <div className="page-scroll" style={{ paddingBottom: 24 }}>
        <div className="home-header" style={{ paddingTop: 18 }}>
          <div className="home-title" style={{ fontSize: 24, letterSpacing: ".12em" }}>今日灵魂推荐</div>
          <div className="home-tagline" style={{ marginTop: 8 }}>每日更新，真诚相遇</div>
        </div>
        {list.length > 0 ? list.map((m) => (
          <div className="rec-item" key={m._id}>
            <SoulCard item={m} onClick={() => nav("peer", { uid: m.profile._id })} />
            <div className="rec-actions">
              <div className="btn btn-ghost" onClick={() => setList(list.filter((x) => x._id !== m._id))}>跳过</div>
              <div className="btn btn-primary" onClick={() => nav("write", { targetNickname: m.profile.nickname, isFirst: true })}>写信给TA</div>
            </div>
          </div>
        )) : (
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <span className="empty-icon">☽</span>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 17, color: "var(--color-ink)" }}>今天的推荐已看完</span>
            <span className="empty-sub">明天还会有新的灵魂与你相遇</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ PEER PROFILE (对方主页) ============================ */
function PeerProfileScreen({ params, nav, back }) {
  const match = MATCHES.find((m) => m.profile._id === params.uid) || MATCHES[0];
  const p = match.profile;
  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title="TA 的主页" onBack={back} />
      <div className="page-scroll">
        <div className="profile-header peer">
          <Avatar name={p.nickname} />
          <div className="profile-name">{p.nickname}</div>
          {p.isActiveRecently && <span className="active-badge">近期活跃</span>}
        </div>
        <div className="section">
          <div className="card">
            <span className="section-label">兴趣标签</span>
            <div className="tags-wrap">
              {p.tags.map((t) => <span key={t} className={"tag" + (match.tagsCommon.includes(t) ? " tag-common" : "")}>{t}</span>)}
            </div>
          </div>
        </div>
        <div className="section">
          <div className="card">
            <span className="section-label">关于 TA</span>
            <div className="intro-text">{p.intro}</div>
          </div>
        </div>
        {p.recentExcerpt && (
          <div className="section">
            <div className="card">
              <span className="section-label">最近写道</span>
              <div className="excerpt-text">“{p.recentExcerpt}”</div>
              <span className="excerpt-note">（节选自最近一封信）</span>
            </div>
          </div>
        )}
        <div className="section" style={{ marginBottom: 16 }}>
          <div className="card">
            <div className="pref-row"><span className="pref-label">活跃时段</span><span className="pref-value">{ACTIVE_TIME_LABEL[p.active_time]}</span></div>
            <div className="pref-row"><span className="pref-label">书信频率</span><span className="pref-value">{LETTER_FREQ_LABEL[p.letter_freq]}</span></div>
          </div>
        </div>
      </div>
      <div className="action-bar">
        <div className="btn btn-ghost" onClick={back}>跳过</div>
        <div className="btn btn-primary" onClick={() => nav("write", { targetNickname: p.nickname, isFirst: true })}>写信给TA</div>
      </div>
    </div>
  );
}

/* ============================ MY PROFILE (我的) ============================ */
function MyProfileScreen({ nav, onLogout }) {
  return (
    <div className="page">
      <StatusBar />
      <div className="page-scroll tab-fade" style={{ paddingBottom: 24 }}>
        <div className="my-header">
          <Avatar name={ME.nickname} className="" />
          <div className="my-info">
            <div className="my-name">{ME.nickname}</div>
            <div className="my-intro text-clamp-2">{ME.intro}</div>
          </div>
          <div className="mood-edit-btn" onClick={() => nav("edit")}>编辑</div>
        </div>
        <div className="my-tags">{ME.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>

        <div className="card stats-section">
          <div className="stat-item" onClick={() => nav("inbox")}><span className="stat-num">{STATS.lettersSent}</span><span className="stat-label">已发出</span></div>
          <div className="stat-divider" />
          <div className="stat-item" onClick={() => nav("inbox")}><span className="stat-num">{STATS.lettersReceived}</span><span className="stat-label">已收到</span></div>
          <div className="stat-divider" />
          <div className="stat-item" onClick={() => nav("journey")}><span className="stat-num">{STATS.moodDays}</span><span className="stat-label">记录天数</span></div>
        </div>

        <div className="card menu-section">
          <div className="menu-item" onClick={() => nav("inbox")}><span className="menu-icon">✉</span><span className="menu-label">已发出的信</span><span className="menu-arrow">›</span></div>
          <div className="menu-item" onClick={() => nav("journey")}><span className="menu-icon">❍</span><span className="menu-label">情绪旅程</span><span className="menu-arrow">›</span></div>
          <div className="menu-item" onClick={() => nav("edit")}><span className="menu-icon">✎</span><span className="menu-label">编辑资料</span><span className="menu-arrow">›</span></div>
          <div className="menu-item" onClick={() => nav("onboarding")}><span className="menu-icon">✦</span><span className="menu-label">重看注册引导</span><span className="menu-arrow">›</span></div>
          <div className="menu-item menu-danger" onClick={onLogout}><span className="menu-icon">⇠</span><span className="menu-label">退出登录</span><span className="menu-arrow">›</span></div>
        </div>

        <div className="card member-section">
          <div>
            <div className="member-title">{ME.is_member ? "会员用户" : "普通用户"}</div>
            <div className="member-sub">{ME.is_member ? "每日 5 位灵魂推荐" : "每日 3 位灵魂推荐"}</div>
          </div>
          {!ME.is_member && <div className="member-upgrade">升级会员</div>}
        </div>
      </div>
    </div>
  );
}

/* ============================ EDIT (编辑资料) ============================ */
function EditScreen({ back, toast }) {
  const [nickname, setNickname] = useState2(ME.nickname);
  const [intro, setIntro] = useState2(ME.intro);
  const [tags, setTags] = useState2(ME.tags);
  const introCount = countWords(intro);
  const introValid = introCount >= 20 && introCount <= 60;
  function toggleTag(t) {
    if (tags.includes(t)) setTags(tags.filter((x) => x !== t));
    else if (tags.length < 5) setTags([...tags, t]);
    else toast("最多选 5 个标签");
  }
  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title="编辑资料" onBack={back} />
      <div className="page-scroll">
        <div className="step-content">
          <div className="form-card card">
            <span className="form-label">昵称</span>
            <input className="form-input" maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div className="form-card card">
            <div className="form-label-row">
              <span className="form-label">一句话介绍</span>
              <span className={"form-count" + (introValid ? " ok" : "")}>{introCount} / 20-60字</span>
            </div>
            <textarea className="form-input form-textarea" value={intro} onChange={(e) => setIntro(e.target.value)} />
          </div>
          <div className="form-card card">
            <span className="form-label">兴趣标签 · 已选 {tags.length}</span>
            <div className="tags-grid" style={{ marginTop: 12, marginBottom: 0 }}>
              {PRESET_TAGS.map((t) => (
                <div key={t} className={"tag-option" + (tags.includes(t) ? " selected" : "")} onClick={() => toggleTag(t)}>{t}</div>
              ))}
            </div>
          </div>
          <div className="btn btn-primary" style={{ width: "100%" }} onClick={() => { toast("资料已更新"); back(); }}>保存</div>
        </div>
      </div>
    </div>
  );
}

/* ============================ ONBOARDING (注册引导) ============================ */
function OnboardingScreen({ back, toast }) {
  const [step, setStep] = useState2(1);
  const [nickname, setNickname] = useState2("");
  const [intro, setIntro] = useState2("");
  const [tags, setTags] = useState2([]);
  const [activeTime, setActiveTime] = useState2("");
  const [freq, setFreq] = useState2("");
  const introCount = countWords(intro);
  const introValid = introCount >= 20 && introCount <= 60;

  function toggleTag(t) {
    if (tags.includes(t)) setTags(tags.filter((x) => x !== t));
    else if (tags.length < 5) setTags([...tags, t]);
    else toast("最多选 5 个标签");
  }
  function go2() { if (!nickname.trim()) return toast("请填写昵称"); if (!introValid) return toast("介绍需 20–60 字"); setStep(2); }
  function go3() { if (tags.length < 3) return toast("至少选 3 个标签"); setStep(3); }
  function finish() { toast("欢迎来到平常 ✦"); back(); }

  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title="注册引导" onBack={back} />
      <div className="progress-bar"><div className="progress-fill" style={{ width: (step / 3) * 100 + "%" }} /></div>
      <div className="step-indicator">{step} / 3</div>
      <div className="page-scroll">
        {step === 1 && (
          <div className="step-content tab-fade" key="1">
            <div className="step-header"><div className="step-title">建立你的精神身份证</div><div className="step-sub">让对的灵魂找到你</div></div>
            <div className="form-card card">
              <span className="form-label">你的名字</span>
              <input className="form-input" placeholder="给自己起个好听的名字" maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
            <div className="form-card card">
              <div className="form-label-row"><span className="form-label">一句话介绍</span><span className={"form-count" + (introValid ? " ok" : "")}>{introCount} / 20-60字</span></div>
              <textarea className="form-input form-textarea" placeholder="写下你的兴趣、性格或此刻的状态..." value={intro} onChange={(e) => setIntro(e.target.value)} />
            </div>
            <div className="btn btn-primary" style={{ width: "100%" }} onClick={go2}>下一步</div>
          </div>
        )}
        {step === 2 && (
          <div className="step-content tab-fade" key="2">
            <div className="step-header"><div className="step-title">选择你的兴趣标签</div><div className="step-sub">选 3–5 个，帮助找到同频的灵魂</div></div>
            <div className="tags-grid">
              {PRESET_TAGS.map((t) => <div key={t} className={"tag-option" + (tags.includes(t) ? " selected" : "")} onClick={() => toggleTag(t)}>{t}</div>)}
            </div>
            <span className="tags-count">已选 {tags.length} 个（需 3-5 个）</span>
            <div className="btn-row">
              <div className="btn btn-ghost" onClick={() => setStep(1)}>上一步</div>
              <div className="btn btn-primary" onClick={go3}>下一步</div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="step-content tab-fade" key="3">
            <div className="step-header"><div className="step-title">你的书写节奏</div><div className="step-sub">帮助匹配志同道合的书写者</div></div>
            <div className="form-card card">
              <span className="form-label">你常在什么时候写信？</span>
              <div className="options-row" style={{ marginTop: 12 }}>
                {[["morning","🌅","清晨"],["afternoon","☀","午后"],["night","🌙","夜深"]].map(([v,ic,l]) => (
                  <div key={v} className={"option-item" + (activeTime === v ? " active" : "")} onClick={() => setActiveTime(v)}>
                    <span className="option-icon">{ic}</span><span>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-card card">
              <span className="form-label">你期望多久交流一次？</span>
              <div className="options-col" style={{ marginTop: 12 }}>
                {[["weekly","每周一封","保持频繁联系，分享日常"],["biweekly","每两周一封","不急不缓，慢慢交流"],["free","随缘","灵感来了就写，不受时间约束"]].map(([v,t,d]) => (
                  <div key={v} className={"option-row-item" + (freq === v ? " active" : "")} onClick={() => setFreq(v)}>
                    <span className="option-title">{t}</span><span className="option-desc">{d}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="btn-row">
              <div className="btn btn-ghost" onClick={() => setStep(2)}>上一步</div>
              <div className="btn btn-primary" onClick={finish}>完成注册</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ LOGIN (登录/注册) ============================ */
function LoginScreen({ onDone, toast }) {
  const [mode, setMode] = useState2("login");
  const [account, setAccount] = useState2("");
  const [pwd, setPwd] = useState2("");
  const [pwd2, setPwd2] = useState2("");
  const isReg = mode === "register";
  const accountOk = /^1\d{10}$/.test(account.trim()) || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(account.trim());
  const pwdOk = pwd.length >= 6;
  const matchOk = !isReg || (pwd2.length > 0 && pwd2 === pwd);
  const canGo = accountOk && pwdOk && matchOk;

  function submit() {
    if (!canGo) {
      toast(!accountOk ? "请输入有效的邮箱或手机号" : !pwdOk ? "密码至少 6 位" : "两次密码不一致");
      return;
    }
    onDone(mode);
  }

  return (
    <div className="page login-page" data-screen-label="登录">
      <StatusBar />
      <div className="login-scroll">
        <div className="login-hero">
          <div className="login-seal">常</div>
          <div className="login-title">平常</div>
          <div className="login-sub">写信 · 记情绪 · 慢慢遇见</div>
        </div>

        <div className="card login-card">
          <div className="login-flap" aria-hidden="true"></div>
          <div className="seg-tabs login-tabs">
            <div className={"seg-tab" + (!isReg ? " active" : "")} onClick={() => setMode("login")}>登录</div>
            <div className={"seg-tab" + (isReg ? " active" : "")} onClick={() => setMode("register")}>注册</div>
          </div>
          <div className="form-card login-field">
            <span className="form-label">邮箱 / 手机号</span>
            <input className="form-input" placeholder="you@example.com" value={account} onChange={(e) => setAccount(e.target.value)} />
          </div>
          <div className="form-card login-field">
            <span className="form-label">密码</span>
            <input className="form-input" type="password" placeholder={isReg ? "至少 6 位" : "请输入密码"} value={pwd} onChange={(e) => setPwd(e.target.value)} />
          </div>
          {isReg && (
            <div className="form-card login-field tab-fade">
              <span className="form-label">确认密码</span>
              <input className="form-input" type="password" placeholder="再输一次" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
            </div>
          )}
          <div className={"btn btn-primary login-btn" + (canGo ? "" : " btn-disabled")} onClick={submit}>
            {isReg ? "创建账号，开始引导" : "登 录"}
          </div>
          <div className="login-note">{isReg ? "注册后将进入 3 步引导，完成你的「精神身份证」" : "首次使用？切到「注册」创建账号"}</div>
        </div>

        <div className="login-foot">继续即代表同意《平常公约》与《隐私说明》</div>
      </div>
    </div>
  );
}

Object.assign(window, { JourneyScreen, CommentsSheet, MatchScreen, PeerProfileScreen, MyProfileScreen, EditScreen, OnboardingScreen, LoginScreen });
