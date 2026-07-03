# Handoff: 平常 PingChang — Web 全栈开发交付包

> 交付日期：2026-07-03 · 交付对象：Claude Code（后端 / 数据库 / API 接入 + Web 前端还原）
> 产品一句话：**情绪慢社交** —— 写信、记情绪、慢慢遇见。没有点赞与已读回执，只有慢下来的表达。

---

## 1. Overview 概览

本包包含「平常」Web 版的完整设计与契约：

| 内容 | 位置 | 作用 |
|------|------|------|
| **移动端高保真原型**（H5 版式） | `prototype/平常 PingChang 原型.html` | 全部核心流程的交互参考 |
| **桌面端高保真原型**（响应式） | `prototype/平常 Web 桌面版.html` | 桌面布局参考（信箱双栏、日历+详情并排） |
| **Web API 契约（开发以此为准）** | `docs/API-WEB-v1.0.md` | REST 路由、鉴权、数据模型、错误码 |
| **Mock 数据清单** | `docs/MOCK-INVENTORY.md` | 原型每块假数据 ↔ 对应接口的替换对照 |
| **产品需求文档** | `docs/PRD.md` | 业务规则、边界状态（原为小程序编写，业务语义通用） |
| **接口语义源（历史）** | `docs/INTERFACE-DOC-v0.2.md` | 微信云函数版全量契约，API-WEB 由它移植而来 |
| **AI 能力规格** | `docs/AI-Agent-SPEC.md` | AI 写作灵感的产品定义 |

**开发顺序建议**：先按 `API-WEB-v1.0.md` 建库建 API → 按 `MOCK-INVENTORY.md` 将前端 mock 逐项替换为接口 → 前端还原以两个原型为像素基准。

## 2. About the Design Files 关于设计文件

`prototype/` 内的文件是 **HTML 编写的设计参考**（React 18 + Babel Standalone 原型），不是可直接上生产的代码。你的任务是**在目标代码库的技术栈中重新实现这些设计**：

- 若项目已有前端框架/规范，用其既有模式与组件库还原；
- 若从零开始，推荐 **React + Vite**（原型即 React 思维编写，组件可近乎 1:1 迁移），样式可整体搬运 `styles.css` / `desktop.css`（纯 CSS 变量主题系统，无预处理器依赖）。
- 原型中的 `tweaks-panel.jsx`、`/*EDITMODE*/` 标记、`data-screen-label`、`data-comment-anchor` 属于设计工具痕迹，**不需要**带入生产。

## 3. Fidelity 保真度

**High-fidelity（高保真）**。颜色、字体、间距、圆角、阴影、交互均为最终定稿，前端应像素级还原。默认视觉定稿：

- **主题：黛雾（theme-mist）** + 强调色 `#9C7B86` + **正文黑体**（Noto Sans SC）
- 主题系统保留（CSS 变量切换，共 10 套光 + 5 套暗），但 V1 可只上线黛雾；深色模式为「跟随主题」推导（详见 styles.css `.is-dark` 段）
- 按钮质感默认「柔光」（neumorphism 轻浮雕），另有「玻璃」（glassmorphism）备选，均已在 CSS 中实现

## 4. Screens / Views 屏幕清单

### 4.1 移动端（390×844 内容区，`平常 PingChang 原型.html`）

