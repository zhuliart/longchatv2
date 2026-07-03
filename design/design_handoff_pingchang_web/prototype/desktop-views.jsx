/* desktop-views.jsx — 桌面版：此刻 / 旅程(日历+详情并排) / 心情广场 */
const { useState: useStateV } = React;

/* ---------- helpers (与移动端 screens2 保持一致) ---------- */
const dskPad2 = (n) => String(n).padStart(2, "0");
function dskBuildCalendar(year, month, moods) {
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
function dskBuildTrend(year, month, moods) {
  const days = new Date(year, month, 0).getDate();
  const byDay = {};
  moods.forEach((m) => {
    const a = m.date.split("-");
    if (+a[0] === year && +a[1] === month) byDay[parseInt(a[2], 10)] = m;
  });
  const arr = [];
  for (let d = 1; d <= days; d++) {
    const mo = byDay[d];
    arr.push({ d: month + "-" + dskPad2(d), date: year + "-" + dskPad2(month) + "-" + dskPad2(d), v: mo ? mo.intensity : 0, e: mo ? mo.emotion : null });
  }
  return arr;
}

/* ---------- 此刻 ---------- */
function DHome({ todayMood, onMoodSaved, go, openLetter, toast }) {
  const h = new Date().getHours();
  const hello = h < 5 ? "夜深了" : h < 11 ? "早上好" : h < 14 ? "中午好" : h < 18 ? "午后好" : "晚上好";
  return (
    <div className="dsk-page" data-screen-label="桌面此刻">
      <div className="dsk-head">
        <div className="dsk-title">{hello}，{ME.nickname}</div>
        <div className="dsk-sub">今天想写点什么，或者只是记录一种心情？</div>
      </div>
      <div className="dsk-home">
        <div className="dsk-col">
          <div className="card dsk-card">
            <div className="dsk-card-title">
              <span>今天，你怎么样？</span>
              {todayMood && <span className="more" onClick={() => go("journey")}>去旅程看看 ›</span>}
            </div>
            {todayMood ? (
              <React.Fragment>
                <div className="dsk-mood-done">
                  <MoodFace emotion={todayMood.emotion} size={46} />
                  <div>
                    <MoodBadge emotion={todayMood.emotion} label={todayMood.emotionLabel} feeling={todayMood.feeling} />
                    <div style={{ marginTop: 7 }}><IntensityDots value={todayMood.intensity} /></div>
                  </div>
                </div>
                {todayMood.diary && <div className="dsk-mood-diary">{todayMood.diary}</div>}
              </React.Fragment>
            ) : (
              <MoodWidget onSave={onMoodSaved} />
            )}
          </div>

          <div className="card dsk-card">
            <div className="dsk-card-title">
              <span>去年的今天</span>
              <span className="more" onClick={() => go("journey", { date: MEMORY_TODAY.displayDate })}>查看 ›</span>
            </div>
            <div className="dsk-memory-quote">{MEMORY_TODAY.diary}</div>
            <div className="dsk-memory-date">{MEMORY_TODAY.displayDate} · <MoodBadge emotion={MEMORY_TODAY.emotion} feeling={MEMORY_TODAY.feeling} /></div>
          </div>
        </div>

        <div className="dsk-col">
          <div className="card dsk-card">
            <div className="dsk-card-title">
              <span>最近的信</span>
              <span className="more" onClick={() => go("inbox")}>全部 ›</span>
            </div>
            <div className="dsk-side-list">
              {LETTERS.map((l) => <EnvelopeCard key={l._id} letter={l} onClick={() => openLetter(l._id)} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 旅程：日历 + 详情并排 / 心情广场 ---------- */
function DJourney({ initialDate, toast }) {
  const init = (initialDate || "").split("-");
  const hasInit = init.length === 3;
  const [tab, setTab] = useStateV("mine");
  const [year, setYear] = useStateV(hasInit ? +init[0] : 2026);
  const [month, setMonth] = useStateV(hasInit ? +init[1] : 6);
  const [selDay, setSelDay] = useStateV(hasInit ? +init[2] : 4);
  const [moodList, setMoodList] = useStateV(window.MOODS);
  const cells = dskBuildCalendar(year, month, moodList);
  const selDate = year + "-" + dskPad2(month) + "-" + dskPad2(selDay);
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
    const updated = Object.assign({}, selMood, m, { date: selDate, _id: selMood ? selMood._id : "md_new" });
    setMoodList((arr) => selMood ? arr.map((x) => x._id === selMood._id ? updated : x) : [...arr, updated]);
    const gi = window.MOODS.findIndex((x) => x._id === updated._id);
    if (gi > -1) window.MOODS[gi] = updated; else window.MOODS.push(updated);
    toast(isPast ? "可见性已更新 ✦" : "情绪已记录 ✦");
  }

  return (
    <div className="dsk-page" data-screen-label="桌面旅程">
      <div className="dsk-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div className="dsk-title">旅程</div>
          <div className="dsk-sub">情绪的月历，与走过的痕迹</div>
        </div>
        <div className="seg-tabs" style={{ padding: 0 }}>
          <div className={"seg-tab" + (tab === "mine" ? " active" : "")} onClick={() => setTab("mine")}>我的旅程</div>
          <div className={"seg-tab" + (tab === "feed" ? " active" : "")} onClick={() => setTab("feed")}>心情广场</div>
        </div>
      </div>

      {tab === "mine" ? (
        <div className="dsk-journey">
          <div className="dsk-col">
            <div className="card dsk-card">
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
            </div>
            <div className="card dsk-card">
              <div className="dsk-card-title"><span>{year}年{month}月 情绪走势</span></div>
              <TrendChart key={year + "-" + month} data={dskBuildTrend(year, month, moodList)} />
            </div>
          </div>

          <div className="card dsk-card" data-screen-label="当日详情">
            <div className="dsk-card-title"><span>{year}年{month}月{selDay}日</span></div>
            {selMood ? (
              <div key={selDate} className="tab-fade">
                <div className="dsk-mood-done">
                  <MoodFace emotion={selMood.emotion} size={46} />
                  <div>
                    <MoodBadge emotion={selMood.emotion} feeling={selMood.feeling} />
                    <div style={{ marginTop: 7 }}><IntensityDots value={selMood.intensity} /></div>
                  </div>
                </div>
                {selMood.diary && <div className="dsk-mood-diary">{selMood.diary}</div>}
                <div style={{ marginTop: 18, borderTop: "1px solid var(--hairline)", paddingTop: 16 }}>
                  <div className="dsk-card-title" style={{ fontSize: 14 }}>
                    <span>{isPast ? "修改可见性" : "修改心情"}</span>
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
        <DPlaza toast={toast} />
      )}
    </div>
  );
}

/* ---------- 心情广场（两栏瀑布） ---------- */
function DPlaza({ toast }) {
  const [openId, setOpenId] = useStateV(null);
  const [feed, setFeed] = useStateV(window.FEED);
  const [input, setInput] = useStateV("");

  function send(card) {
    const t = input.trim();
    if (!t) return;
    const c = { _id: "c" + Date.now(), fromNickname: ME.nickname, content: t, created_at: "刚刚", parent_id: null };
    setFeed((arr) => arr.map((f) => f._id === card._id ? Object.assign({}, f, { comments: [...(f.comments || []), c], commentCount: f.commentCount + 1 }) : f));
    setInput("");
    toast("评论已送达 ✦");
  }

  return (
    <div className="dsk-plaza" data-screen-label="桌面心情广场">
      {feed.map((f) => (
        <div key={f._id} className="card dsk-plaza-card">
          <div className="dsk-plaza-head">
            <Avatar name={f.authorNickname} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dsk-plaza-name">{f.authorNickname}</div>
              <div className="dsk-plaza-date">{f.date}</div>
            </div>
            <MoodBadge emotion={f.emotion} feeling={f.feeling} withFace />
          </div>
          <div className="dsk-plaza-diary">{f.diary}</div>
          <div className="dsk-plaza-foot">
            <IntensityDots value={f.intensity} />
            <span className="dsk-plaza-cc" onClick={() => setOpenId(openId === f._id ? null : f._id)}>
              💬 {f.commentCount} 条回应 {openId === f._id ? "收起" : "展开"}
            </span>
          </div>
          {openId === f._id && (
            <div className="dsk-plaza-comments tab-fade">
              {(f.comments || []).map((c) => (
                <div key={c._id} className={"dsk-comment" + (c.parent_id ? " is-reply" : "")}>
                  <b>{c.fromNickname}</b>：{c.content}
                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--color-ink-secondary)" }}>{c.created_at}</span>
                </div>
              ))}
              {(f.comments || []).length === 0 && <div className="dsk-comment" style={{ color: "var(--color-ink-secondary)" }}>还没有回应，说点什么吧</div>}
              <div className="dsk-comment-row">
                <input placeholder="温柔地回应…" value={input} maxLength={200}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(f)} />
                <div className="comment-send" onClick={() => send(f)}>发送</div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { DHome, DJourney, DPlaza });
