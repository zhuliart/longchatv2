# Web API 文档 v1.0 — PingChang 平常（HTML/Web 版）

> 版本：v1.0 · 最后更新：2026-07-03
> 本文档是 `INTERFACE-DOC-v0.2.md`（微信云函数版）的 **Web/REST 移植**：业务规则、字段、数据模型与 v0.2 完全一致，只替换了调用方式、鉴权与内容安全三件平台相关的事。
> 前端设计稿：`prototype/`（React 原型，数据形态即本接口的返回形态）。

---

## 0. 与小程序版的差异总览

| 维度 | 小程序版 (v0.2) | Web 版 (本文档) |
|------|----------------|----------------|
| 调用方式 | `wx.cloud.callFunction({ name })` | REST：`fetch('/api/v1/...')` |
| 身份 | OPENID（微信隐式登录） | **JWT Bearer**（邮箱/手机号注册登录） |
| 内容安全 | 微信 `security.msgSecCheck` | 通用文本审核服务（见 §8） |
| 用户主键 | `_id = openid` | `_id = 服务端生成的 uid`，与登录账号解耦 |
| 推送提醒 | 微信订阅消息 | 邮件通知（可选，MVP 可省） |

其余：错误码、字数门槛、可见性语义、分页规则 **全部沿用 v0.2**。

---

## 1. 全局约定

- **Base URL**：`/api/v1`
- **格式**：请求/响应均为 `application/json`；日期一律 ISO 8601（`created_at`），业务日期用 `YYYY-MM-DD`（`date`）。
- **鉴权**：除 §2 的注册/登录外，所有接口需 `Authorization: Bearer <token>`。401 = 未登录/过期。
- **响应包**：沿用 `{ code, data, message }`，HTTP 状态码同时置对应值（成功 200；业务错误仍返回 200 + `code`，便于前端统一处理；鉴权失败 401；服务端异常 500）。
- **错误码**：同 v0.2 —— `1001` 内容违规 / `1002` 字数不足 / `1003` 对方已拒收 / `1004` 推荐已用完 / `1005` 通信组数达上限 / `9001` 参数或权限错误 / `9002` 超时。
- **分页**：`?page=0`，每页 10（评论 20）。
- **字数校验**：服务端重新计算——首封 ≥150 / 回信 ≥100 / 心情日记（若填）≥30 / 评论 1–200。

---

## 2. 账号与鉴权（Web 新增）

| # | 接口 | 方法 & 路径 | 说明 |
|---|------|------------|------|
| A1 | 注册 | `POST /auth/register` | `{ account, password }`，account 为邮箱或手机号 |
| A2 | 登录 | `POST /auth/login` | `{ account, password }` → `{ token, hasProfile }` |
| A3 | 登出 | `POST /auth/logout` | 使 token 失效（服务端黑名单或短时效+刷新） |
| A4 | 刷新 | `POST /auth/refresh` | 可选；长会话方案 |

**说明**：
- 注册成功即发 token，但 `hasProfile=false`，前端进入 3 步引导页 → 调 §7 `POST /users/profile`（对应原 `createUser`）补全昵称/介绍/标签后才算完成入驻。
- 密码 bcrypt 存储；登录限速防爆破。
- 原型未设计登录页 UI —— **Web 版需要补登录/注册界面设计**（见文末待办）。

---

## 3. 路由总表（云函数 → REST 映射）

