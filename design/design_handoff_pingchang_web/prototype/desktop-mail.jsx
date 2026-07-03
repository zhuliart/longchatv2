/* desktop-mail.jsx — 桌面版：信箱双栏 / 写信(信纸+AI灵感侧栏) */
const { useState: useStateM, useEffect: useEffectM } = React;

/* ---------- 信箱：左列表 + 右阅读窗 ---------- */
function DInbox({ initialTab, initialLetter, goWrite, toast }) {
  const [tab, setTab] = useStateM(initialTab || "inbox"); // inbox | sent | draft
  const [selId, setSelId] = useStateM(initialLetter || null);
  const [readIds, setReadIds] = useStateM([]); // 本次会话里已拆的信
  const list = tab === "inbox" ? LETTERS : tab === "sent" ? SENT : DRAFTS;
  const sel = list.find((x) => x._id === selId) || null;

  useEffectM(() => { if (initialLetter) { setTab("inbox"); setSelId(initialLetter); } }, [initialLetter]);

  const sealed = sel && tab === "inbox" && sel.status === "sent" && !readIds.includes(sel._id);

  function pick(id) { setSelId(id); }
  function unseal() { setReadIds((a) => [...a, sel._id]); }

  return (
    <div className="dsk-page" data-screen-label="桌面信箱">
      <div className="dsk-head">
        <div className="dsk-title">信箱</div>
        <div className="dsk-sub">慢一点，没关系。信会等你。</div>
      </div>
      <div className="dsk-mail">
        <div className="dsk-pane">
          <div className="seg-tabs">
            <div className={"seg-tab" + (tab === "inbox" ? " active" : "")} onClick={() => { setTab("inbox"); setSelId(null); }}>收件箱</div>
            <div className={"seg-tab" + (tab === "sent" ? " active" : "")} onClick={() => { setTab("sent"); setSelId(null); }}>已发出</div>
            <div className={"seg-tab" + (tab === "draft" ? " active" : "")} onClick={() => { setTab("draft"); setSelId(null); }}>草稿箱</div>
          </div>
          <div className="dsk-mail-list">
            {tab === "draft"
              ? DRAFTS.map((d) => (
                  <div key={d._id} className="dsk-mail-item">
                    <DraftCard draft={d} onClick={() => goWrite({ draft: d })} />
                  </div>
                ))
              : list.map((l) => (
                  <div key={l._id} className={"dsk-mail-item" + (sel && sel._id === l._id ? " active" : "")}>
                    <EnvelopeCard letter={l} sent={tab === "sent"} onClick={() => pick(l._id)} />
                  </div>
                ))}
          </div>
        </div>

        <div className="card dsk-reader">
          {!sel && (
            <div className="dsk-reader-empty">
              <div><span className="glyph">✉</span>从左侧选择一封信{tab === "draft" ? "，或点击草稿继续书写" : ""}</div>
            </div>
          )}
          {sel && sealed && (
            <div className="dsk-sealed tab-fade" key={sel._id}>
              <div>
                <div className="dsk-sealed-env"><div className="dsk-sealed-seal">常</div></div>
                <div className="dsk-sealed-meta">来自 <b>{sel.senderNickname}</b> 的信 · {sel.word_count} 字 · {sel.timeDisplay}</div>
                <div className="btn btn-primary" onClick={unseal}>拆 信</div>
              </div>
            </div>
          )}
          {sel && !sealed && (
            <div className="dsk-letter tab-fade" key={sel._id + "-open"}>
              <div className="dsk-letter-head">
                <Avatar name={tab === "sent" ? sel.receiverNickname : sel.senderNickname} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="dsk-letter-title">{sel.title || "无标题"}</div>
                  <div className="dsk-letter-meta">
                    {tab === "sent" ? "致 " + sel.receiverNickname : "来自 " + sel.senderNickname} · {sel.word_count} 字 · {sel.timeDisplay}
                  </div>
                </div>
                {tab === "sent" && (
                  <span className={"status-chip " + (sel.status === "read" ? "status-read" : "status-sent")}>
                    {sel.status === "read" ? "已读" : "已寄出"}
                  </span>
                )}
              </div>
              <div className="dsk-letter-body">{sel.content || sel.excerpt}</div>
              <div className="dsk-letter-actions">
                {tab === "inbox" && <div className="btn btn-primary" onClick={() => goWrite({ replyTo: sel })}>回 信</div>}
                {tab === "inbox" && <div className="btn btn-ghost" onClick={() => toast("已归档 ✦")}>归档</div>}
                {tab === "sent" && <div className="btn btn-ghost" onClick={() => toast("对方回信后会出现在收件箱 ✦")}>再写一封</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- 写信：信纸 + AI 灵感侧栏 ---------- */
const DSK_RECIPIENTS = [
  { name: "苔痕", first: false }, { name: "南风", first: false }, { name: "青山", first: false },
  { name: "归零", first: true }, { name: "宇宙尘", first: true },
];
const DSK_AI_SUGGESTIONS = [
  "夜又深了一层。我总是在这样的时刻想起没说完的话，就像想起抽屉里没寄出的信。",
  "你上次说的那句话，我这几天反复想了很多遍——原来被认真回应，是这样安静的欢喜。",
  "窗台的薄荷终于活过来了。我想，有些事急不得，比如植物，比如我们慢慢变熟这件事。",
];

function DWrite({ params, onBack, toast }) {
  const replyTo = params && params.replyTo;
  const draft = params && params.draft;
  const [to, setTo] = useStateM(replyTo ? replyTo.senderNickname : draft && draft.receiverNickname ? draft.receiverNickname : "");
  const [title, setTitle] = useStateM(replyTo ? "回信：" + replyTo.title : draft ? draft.title : "");
  const [body, setBody] = useStateM(draft ? draft.excerpt.replace(/……$/, "") : "");
  const [aiBusy, setAiBusy] = useStateM(false);
  const [sugs, setSugs] = useStateM([]);
  const rec = DSK_RECIPIENTS.find((r) => r.name === to);
  const isFirst = rec ? rec.first : true;
  const required = replyTo ? 100 : draft ? draft.required : isFirst ? 150 : 100;
  const wc = countWords(body);
  const ok = to && wc >= required;

  function aiContinue() {
    setAiBusy(true); setSugs([]);
    setTimeout(() => { setSugs(DSK_AI_SUGGESTIONS); setAiBusy(false); }, 900);
  }
  function aiPolish() {
    if (countWords(body) < 10) { toast("先写下一点内容，再帮你润色"); return; }
    setAiBusy(true);
    setTimeout(() => {
      setBody((b) => b.replace(/。/g, "。").trim() + "\n\n（已按你的笔触轻轻润色 ✦）");
      setAiBusy(false); toast("润色完成 ✦");
    }, 900);
  }
  function insert(s) { setBody((b) => (b ? b.trimEnd() + "\n\n" : "") + s); setSugs([]); }
  function send() {
    if (!ok) { toast(!to ? "先选择收信人" : `还差 ${required - wc} 字（${isFirst && !replyTo ? "首封至少 " + required : "至少 " + required} 字）`); return; }
    toast("信已封存寄出 ✦ 它将在合适的时刻抵达");
    setTimeout(onBack, 900);
  }

  return (
    <div className="dsk-page" data-screen-label="桌面写信">
      <div className="dsk-back" onClick={onBack}>‹ 返回信箱</div>
      <div className="dsk-head">
        <div className="dsk-title">{replyTo ? "回一封信" : "写一封信"}</div>
        <div className="dsk-sub">{replyTo ? `回复 ${replyTo.senderNickname} 的「${replyTo.title}」` : "字数不是门槛，是一种慢下来的邀请"}</div>
      </div>
      <div className="dsk-write">
        <div className="card dsk-write-paper">
          <div className="dsk-recipient-row">
            <span className="dsk-recipient-label">致</span>
            {DSK_RECIPIENTS.map((r) => (
              <span key={r.name}
                className={"dsk-recipient" + (to === r.name ? " active" : "") + (r.first ? " is-new" : "")}
                onClick={() => setTo(r.name)}>{r.name}</span>
            ))}
          </div>
          <input className="dsk-write-title" placeholder="标题（可不填，≤30字）" maxLength={30} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="dsk-write-body" placeholder="亲爱的朋友：&#10;&#10;见字如面……" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="dsk-write-foot">
            <span className={"dsk-wc" + (wc >= required ? " ok" : "")}>已写 <b>{wc}</b> / {required} 字{replyTo ? "（回信）" : isFirst ? "（首封）" : ""}</span>
            <div style={{ display: "flex", gap: 10 }}>
              <div className="btn btn-ghost" onClick={() => { toast("草稿已保存 ✦"); }}>存草稿</div>
              <div className={"btn btn-primary" + (ok ? "" : " btn-disabled")} onClick={send}>封存寄出</div>
            </div>
          </div>
        </div>

        <div className="dsk-write-side">
          <div className="card dsk-card">
            <div className="dsk-ai-title">✦ 灵感</div>
            <div className="dsk-ai-sub">根据你以往信件的笔触，续写或润色。生成的句子只是提议，采不采用由你。</div>
            <div className="dsk-ai-actions">
              <button className={"dsk-ai-action" + (aiBusy ? " busy" : "")} onClick={aiContinue}>✎ 顺着我的风格续写</button>
              <button className={"dsk-ai-action" + (aiBusy ? " busy" : "")} onClick={aiPolish}>❋ 帮我润色这段</button>
            </div>
            {aiBusy && <div className="dsk-ai-actions"><div className="dsk-ai-shimmer" /><div className="dsk-ai-shimmer" /></div>}
            {sugs.length > 0 && (
              <div className="dsk-ai-actions tab-fade">
                {sugs.map((s, i) => <div key={i} className="dsk-ai-sug" onClick={() => insert(s)}>{s}</div>)}
              </div>
            )}
          </div>
          <div className="card dsk-card">
            <div className="dsk-ai-title">☾ 写信的约定</div>
            <div className="dsk-ai-sub">
              陌生人的首封信至少 150 字，回信至少 100 字。<br />
              没有已读回执，没有催促——对方会在 TA 方便的时候读到。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DInbox, DWrite });
