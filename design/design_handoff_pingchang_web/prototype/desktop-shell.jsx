/* desktop-shell.jsx — 桌面版壳层：侧边栏 / 登录 / 我的 */
const { useState: useStateS } = React;

const DSK_NAV = [
  { key: "home", label: "此刻", glyph: "✶" },
  { key: "inbox", label: "信箱", glyph: "✉" },
  { key: "journey", label: "旅程", glyph: "❍" },
  { key: "me", label: "我的", glyph: "❖" },
];

function DSidebar({ view, go, onWrite }) {
  const unread = LETTERS.filter((l) => l.status === "sent").length;
  return (
    <aside className="dsk-side">
      <div className="dsk-brand">
        <div className="dsk-brand-seal">常</div>
        <div className="dsk-brand-text">
          <div className="dsk-brand-name">平常</div>
          <div className="dsk-brand-sub">写信 · 记情绪 · 慢慢遇见</div>
        </div>
      </div>
      <div className="dsk-write-btn">
        <div className="btn btn-primary" onClick={onWrite}>✎ <span className="lbl">写一封信</span></div>
      </div>
      {DSK_NAV.map((n) => (
        <div key={n.key} className={"dsk-nav-item" + (view === n.key ? " active" : "")} onClick={() => go(n.key)}>
          <span className="dsk-nav-glyph">{n.glyph}</span>
          <span className="lbl">{n.label}</span>
          {n.key === "inbox" && unread > 0 && <span className="dsk-nav-badge">{unread}</span>}
        </div>
      ))}
      <div className="dsk-side-foot">
        <div className="dsk-user-chip" onClick={() => go("me")}>
          <Avatar name={ME.nickname} />
          <div className="dsk-user-text">
            <div className="dsk-user-name">{ME.nickname}</div>
            <div className="dsk-user-sub">{ME.is_member ? "会员用户" : "普通用户"}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ---------- 登录（桌面居中信封卡） ---------- */
function DLogin({ onDone, toast }) {
  const [mode, setMode] = useStateS("login");
  const [account, setAccount] = useStateS("");
  const [pwd, setPwd] = useStateS("");
  const [pwd2, setPwd2] = useStateS("");
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
    <div className="dsk-login" data-screen-label="桌面登录">
      <div className="dsk-login-box">
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
        <div className="dsk-login-foot">继续即代表同意《平常公约》与《隐私说明》</div>
      </div>
    </div>
  );
}

/* ---------- 我的 ---------- */
function DProfile({ toast, onLogout }) {
  return (
    <div className="dsk-page dsk-me" data-screen-label="桌面我的">
      <div className="dsk-head">
        <div className="dsk-title">我的</div>
      </div>
      <div className="my-header">
        <Avatar name={ME.nickname} className="" />
        <div className="my-info">
          <div className="my-name">{ME.nickname}</div>
          <div className="my-intro">{ME.intro}</div>
        </div>
        <div className="mood-edit-btn" onClick={() => toast("编辑资料见移动端原型 ✎")}>编辑</div>
      </div>
      <div className="my-tags">{ME.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>

      <div className="card stats-section">
        <div className="stat-item"><span className="stat-num">{STATS.lettersSent}</span><span className="stat-label">已发出</span></div>
        <div className="stat-divider" />
        <div className="stat-item"><span className="stat-num">{STATS.lettersReceived}</span><span className="stat-label">已收到</span></div>
        <div className="stat-divider" />
        <div className="stat-item"><span className="stat-num">{STATS.moodDays}</span><span className="stat-label">记录天数</span></div>
      </div>

      <div className="card member-section">
        <div>
          <div className="member-title">{ME.is_member ? "会员用户" : "普通用户"}</div>
          <div className="member-sub">{ME.is_member ? "每日 5 位灵魂推荐" : "每日 3 位灵魂推荐"}</div>
        </div>
        {!ME.is_member && <div className="member-upgrade" onClick={() => toast("会员详情见移动端原型 ✦")}>升级会员</div>}
      </div>

      <div className="card menu-section">
        <div className="menu-item menu-danger" onClick={onLogout}><span className="menu-icon">⇠</span><span className="menu-label">退出登录</span><span className="menu-arrow">›</span></div>
      </div>
    </div>
  );
}

Object.assign(window, { DSidebar, DLogin, DProfile, DSK_NAV });