| v0.2 云函数 | Web 路由 |
|-------------|----------|
| `sendLetter` | `POST /letters` |
| `getLetter` | `GET /letters/:id` |
| `replyLetter` | `POST /letters/:id/reply` |
| `getInbox` | `GET /letters/inbox?page=` |
| `getSent` | `GET /letters/sent?page=` |
| `archiveLetter` | `POST /letters/:id/archive` |
| `saveDraft` | `POST /drafts`（带 id 则更新，或 `PUT /drafts/:id`） |
| `getDrafts` | `GET /drafts?page=` |
| `deleteDraft` | `DELETE /drafts/:id` |
| `getWritingInspiration` | `POST /ai/inspiration` |
| `polishLetter` | `POST /ai/polish` |
| `moderateContent` | （服务端内部调用，不暴露） |
| `saveMood` | `PUT /moods/:date`（date=YYYY-MM-DD，天然幂等 upsert） |
| `getMoods` | `GET /moods?year=&month=` |
| `updateMoodVisibility` | `PATCH /moods/:id/visibility` |
| `getMoodTrend` | （不单设；前端由 `GET /moods` 派生当月趋势） |
| `getMemoryToday` | `GET /moods/memory-today` |
| `getPublicMoods` | `GET /plaza/moods?page=&includeSelf=` |
| `commentOnMood` | `POST /plaza/moods/:id/comments` |
| `getMoodComments` | `GET /plaza/moods/:id/comments?page=` |
| `getMatches` | （服务端定时任务，不暴露） |
| `getDailyRecommend` | `GET /matches/daily` |
| `skipUser` | `POST /matches/:targetUid/skip` |
| `getPublicProfile` | `GET /users/:uid/profile` |
| `createUser` | `POST /users/profile` |
| `getUser` | `GET /users/me` |
| `updateUser` | `PATCH /users/me` |
| `checkInactivity` | （服务端定时任务，不暴露） |

---

## 4. 书信 & 草稿

### `POST /letters` — 寄信
```js
// 请求
{ "content": "...", "targetUid": "u_xxx", "isFirst": true, "title": "可选,≤30字" }
// 200
{ "code": 0, "data": { "_id": "l_xxx" }, "message": "ok" }
// 字数不足
{ "code": 1002, "data": null, "message": "字数不足，至少需要150字，当前80字" }
```
寄出成功后服务端删除对应草稿（或前端随后 `DELETE /drafts/:id`，二选一，推荐前者）。

### `GET /letters/:id` — 详情
返回同 v0.2 №2；收件人首读自动置 `status:'read'` + `read_at`。仅收发双方可读（否则 `9001`）。

### `POST /letters/:id/reply` — 回信
`{ "content": "≥100字", "title": "可选" }` → `{ code:0, data:{ _id } }`。`:id` 即原信，服务端写 `parent_id`。

### `GET /letters/inbox` / `GET /letters/sent` — 列表
返回数组同 v0.2 №4/№5（含 `senderNickname`/`receiverNickname`，服务端关联）。inbox 过滤 `archived`。

### `POST /letters/:id/archive` — 归档
→ `{ code:0, data:null }`

### 草稿三件套
- `POST /drafts` — `{ id?, content, targetUid?, title?, isFirst? }` → `{ _id }`
- `GET /drafts?page=` — 返回 `{ _id, to_uid, receiverNickname, title, excerpt, word_count, required, updated_at }[]`
- `DELETE /drafts/:id` — `{ code:0 }`

---

## 5. AI 写作灵感

> Web 版同样**必须走服务端**：由后端取该用户最近 ≤3 封已发信件作风格样本、拼 prompt、调大模型 API。密钥只存服务端。建议每用户每日限 N 次、超时 8s 降级返回友好提示。

### `POST /ai/inspiration` — 风格续写
```js
{ "draft": "当前草稿，可空", "targetUid": "可选" }
→ { "code": 0, "data": { "suggestions": ["候选句1","候选句2","候选句3"] } }
```

### `POST /ai/polish` — 润色
```js
{ "text": "≥10字" }
→ { "code": 0, "data": { "polished": "..." } }
// 过短 → { "code": 1002, "message": "先写下一点内容，再帮你润色" }
```
生成结果不落库，用户采用后随信件正常走审核。

---

## 6. 情绪记录 & 心情广场

### `PUT /moods/:date` — 记录/更新当天心情
```js
{ "emotion": "happy|calm|sad|anxious|mixed", "intensity": 3,
  "feeling": "可选,≤8字,属对应词表(软校验)", "visibility": "private|friends|public",
  "diary": "可选,填则≥30字" }
→ { "code": 0, "data": { "_id", "emotion", "feeling", "intensity", "visibility", "date" } }
```
`:date` 为 `YYYY-MM-DD`；同日重复提交即覆盖（upsert）。**服务端校验 `:date` ≤ 今天；且仅"今天"可写全量内容**，往日只能走下面的 visibility 接口（与原型交互一致）。