| 屏 | 用途 | 要点 |
|----|------|------|
| **登录/注册** | 账号进入 | 信封封面式：印章「常」+ 品牌字 + 翻盖卡片；登录/注册双 Tab；校验（邮箱或 11 位手机号、密码≥6、二次一致）；注册 → 3 步引导 |
| **注册引导（3步）** | 精神身份证 | ①昵称+一句话介绍(20-60字) ②兴趣标签(3-5个/30备选) ③活跃时段+书信频率；顶部进度条 |
| **此刻（首页）** | 当日入口 | 问候语、今日心情卡（未记录→内嵌 MoodWidget；已记录→徽章+日记+「修改」）、快捷磁贴、最近的信、去年的今天卡 |
| **心情记录 MoodWidget** | 记情绪 | 5 主情绪脸谱 → **二级细分感受 chips（每情绪8个，选填）** → 强度滑杆(1-5) → 日记(选填,≥30字) → 可见性三档 |
| **信箱** | 信件管理 | 收件箱/已发出/草稿箱三段；信封卡（未读红点+左侧色条）；FAB ✎ |
| **信件详情** | 读信 | **拆信动画**（信封开启→信纸滑出，读/未读都播放）；带横线信纸；回信按钮 |
| **写信** | 写/回信 | 收信人、标题(≤30)、正文（字数门槛：首封150/回信100）；**AI 灵感面板**（顺着我的风格续写×3候选、帮我润色）；封存寄出 |
| **旅程-我的旅程** | 情绪月历 | 可翻月日历（情绪彩点）+ 当日详情（徽章/强度/日记）+ **当月情绪走势折线**（点可点选看当天）；**往日记录仅可改可见性** |
| **旅程-心情广场** | 公开心情流 | 公开心情卡（作者/徽章/日记/强度）+ 两级评论 + 回应输入 |
| **灵魂匹配** | 遇见笔友 | 每日推荐卡（契合分/共同标签高亮/跳过）；对方主页（介绍/标签/最近写道→写信） |
| **我的** | 个人中心 | 头像昵称介绍、统计三格、菜单（已发出/旅程/编辑资料/重看引导/**退出登录**）、会员卡片 |

### 4.2 桌面端（`平常 Web 桌面版.html`，共享同一套 tokens）

| 视图 | 布局 |
|------|------|
| **壳层** | 左侧边栏 232px（印章logo + ✎写一封信主按钮 + 四项导航（信箱带未读角标）+ 底部用户切片）；内容区 max-width 1180 居中 |
| **此刻** | 双栏 `1fr + 392px`：左=今日心情卡+去年的今天；右=最近的信列表 |
| **信箱** | **双栏** `384px + 1fr`：左=三Tab+信封卡列表（选中描边高亮）；右=阅读窗（空态→火漆信封「拆信」→展开信纸+回信/归档） |
| **旅程** | **并排** `448px + 1fr`：左=月历+当月走势；右=当日详情（含 MoodWidget，往日锁定为仅可见性）；广场=两栏瀑布卡片+展开评论 |
| **写信** | `1fr + 316px`：左=信纸（收信人chips区分「首封」、标题、横线正文、字数进度、存草稿/封存寄出）；右=AI 灵感栏+写信约定卡 |
| **登录** | 居中 400px 信封卡（同移动端组件） |
| **响应式** | `<1160px` 侧栏收成 74px 图标栏；`<960px` 全部双栏纵向堆叠 |

## 5. Interactions & Behavior 交互与行为

- **拆信动画**：信封盖翻开→信纸上滑抽出，时长受「节奏」系数（默认轻快 0.6×，基准约 1.8s）；读/未读均播放；`prefers-reduced-motion` 时应直接显示内容
- **页面切换**：Tab 间 fade（`.tab-fade`，~300ms ease）；叠层页（写信/详情）自右滑入
- **Toast**：底部居中，1.8~1.9s 自动消失，文案带「✦」
- **字数门槛**：写信按钮 disabled 直至达标，进度文案「已写 n / N 字」；心情日记 0 字或 ≥30 字有效
- **往日心情**：只读摘要 + 仅可见性可改（按钮文案「修改可见性/更新可见性」）
- **AI 灵感**：候选句 shimmer 加载 → 点击插入正文末尾；润色需正文 ≥10 字；结果不自动保存
- **广场评论**：Enter 或发送按钮提交；两级结构（parent_id）；评论后计数 +1
- **趋势图**：点圆点→虚线游标+放大点+下方详情（日期/徽章/强度/日记）
- **悬停态（桌面）**：导航项/更多链接/收信人 chips/AI 候选均有 hover（accent 着色或 8~14% accent 底）

## 6. State Management 状态与数据

前端所需核心状态（原型已示范）：

- `auth`：token + hasProfile（注册后未完成引导 → 强制进 3 步引导）
- `todayMood`：当日心情（决定首页卡片形态）
- `letters/sent/drafts`：三列表分页
- `journey`: `{year, month, selDay}`（月历+走势+详情联动）
- `writeDraft`：收信人/标题/正文（建议 localStorage 自动暂存）
- 服务端数据契约、分页、错误码 → **全部见 `docs/API-WEB-v1.0.md`**；mock→接口替换对照 → `docs/MOCK-INVENTORY.md`

## 7. Design Tokens 设计令牌（黛雾定稿）

```css
/* 主题：黛雾 theme-mist（V1 默认） */
--color-primary: #57505C;   --color-primary-deep: #423C47;
--color-accent:  #9C7B86;   /* 强调色（用户定稿） */
--color-bg: #DAD6CD;  --color-bg-2: #D0CBC0;
--color-paper: #DED9CE;  --color-paper-edge: #CCC6B8;  --color-card: #E6E3DB;
--color-ink: #2E2C28;  --color-ink-secondary: #79756C;
--color-seal: #AE6E7C;  --color-gold: #B3A578;
--surface-head: #A6B9A6;  --on-head: #2A302A;
--btn-fill: #2E2C28;  --on-btn: #F2F0EA;
/* 情绪五色 */
--m-happy: #C2A86A;  --m-calm: #8FAE9B;  --m-sad: #8E89A8;
--m-anxious: #C09A6E;  --m-mixed: #B294A0;
--hairline: rgba(46,44,40,.14);
/* 字体 */
--font-sans: "Noto Sans SC", system-ui;   /* 正文（定稿为黑体） */
--font-serif: "Noto Serif SC", serif;     /* 备选衬线，主题可切换 */
/* 圆角/阴影 */
--radius-card: 14px;  --radius-sm: 8px;
--shadow-card: 0 1px 2px rgba(58,42,26,.06), 0 10px 22px -14px rgba(58,42,26,.35);
```

- 间距节奏：卡片内边距 20~22px；列表间隙 10px；栅格 gap 22px；桌面页边距 34/42px
- 字号：桌面页标题 26 / 卡片题 16 / 正文 15（行高 2.15）/ 辅助 12~13；移动端最小 11px
- 情绪颜色**只跟五种主情绪**绑定（细分感受不改色）；完整 15 套主题变量见 `styles.css`
- 深色模式：`.is-dark` 由主题色相推导（oklab color-mix），实现照抄 `styles.css` 567-599 行

## 8. Assets 资源

- 字体：Google Fonts — Noto Sans SC / Noto Serif SC（400/500/600/700），生产建议自托管
- 图标：全部为 Unicode 字形（✎ ✉ ❍ ❖ ✶ ✦ ☾ ❋ ⇠），无图标库依赖；无位图资源
- 印章/信封/火漆：纯 CSS 绘制（见 `.login-seal` `.dsk-sealed-*`）

## 9. Files 文件清单

```
design_handoff_pingchang_web/
├── README.md                      ← 本文档
├── prototype/
│   ├── 平常 PingChang 原型.html    ← 移动端原型（入口）
│   ├── 平常 Web 桌面版.html        ← 桌面端原型（入口）
│   ├── styles.css                 ← 全部设计令牌 + 组件样式（移动+通用）
│   ├── desktop.css                ← 桌面壳层与双栏布局
│   ├── data.jsx                   ← mock 数据 + 常量（词表/枚举以此为准）
│   ├── components.jsx             ← 共享组件（MoodWidget/TrendChart/信封卡…）
│   ├── screens1.jsx / screens2.jsx← 移动端各屏
│   ├── desktop-shell.jsx / desktop-views.jsx / desktop-mail.jsx ← 桌面各视图
│   └── tweaks-panel.jsx           ← 设计工具（不移植）
└── docs/
    ├── API-WEB-v1.0.md            ← ★ 后端/DB/API 唯一契约
    ├── MOCK-INVENTORY.md          ← ★ mock→接口替换对照
    ├── PRD.md                     ← 业务规则与边界状态
    ├── INTERFACE-DOC-v0.2.md      ← 语义源（云函数版，仅参考）
    └── AI-Agent-SPEC.md           ← AI 灵感能力规格
```

## 10. 后端要点速览（详见 API-WEB-v1.0.md）

- **鉴权**：JWT Bearer；`POST /auth/register|login|logout`；注册→`hasProfile=false`→`POST /users/profile` 完成引导
- **数据库 6 集合**：users / letters / drafts / moods / mood_comments / matches（字段与索引见契约 §10）
- **硬规则（服务端必须复校）**：首封≥150字 · 回信≥100字 · 日记≥30字 · 评论1-200字 · intro 20-60字 · 标签3-5个
- **内容安全**：所有 UGC 落库前过文本审核（方案见契约 §8）
- **AI 灵感**：`POST /ai/inspiration|polish`，服务端取用户近 3 封信作风格样本调用 LLM，**密钥不下发**；限频+超时降级
- **定时任务**：每日匹配计算(00:00) / 去年今日提醒(08:00) / 不活跃检查(09:00)
- **原型痕迹提醒**：原型"今天"硬编码 `2026-06-04`、当前用户写死为 `ME(拾光)`——生产以服务端时间与登录态为准
