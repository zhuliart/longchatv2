# MOCK 数据清单 — PingChang 平常原型

> 版本：2026-06-18 · 配合 `prototype/` 高保真原型阅读
> 用途：原型里**所有写死的假数据**集中在 `prototype/data.jsx`（通过 `Object.assign(window, …)` 挂到全局）。本清单逐项说明每块 mock 对应哪个云函数、接入真实数据时该替换成什么。Code 据此把原型的 `window.XXX` 改为接口调用即可。
>
> ⚠️ 全局前提：原型里"当前用户"是 `ME`（`拾光`），"今天"硬编码为 **`2026-06-04`**。正式版用户来自登录态（OPENID），日期用服务端时间。

---

## 一、常量类（前端保留，不需接口）

这些是 UI 词表/枚举，**保留在前端即可**，后端只需在校验时认同同一套枚举。

| 常量 | 内容 | 说明 |
|------|------|------|
| `EMOTIONS` | 5 种主情绪 happy/calm/sad/anxious/mixed | 颜色与统计的唯一依据 |
| `EMOTION_LABEL` | 主情绪中文名 | 展示用 |
| `EMOTION_FEELINGS` | 每种主情绪下 8 个细分感受 | 见 DELTA-v0.2 A 节，后端软校验 |
| `VISIBILITY_OPTIONS` / `VISIBILITY_LABEL` | 三档可见性 | 信件与心情共用 |
| `ACTIVE_TIME_LABEL` | 活跃时段中文 | 展示用 |
| `LETTER_FREQ_LABEL` | 书信频率中文 | 展示用 |
| `PRESET_TAGS` | 30 个兴趣标签 | 注册/编辑资料选择源；可改为后端下发以便运营调整 |

---

## 二、需替换为接口的 mock 数据

| # | mock（window.*） | 用在哪个页面 | 替换为接口 | 备注 |
|---|------------------|--------------|------------|------|
| 1 | `ME` | 我的页、首页问候、写信署名 | `getUser()` | 当前登录用户资料 |
| 2 | `STATS`（lettersSent/Received/moodDays） | 我的页统计 | `getUser()` 返回内含 | 后端聚合，勿信前端 |
| 3 | `LETTERS`（收到的信，3封） | 首页"最近的信"、信箱-收件 | `getInbox(page)` | `status` 决定是否未读/拆封动画 |
| 4 | `SENT`（已发出，3封） | 信箱-已发出 | `getSent(page)` | — |
| 5 | `DRAFTS`（草稿，3条） | 信箱-草稿、写信进入 | `getDrafts(page)` | `required` 字数门槛见 DELTA-E |
| 6 | `MATCHES`（推荐，3个） | 灵魂匹配页 | `getDailyRecommend()` | 免费3条/会员5条 |
| 7 | `MEMORY_TODAY` | 首页"去年的今天"卡片 | `getMemoryToday()` | 可能返回 mood 或 letter 或 null |
| 8 | `MOODS`（当月情绪，含 md0 去年） | 旅程页月历、详情、首页"今日已记录" | `getMoods(year, month)` | 带 `feeling`/`visibility`/`commentCount` |
| 9 | `TREND`（30天趋势数组） | 旅程页折线图 | 复用 `getMoods` 派生 **或** `getMoodTrend({year,month})` | 已改为**按月**，见 DELTA-G |
| 10 | `FEED`（心情广场，3条+评论） | 旅程页"心情广场"tab | `getPublicMoods(page)` + `getMoodComments(moodId)` | 评论两级，见 DELTA-B |

---

## 三、被 mock 模拟、需走真实接口的「动作」

原型里这些操作只是本地 setState / toast，**没有真正落库**，接入时要对应调用：

| 原型动作 | 位置 | 真实接口 |
|----------|------|----------|
| 写信「封存寄出」 | 写信页 | `sendLetter` / `replyLetter`（回信）→ 成功后 `deleteDraft` |
| 打开未读信（拆信动画后标记已读） | 信件详情 | `getLetter`（后端首读自动置 `read`） |
| 记录/更新今日心情 | 首页情绪卡 → MoodWidget | `saveMood`（含 `feeling`/`visibility`） |
| 修改往日心情可见性 | 旅程页往日记录 | `updateMoodVisibility` |
| 心情广场发评论/回复 | 广场卡片 | `commentOnMood`（含 `moderateContent`） |
| 跳过推荐用户 | 匹配页「跳过」 | `skipUser` |
| 查看对方主页 | 匹配卡 → 主页 | `getPublicProfile(targetUid)` |
| 注册引导 3 步提交 | 引导页 | `createUser` |
| 编辑资料保存 | 编辑资料页 | `updateUser` |
| **AI 续写 / 润色** | 写信页「灵感」面板 | `getWritingInspiration` / `polishLetter`（**原型用 `window.claude`，正式版必须改云函数**） |
| 信件归档 | （信件操作） | `archiveLetter` |

---

## 四、接入时的注意点

1. **昵称 vs uid**：原型为方便直接写了 `senderNickname`/`authorNickname` 等昵称字段。真实接口里这些昵称应由后端按 `from_uid`/`uid` 关联返回，**前端不持有他人 openid 之外的隐私标识**。
2. **字数校验**：原型在前端算 `word_count` 并卡门槛（首封 150 / 回信 100 / 日记 30）。后端必须**重新计算并校验**，不信任前端。
3. **时间展示**：原型用 `timeDisplay`（"2 小时前""昨天"）和 `date` 双轨。真实接口返回 ISO `created_at`，相对时间由前端格式化（`utils/date.js`）。
4. **内容安全**：所有 UGC（信件、心情日记、评论、资料介绍）写库前过 `moderateContent`。
5. **分页**：列表类接口统一 `page` 从 0 开始、每页 10（评论 20）。

---

*本清单随原型演进更新。删除 mock、切换为接口后，`prototype/data.jsx` 可整体废弃，仅保留第一节常量。*
