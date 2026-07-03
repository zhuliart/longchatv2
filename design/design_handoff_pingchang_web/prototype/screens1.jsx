/* screens1.jsx — Home, Inbox/Sent, Write, Detail (exported to window) */
const { useState: useState1, useEffect: useEffect1, useRef: useRef1 } = React;

/* ============================ HOME (此刻) ============================ */
function HomeScreen({ nav, moodDone, todayMood, onMoodSaved, dark, onToggleDark }) {
  const [editing, setEditing] = useState1(false);
  const top = MATCHES[0];
  const tiles = [
    { key: "write", icon: "✎", label: "写信", cls: "qt-1", go: () => nav("write", { targetNickname: top.profile.nickname, isFirst: true }) },
    { key: "inbox", icon: "✉", label: "信箱", cls: "qt-2", go: () => nav("inbox") },
    { key: "journey", icon: "❍", label: "旅程", cls: "qt-3", go: () => nav("journey") },
    { key: "match", icon: "☾", label: "推荐", cls: "qt-4", go: () => nav("match") },
  ];
  return (
    <div className="page">
      <StatusBar dark />
      <div className="page-scroll tab-fade">
        <div className="home-header">
          <div className="home-toprow">
            <div className="home-greeting">
              <div className="home-hello">晚上好，</div>
              <div className="home-name">{ME.nickname}<span className="seal-dot">🌙</span></div>
            </div>
            <button className={"theme-orb" + (dark ? " is-dark" : "")} onClick={onToggleDark} aria-label="切换深色模式">
              <span className="orb-glyph">{dark ? "☾" : "☀"}</span>
            </button>
            <Avatar name={ME.nickname} className="home-avatar" />
          </div>
          <div className="home-tagline">慢下来，好好说话 · 2026年6月4日 周四</div>
        </div>

        {/* 快捷入口 */}
        <div className="quick-tiles">
          {tiles.map((t) => (
            <div key={t.key} className={"quick-tile " + t.cls} onClick={t.go}>
              <span className="qt-icon">{t.icon}</span>
              <span className="qt-label">{t.label}</span>
            </div>
          ))}
        </div>

        {/* 今日心情 */}
        <div className="section">
          <div className="section-header">
            <span className="section-title ribbon"><span className="ribbon-banner"><span className="rb-mark">✶</span>此刻心情</span></span>
          </div>
          {!moodDone && (
            <div className="card fade-in">
              <div className="mood-prompt-title">今天，你怎么样？</div>
              <div className="mood-prompt-sub">记录此刻的心情</div>
              <MoodWidget onSave={onMoodSaved} />
            </div>
          )}
          {moodDone && !editing && (
            <div className="card fade-in">
              <div className="mood-done-row">
                <div className="mood-done-info">
                  <span className="mood-done-label">今日心情已记录</span>
                  {todayMood && <MoodBadge emotion={todayMood.emotion} label={todayMood.emotionLabel} feeling={todayMood.feeling} withFace />}
                </div>
                <div className="mood-edit-btn" onClick={() => setEditing(true)}>修改</div>
              </div>
              {todayMood && todayMood.diary && <div className="mood-done-diary text-clamp-2">{todayMood.diary}</div>}
            </div>
          )}
          {moodDone && editing && (
            <div className="card fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="mood-prompt-title" style={{ fontSize: 18 }}>修改今日心情</span>
                <span style={{ fontSize: 13, color: "var(--color-ink-secondary)", cursor: "pointer" }} onClick={() => setEditing(false)}>取消</span>
              </div>
              <MoodWidget existing={todayMood} onSave={(m) => { onMoodSaved(m); setEditing(false); }} />
            </div>
          )}
        </div>

        {/* 今日灵魂推荐 — featured hero */}
        <div className="section" style={{ marginBottom: 0 }}>
          <div className="section-header">
            <span className="section-title ribbon"><span className="ribbon-banner"><span className="rb-mark">☾</span>今日灵魂</span></span>
            <span className="section-more" onClick={() => nav("match")}>全部 ›</span>
          </div>
        </div>
        <div className="featured-hero" onClick={() => nav("peer", { uid: top.profile._id })}>
          <div className="fh-label">今日最契合的灵魂</div>
          <div className="fh-row">
            <Avatar name={top.profile.nickname} className="fh-avatar" />
            <div>
              <div className="fh-name">{top.profile.nickname}</div>
              {top.profile.isActiveRecently && <div style={{ fontSize: 12, opacity: .82, fontFamily: "var(--font-serif)" }}>近期活跃</div>}
            </div>
            <div className="fh-score"><div className="num">{top.score}<span style={{ fontSize: 14 }}>%</span></div><span className="lbl">契合</span></div>
          </div>
          <div className="fh-intro text-clamp-2">{top.profile.intro}</div>
          <div className="fh-foot">
            <div className="fh-tags">{top.tagsCommon.map((t) => <span key={t} className="fh-tag">{t}</span>)}</div>
            <span className="fh-cta">写信给TA</span>
          </div>
        </div>

        {/* 去年的今天 */}
        <div className="section">
          <div className="section-header">
            <span className="section-title ribbon"><span className="ribbon-banner"><span className="rb-mark">❦</span>去年的今天</span></span>
            <span className="section-more" onClick={() => nav("journey", { date: MEMORY_TODAY.displayDate })}>查看 ›</span>
          </div>
          <div className="card memory-card" onClick={() => nav("journey", { date: MEMORY_TODAY.displayDate })}>
            <div className="memory-top">
              <span className="memory-year"><b>一年前</b><span className="dot" />2025年6月4日</span>
              <MoodBadge emotion={MEMORY_TODAY.emotion} label={MEMORY_TODAY.emotionLabel} />
            </div>
            <div className="memory-excerpt text-clamp-3">{MEMORY_TODAY.displayText}</div>
          </div>
        </div>

        {/* 最近来信 */}
        <div className="section" style={{ marginBottom: 24 }}>
          <div className="section-header">
            <span className="section-title ribbon"><span className="ribbon-banner"><span className="rb-mark">✉</span>最近来信</span></span>
            <span className="section-more" onClick={() => nav("inbox")}>信箱 ›</span>
          </div>
          {LETTERS.slice(0, 2).map((l) => (
            <EnvelopeCard key={l._id} letter={l} onClick={() => nav("detail", { id: l._id })} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================ INBOX / SENT (信箱) ============================ */
function InboxScreen({ nav, initialTab }) {
  const [tab, setTab] = useState1(initialTab || "inbox");
  const [drafts, setDrafts] = useState1(window.DRAFTS);
  const [confirmId, setConfirmId] = useState1(null);
  const [fabMenu, setFabMenu] = useState1(false);
  const confirmDraft = drafts.find((d) => d._id === confirmId);
  const latestDraft = drafts[0];
  function startNew() { setFabMenu(false); nav("write", { targetNickname: "归零", isFirst: true }); }
  function continueWriting() {
    setFabMenu(false);
    if (drafts.length > 1) { setTab("draft"); return; }
    if (latestDraft) { nav("write", { targetNickname: latestDraft.receiverNickname || "", isFirst: (latestDraft.required || 0) >= 150, draftId: latestDraft._id, draftTitle: latestDraft.title, draftBody: latestDraft.excerpt }); }
    else { startNew(); }
  }
  const list = tab === "inbox" ? LETTERS : tab === "sent" ? SENT : drafts;
  const emptyText = { inbox: ["还没有来信", "去发现灵魂匹配吧"], sent: ["还没有发出过信件", "写下你的第一封信"], draft: ["还没有草稿", "未写完的信会自动留在这里"] }[tab];
  return (
    <div className="page">
      <StatusBar />
      <div className="seg-tabs seg-tabs-3">
        <div className={"seg-tab" + (tab === "inbox" ? " active" : "")} onClick={() => setTab("inbox")}>收件箱</div>
        <div className={"seg-tab" + (tab === "sent" ? " active" : "")} onClick={() => setTab("sent")}>已发出</div>
        <div className={"seg-tab" + (tab === "draft" ? " active" : "")} onClick={() => setTab("draft")}>
          草稿箱{drafts.length > 0 && <span className="seg-count">{drafts.length}</span>}
        </div>
      </div>
      <div className="page-scroll" style={{ padding: "12px 16px 24px" }} key={tab}>
        <div className="tab-fade">
          {list.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">{tab === "draft" ? "✎" : "✉"}</span>
              <span>{emptyText[0]}</span>
              <span className="empty-sub">{emptyText[1]}</span>
            </div>
          ) : tab === "draft" ? (
            list.map((d) => (
              <DraftCard key={d._id} draft={d}
                onClick={() => nav("write", { targetNickname: d.receiverNickname || "", isFirst: (d.required || 0) >= 150, draftId: d._id, draftTitle: d.title, draftBody: d.excerpt })}
                onDelete={(id) => setConfirmId(id)} />
            ))
          ) : list.map((l) => (
            <EnvelopeCard key={l._id} letter={l} sent={tab === "sent"}
              onClick={() => nav("detail", { id: l._id, sent: tab === "sent" })} />
          ))}
        </div>
      </div>
      <button className="fab" onClick={() => setFabMenu(true)}>✎</button>
      {fabMenu && (
        <div className="sheet-mask" onClick={() => setFabMenu(false)}>
          <div className="sheet fab-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="fab-sheet-grip" />
            <div className="fab-sheet-title">写一封信</div>
            <button className="fab-option" onClick={continueWriting}>
              <span className="fab-option-glyph">✎</span>
              <span className="fab-option-text">
                <span className="fab-option-label">继续写</span>
                <span className="fab-option-sub">{drafts.length === 0 ? "暂无草稿，将开始新的一封" : drafts.length === 1 ? "接着写「" + (latestDraft.title || "未命名草稿") + "」" : "草稿箱里还有 " + drafts.length + " 封未写完"}</span>
              </span>
              <span className="fab-option-arrow">›</span>
            </button>
            <button className="fab-option" onClick={startNew}>
              <span className="fab-option-glyph">✦</span>
              <span className="fab-option-text">
                <span className="fab-option-label">重新写</span>
                <span className="fab-option-sub">从一张空白信纸开始</span>
              </span>
              <span className="fab-option-arrow">›</span>
            </button>
            <button className="fab-sheet-cancel" onClick={() => setFabMenu(false)}>取消</button>
          </div>
        </div>
      )}
      {confirmDraft && (
        <div className="confirm-mask" onClick={() => setConfirmId(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">删除这封草稿？</div>
            <div className="confirm-sub">「<b>{confirmDraft.title || (confirmDraft.receiverNickname ? "致 " + confirmDraft.receiverNickname : "无标题草稿")}</b>」将被删除，删除后无法恢复。</div>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmId(null)}>取消</button>
              <button className="btn confirm-del" onClick={() => { setDrafts((arr) => arr.filter((x) => x._id !== confirmId)); setConfirmId(null); }}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ WRITE (写信) ============================ */
const INSPIRATION = [
  { label: "破冰 · 开头", lines: [
    "陌生的朋友，见信好。提笔时我正……",
    "不知道该怎么称呼你，但有些话，想说给一个素未谋面的人听。",
    "今天发生了一件很小的事，却让我很想写信给你。",
  ] },
  { label: "分享 · 此刻", lines: [
    "最近我常常想起一句话——",
    "想和你聊聊最近让我心动的一件小事：",
    "窗外的天气是……，而我此刻的心情是……",
  ] },
  { label: "提问 · 给对方", lines: [
    "你最近，有没有什么一直放不下的事？",
    "如果能问你一个问题，我想问的是……",
    "你也会在深夜里失眠、胡思乱想吗？",
  ] },
  { label: "收尾 · 落款", lines: [
    "写到这里，天色已经晚了。愿你一切都好。",
    "不必急着回信，慢慢来就好。",
    "期待你的回音，像期待一场不期而遇的雨。",
  ] },
];
function WriteScreen({ params, back, toast }) {
  const isFirst = params.isFirst;
  const required = isFirst ? 150 : 100;
  const [title, setTitle] = useState1(params.draftTitle || "");
  const [content, setContent] = useState1(params.draftBody || "");
  const [sending, setSending] = useState1(false);
  const [inspireOpen, setInspireOpen] = useState1(false);
  const [aiBusy, setAiBusy] = useState1(false);
  const [aiKind, setAiKind] = useState1(null);
  const [aiResults, setAiResults] = useState1([]);
  const [aiPolishText, setAiPolishText] = useState1("");
  const [aiErr, setAiErr] = useState1("");
  const styleSamples = (window.SENT || []).map((s) => s.excerpt).filter(Boolean).slice(0, 3).join("\n");

  async function aiContinue() {
    setAiKind("continue"); setAiErr(""); setAiResults([]); setAiPolishText("");
    if (!window.claude || !window.claude.complete) { setAiErr("当前环境暂时用不了 AI，请在预览中试试"); return; }
    setAiBusy(true);
    const draft = content.trim();
    const prompt = "你是一个中文书信写作的灵感助手，服务于一个叫「平常」的慢社交写信 App。\n\n以下是这位用户以往书信的片段，请仔细体会并模仿其语气、用词与节奏（含蓄、真诚、文学化、不油腻）：\n" + (styleSamples || "（暂无往信样本，请用温暖含蓄的中文书信语气）") + "\n\n" + (draft ? "用户当前已经写下：\n" + draft + "\n\n请顺着这段的语气与思路，给出3条可以接着写下去的句子。" : "用户还没开始写，请按其风格给出3条可作为信件开头或灵感的句子。") + "\n\n要求：每条 20-45 字，贴合用户语气，不要解释、不要序号。严格用三个竖线“|||”分隔输出：句子一|||句子二|||句子三";
    try {
      const out = await window.claude.complete(prompt);
      const parts = String(out).split("|||").map((s) => s.replace(/^[\s\d\.\u3001\uff09)—\-]*/, "").trim()).filter(Boolean).slice(0, 3);
      setAiResults(parts.length ? parts : [String(out).trim()]);
    } catch (e) { setAiErr("灵感生成失败了，稍后再试试"); }
    setAiBusy(false);
  }

  async function aiPolish() {
    setAiKind("polish"); setAiErr(""); setAiResults([]); setAiPolishText("");
    const draft = content.trim();
    if (draft.length < 10) { setAiErr("先写下一点内容，我再帮你润色～"); return; }
    if (!window.claude || !window.claude.complete) { setAiErr("当前环境暂时用不了 AI，请在预览中试试"); return; }
    setAiBusy(true);
    const prompt = "请在保持作者本人语气（参考其以往片段）的前提下，温柔地润色下面这段书信文字：让表达更自然流畅、更有感染力，但不改变原意、不要变得华丽做作，字数相近。只输出润色后的正文，不要任何解释或前缀。\n\n作者以往片段：\n" + (styleSamples || "（无）") + "\n\n待润色：\n" + draft;
    try {
      const out = await window.claude.complete(prompt);
      setAiPolishText(String(out).trim());
    } catch (e) { setAiErr("润色失败了，稍后再试试"); }
    setAiBusy(false);
  }

  function insertLine(ln) { setContent((c) => c ? c + "\n\n" + ln : ln); }
  const wc = countWords(content);
  const canSend = wc >= required;
  const pct = Math.min(100, (wc / required) * 100);

  function send() {
    if (!canSend || sending) return;
    setSending(true);
    setTimeout(() => { toast("信件已寄出 ✦"); back(); }, 700);
  }

  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title="写信" onBack={back} />
      <div className="recipient-bar">
        <span className="recipient-label">致：</span>
        <span className="recipient-name">{params.targetNickname || "请选择收信人"}</span>
      </div>
      <div className="page-scroll">
        <div className="letter-paper ruled">
          <input className="title-input" placeholder="信件标题（选填）" maxLength={30} value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="paper-divider" />
          <textarea className="content-textarea"
            placeholder={isFirst ? "写下你想对TA说的话吧（至少150字）" : "写下你的回信（至少100字）"}
            value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="counter-bar">
            <span className={"counter-text " + (canSend ? "counter-ok" : "counter-warn")}>{wc} / {required} 字</span>
            {!canSend && wc > 0 && <span className="counter-text counter-warn">还需 {required - wc} 字</span>}
          </div>
        </div>
        <div className="counter-progress"><i style={{ width: pct + "%" }} /></div>
      </div>
      <div className="send-area">
        <button className="inspire-btn" onClick={() => setInspireOpen(true)} aria-label="灵感笔记">
          <span className="inspire-glyph">❋</span>
          <span className="inspire-label">灵感</span>
        </button>
        <div className="send-right">
          <div className="btn btn-ghost" style={{ padding: "11px 16px" }} onClick={() => toast("草稿已保存")}>存草稿</div>
          <div className={"btn btn-primary" + (!canSend || sending ? " btn-disabled" : "")} onClick={send}>{sending ? "寄出中..." : "封存寄出"}</div>
        </div>
      </div>
      {inspireOpen && (
        <div className="sheet-mask" onClick={() => setInspireOpen(false)}>
          <div className="sheet inspire-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">灵感笔记</span>
              <span className="sheet-close" onClick={() => setInspireOpen(false)}>✕</span>
            </div>
            <div className="sheet-scroll">
              <div className="ai-inspire">
                <div className="ai-inspire-head">
                  <span className="ai-badge">AI</span>
                  <span className="ai-inspire-title">灵感推演</span>
                  <span className="ai-inspire-note">学习你的笔触</span>
                </div>
                <div className="ai-actions">
                  <button className="ai-action" onClick={aiContinue} disabled={aiBusy}>
                    <span className="ai-action-glyph">✎</span><span>顺着我的风格续写</span>
                  </button>
                  <button className="ai-action" onClick={aiPolish} disabled={aiBusy}>
                    <span className="ai-action-glyph">✦</span><span>帮我润色这段</span>
                  </button>
                </div>
                {aiBusy && (
                  <div className="ai-loading"><span className="ai-dots"><i/><i/><i/></span>正在揣摩你的笔触……</div>
                )}
                {aiErr && <div className="ai-error">{aiErr}</div>}
                {!aiBusy && aiKind === "continue" && aiResults.length > 0 && (
                  <div className="ai-results">
                    {aiResults.map((r, i) => (
                      <button className="ai-suggestion" key={i} onClick={() => { insertLine(r); toast("已添加到信里"); }}>
                        <span>{r}</span><span className="inspire-add">＋</span>
                      </button>
                    ))}
                    <button className="ai-regen" onClick={aiContinue}>换一批</button>
                  </div>
                )}
                {!aiBusy && aiKind === "polish" && aiPolishText && (
                  <div className="ai-polish">
                    <div className="ai-polish-label">润色后的版本</div>
                    <div className="ai-polish-text">{aiPolishText}</div>
                    <div className="ai-polish-actions">
                      <button className="ai-apply" onClick={() => { setContent(aiPolishText); setInspireOpen(false); toast("已换为润色版本"); }}>替换原文</button>
                      <button className="ai-regen" onClick={aiPolish}>再润一次</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="inspire-divider"><span>或者，从这些开始</span></div>
              <p className="inspire-intro">不知道从哪儿落笔？挑一句开始，或只是读一读，让思绪慢慢展开。</p>
              {INSPIRATION.map((g) => (
                <div className="inspire-group" key={g.label}>
                  <div className="inspire-group-title">{g.label}</div>
                  {g.lines.map((ln) => (
                    <button className="inspire-line" key={ln}
                      onClick={() => { insertLine(ln); setInspireOpen(false); }}>
                      <span>{ln}</span>
                      <span className="inspire-add">＋</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ DETAIL + OPEN ANIMATION ============================ */
function OpenAnimation({ onDone, speed }) {
  const [stage, setStage] = useState1(0);
  const startedRef = useRef1(false);
  function play() {
    if (startedRef.current) return;
    startedRef.current = true;
    const s = speed || 1;
    setStage(1);
    setTimeout(() => setStage(2), 120 * s);
    setTimeout(() => setStage(3), 380 * s);
    setTimeout(() => onDone(), 1150 * s);
  }
  return (
    <div className="open-anim" data-stage={stage} onClick={play}>
      <div className="open-hint">{stage === 0 ? "轻触信封 · 拆开来信" : "正在拆信…"}</div>
      <div className="envelope-3d">
        <div className="env-base" />
        <div className="env-letter"><div className="scribble"><i/><i/><i/><i/></div></div>
        <div className="env-front" />
        <div className="env-flap" />
        <div className="env-wax"><div className="seal-stamp active" style={{ width: 48, height: 48, fontSize: 19 }}>平</div></div>
      </div>
    </div>
  );
}

function DetailScreen({ params, nav, back, speed }) {
  const sent = params.sent;
  const src = sent ? SENT : LETTERS;
  const letter = src.find((l) => l._id === params.id) || LETTERS[0];
  const wasUnread = !sent && letter.status === "sent";
  const [done, setDone] = useState1(false);
  const name = sent ? letter.receiverNickname : letter.senderNickname;

  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title={sent ? "已寄出" : "来信"} onBack={back} />
      {!done ? (
        <OpenAnimation onDone={() => setDone(true)} speed={speed} />
      ) : (
        <React.Fragment>
          <div className="page-scroll">
            <div className="detail-sender fade-in" onClick={() => !sent && nav("peer", { uid: letter.from_uid })}>
              <Avatar name={name} />
              <div>
                <div className="sender-name">{sent ? "致 " + name : name}</div>
                <div className="sender-time">{letter.timeDisplay}</div>
              </div>
              {!sent && <span className="sender-arrow">›</span>}
            </div>
            <div className="read-paper fade-in">
              {letter.title && <div className="read-title">{letter.title}</div>}
              <div className="read-body">{letter.content}</div>
              <div className="read-sign">— {name}，于平常</div>
            </div>
            <div style={{ height: 12 }} />
          </div>
          {!sent && (
            <div className="action-bar">
              <div className="btn btn-ghost" onClick={() => nav("write", { targetNickname: name, isFirst: false })}>归档</div>
              <div className="btn btn-primary" onClick={() => nav("write", { targetNickname: name, isFirst: false })}>回信</div>
            </div>
          )}
        </React.Fragment>
      )}
    </div>
  );
}

Object.assign(window, { HomeScreen, InboxScreen, WriteScreen, DetailScreen, OpenAnimation });