### `GET /moods?year=2026&month=6` — 某月记录
返回 `{ _id, emotion, feeling, intensity, diary, visibility, commentCount, date }[]`。月历、当月趋势图（前端派生）、详情共用。

### `PATCH /moods/:id/visibility` — 往日仅改可见性
`{ "visibility": "public" }` → `{ code:0, data:{ _id, visibility } }`。仅本人；public→非 public 时保留评论、仅从广场下架。

### `GET /moods/memory-today` — 去年的今天
返回同 v0.2 №17（`type: mood | letter`，或 `data:null`）。

### 广场
- `GET /plaza/moods?page=&includeSelf=false` — 仅 public，倒序，`{ _id, authorNickname, date, emotion, feeling, intensity, diary, commentCount }[]`
- `POST /plaza/moods/:id/comments` — `{ content: "1-200字", parentId?: "回复时填" }` → `{ _id, commentCount }`；非 public → `9001`
- `GET /plaza/moods/:id/comments?page=` — `{ _id, fromNickname, content, created_at, parent_id }[]`，前端按 `parent_id` 组两级

---

## 7. 匹配 & 用户

- `GET /matches/daily` — 每日推荐（免费 3 / 会员 5；用完 `1004`），返回同 v0.2 №22
- `POST /matches/:targetUid/skip` — 跳过，当日不再出现
- `GET /users/:uid/profile` — 他人公开资料（无隐私标识，`recentExcerpt` ≤50字）
- `POST /users/profile` — 注册后补全资料 `{ nickname≤20, intro 20-60字, tags 3-5个, activeTime?, letterFreq? }`（对应原 createUser；重复提交 → `9001` 已有资料）
- `GET /users/me` — 当前用户（含 lettersSent / lettersReceived / moodDays 聚合）
- `PATCH /users/me` — 局部更新资料（传啥改啥）

---

## 8. 内容安全（服务端内部）

所有 UGC（信件、日记、评论、intro）落库前过文本审核。Web 版用通用服务任选其一：
- 云厂商文本审核（阿里云绿网 / 腾讯云 TMS / 百度内容安全）
- 或自建敏感词 + LLM 复审兜底

约定不变：`pass` 放行 / `risky` 拒绝（`code:1001`）/ `review` 放行并标记待人工。审核服务异常时放行 + 记日志（与 v0.2 一致）。

---

## 9. 定时任务（服务端 cron，不暴露 API）

| 任务 | 频率 | 内容 |
|------|------|------|
| 匹配计算 | 每日 00:00 | Jaccard 相似度写 `matches`（同 v0.2 №21） |
| 去年今日提醒 | 每日 08:00 | 有记忆的用户发提醒（Web 用邮件/站内红点，MVP 可省） |
| 不活跃检查 | 每日 09:00 | 7/14/30 天未回应标记（同 v0.2 №28） |

---

## 10. 数据模型

与 v0.2 完全一致（users / letters / drafts / moods / mood_comments / matches），仅两处差异：
1. `users._id` 不再是 openid，是服务端生成 uid；新增 `account`（邮箱/手机，唯一索引）与 `password_hash` 字段。
2. 所有 `*_uid` 字段引用该 uid。

索引建议照抄 v0.2 末表，另加 `users: { account: 1 } unique`。

---

## 待办（设计侧）

Web 版相对原型缺两块 UI，需要设计稿补充：
1. **登录 / 注册页**（§2）—— 原型从"已登录"状态开始
2. **桌面端响应式布局**（若定位不只是移动 H5）—— 现原型为 390px 移动版式

---

*Web API v1.0。语义源：`INTERFACE-DOC-v0.2.md`；mock 对照：`MOCK-INVENTORY.md`。*
