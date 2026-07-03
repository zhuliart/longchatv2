# 接口文档 v0.2（全量）— PingChang 平常云函数

> 版本：v0.2 · 最后更新：2026-06-18
> 本文档为 **v0.1 + DELTA-v0.2 合并后的完整版**，开发以此为准（v0.1 / delta 仅作历史参考）。
> 所有云函数通过 `wx.cloud.callFunction` 调用，统一响应结构 `{ code, data, message }`。

---

## 调用方式

```js
// 通过 utils/api.js 封装调用（禁止在页面直接调用 wx.cloud.callFunction）
const api = require('../../utils/api')
const res = await api.sendLetter({ content: '...', targetUid: '...' })
// res = { code: 0, data: { _id: 'xxx' }, message: 'ok' }
```

## 全局响应结构

```js
{ code: 0, data: { /* 业务数据 */ }, message: 'ok' }   // 成功
{ code: 1001, data: null, message: '内容包含违规信息' }  // 失败
```

### 错误码

| 错误码 | 含义 |
|--------|------|
| `1001` | 内容未通过安全检测 |
| `1002` | 字数不足 |
| `1003` | 对方已拒绝接收 |
| `1004` | 每日推荐已用完 |
| `1005` | 活跃书信组数已达上限 |
| `9001` | 数据库操作失败 / 参数错误 / 无权限 |
| `9002` | 云函数超时 |

### 全局约定
- **OPENID** 由 `cloud.getWXContext()` 取得，作为身份；前端不传。
- 所有 UGC（信件、心情日记、评论、资料介绍）写库前必须过 `moderateContent`。
- 字数门槛后端**重新计算并校验**，不信任前端：陌生人首封 150 字 / 回信 100 字 / 心情日记 30 字。
- 列表接口 `page` 从 0 开始，每页 10 条（评论 20 条）。
- 不返回他人 openid 之外的隐私标识（手机号、微信号等）。
- 原型阶段"今天"硬编码 `2026-06-04`，正式版以服务端时间为准。

---

# 一、书信

### 1. sendLetter — 发送信件
**输入**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | String | 是 | 信件正文 |
| `targetUid` | String | 是 | 收信人 openid |
| `isFirst` | Boolean | 是 | 是否陌生人首封信（影响字数门槛） |
| `title` | String | 否 | 标题，≤ 30字 |

**返回**
```js
{ code: 0, data: { _id: 'letter_id_xxx' }, message: 'ok' }
{ code: 1002, data: null, message: '字数不足，至少需要150字，当前80字' }
{ code: 1001, data: null, message: '内容包含违规信息，请修改后重新发送' }
```
**说明**：`from_uid` 取 OPENID；后端独立算 `word_count`；写入前过 `moderateContent`；寄出成功后应删除对应草稿。

### 2. getLetter — 信件详情
**输入**：`{ id: String }`
```js
{ code: 0, data: {
  _id, from_uid, to_uid, title, content, word_count,
  status: 'read', is_first, created_at, read_at, senderNickname
}, message: 'ok' }
{ code: 9001, data: null, message: '无权限查看此信件' }
```
**说明**：仅 `from_uid`/`to_uid === OPENID` 可读；收件人首读自动置 `status: 'read'` 并记 `read_at`。

### 3. replyLetter — 回复信件
**输入**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `parentId` | String | 是 | 原信件 `_id` |
| `content` | String | 是 | 回信正文（≥ 100字） |
| `title` | String | 否 | 标题，≤ 30字 |

```js
{ code: 0, data: { _id: 'reply_letter_id' }, message: 'ok' }
{ code: 1002, data: null, message: '回信至少需要100字，当前60字' }
```

### 4. getInbox — 收件箱（分页）
**输入**：`{ page?: Number }`
```js
{ code: 0, data: [ { _id, from_uid, title, content, word_count, status, is_first, created_at, senderNickname } ], message: 'ok' }
```
**说明**：只返回 `to_uid === OPENID` 且 `status !== 'archived'`。

### 5. getSent — 已发出（分页）
**输入**：`{ page?: Number }`
```js
{ code: 0, data: [ { _id, to_uid, title, content, word_count, status, created_at, receiverNickname } ], message: 'ok' }
```

### 6. archiveLetter — 归档信件
**输入**：`{ id: String }` → `{ code: 0, data: null, message: 'ok' }`
**说明**：`status` 置 `'archived'`，归档后不再进收件箱；仅信件相关方可操作。

---

# 二、草稿

### 7. saveDraft — 保存/更新草稿
**输入**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | String | 否 | 传则更新，不传则新建 |
| `content` | String | 是 | 正文 |
| `targetUid` | String | 否 | 收信人 uid（可空，"还没想好寄给谁"） |
| `title` | String | 否 | 标题，≤ 30字 |
| `isFirst` | Boolean | 否 | 是否首封（决定 `required` 门槛） |

```js
{ code: 0, data: { _id: 'draft_id' }, message: 'ok' }
```

### 8. getDrafts — 草稿列表（分页）
**输入**：`{ page?: Number }`
```js
{ code: 0, data: [
  { _id, to_uid, receiverNickname, title, excerpt, word_count, required, updated_at }
], message: 'ok' }
```
**说明**：`receiverNickname` 后端关联，匿名草稿为空串；`excerpt` 后端截前 N 字；`required` 为字数门槛（首封150/回信100）。

### 9. deleteDraft — 删除草稿
**输入**：`{ id: String }` → `{ code: 0, data: null, message: 'ok' }`
**说明**：仅 `uid === OPENID` 可删。

---

# 三、AI 写作灵感

> 原型用 `window.claude.complete(prompt)`，prompt 内嵌用户最近 3 封已发信件摘录作风格样本。
> **正式版必须封装为云函数**：后端取历史信件、拼 prompt、调大模型 API，**密钥不下发前端**。建议加每日频率限制与超时降级。

### 10. getWritingInspiration — 风格续写
**输入**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `draft` | String | 否 | 当前草稿（空则给开头灵感） |
| `targetUid` | String | 否 | 收信人 uid（贴合语境，可选） |

```js
{ code: 0, data: { suggestions: ['候选句1','候选句2','候选句3'] }, message: 'ok' }
```
**说明**：返回 1–3 条候选，前端点选即插入；结果不自动落库。

### 11. polishLetter — 润色
**输入**：`{ text: String }`（≥ 10字）
```js
{ code: 0, data: { polished: '润色后的整段文字……' }, message: 'ok' }
{ code: 1002, data: null, message: '先写下一点内容，再帮你润色' }
```

---

# 四、内容安全

### 12. moderateContent — 内容审核
**输入**：`{ content: String }`
```js
{ code: 0, data: { suggest: 'pass' }, message: 'ok' }
{ code: 1001, data: { suggest: 'risky' }, message: '内容包含违规信息' }
{ code: 0, data: { suggest: 'review' }, message: 'ok' }   // 待审核，放行
```
**说明**：微信内容安全 API v2；API 异常时放行并记日志。

---

# 五、情绪记录

### 13. saveMood — 保存情绪记录
**输入**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `emotion` | String | 是 | `happy`\|`calm`\|`sad`\|`anxious`\|`mixed` |
| `intensity` | Number | 是 | 1–5 整数 |
| `date` | String | 是 | `YYYY-MM-DD` |
| `feeling` | String | 否 | 细分感受，≤ 8字，应属对应 emotion 词表（软校验） |
| `visibility` | String | 是 | `private`\|`friends`\|`public`，默认 `private` |
| `diary` | String | 否 | 心情日记（填写则 ≥ 30字） |

```js
{ code: 0, data: { _id, uid, emotion, feeling, intensity, visibility, date }, message: 'ok' }
{ code: 1002, data: null, message: '日记至少需要30字，当前15字' }
```
**说明**：同一天重复保存覆盖更新（upsert，`date` 唯一）；日记若存在则过 `moderateContent`。

> **细分词表 EMOTION_FEELINGS**（前端常量，颜色仍按 emotion）：
> happy: 雀跃/欣喜/感激/满足/被爱/自豪/踏实/期待 · calm: 放松/安定/自在/专注/释然/安心/温柔/从容 · sad: 失落/孤独/想念/委屈/低落/疲惫/空落/怀念 · anxious: 紧张/不安/担忧/烦躁/压力/害怕/慌乱/犹豫 · mixed: 矛盾/怅然/五味杂陈/起伏/说不清/百感交集/欲言又止/似喜似忧

### 14. getMoods — 月份情绪列表
**输入**：`{ year: Number, month: Number }`（month 1–12）
```js
{ code: 0, data: [
  { _id, emotion, feeling, intensity, diary, visibility, commentCount, date }
], message: 'ok' }
```
**说明**：用于月历 + 当月趋势图（趋势可由本接口结果在前端派生，见 16）。

### 15. updateMoodVisibility — 仅改往日心情可见性
**输入**：`{ moodId: String, visibility: String }`
```js
{ code: 0, data: { _id, visibility }, message: 'ok' }
{ code: 9001, data: null, message: '无权修改此记录' }
```
**说明**：往日记录内容不可改、仅可改可见性；仅 `uid === OPENID` 可操作。从 public 改非 public 时建议保留评论、仅从广场下架。（亦可让 `saveMood` 支持"仅传 visibility 即只更新"，二选一。）

### 16. getMoodTrend — 情绪趋势（按月）
**输入**：`{ year: Number, month: Number }`
```js
{ code: 0, data: [ { date, intensity, emotion, feeling } ], message: 'ok' }
```
**说明**：原型趋势图已改为**跟随当前月份**。**推荐方案**：前端直接用 `getMoods` 结果派生当月趋势，可不单独调本接口；若保留则按 year/month 返回该月有记录的日期，前端补空位。

### 17. getMemoryToday — 去年的今天
**输入**：无
```js
{ code: 0, data: { type: 'mood', _id, emotion, feeling, intensity, diary, date }, message: 'ok' }
{ code: 0, data: { type: 'letter', _id, content, created_at }, message: 'ok' }
{ code: 0, data: null, message: 'no memory' }
```
**说明**：首页加载；每日 8:00 定时触发推送提醒。

---

# 六、心情广场（公开心情 + 评论）

### 18. getPublicMoods — 公开心情广场（分页）
**输入**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `page` | Number | 否 | 0 | 每页 10 条 |
| `includeSelf` | Boolean | 否 | false | 是否含自己的公开记录 |

```js
{ code: 0, data: [
  { _id, authorNickname, date, emotion, feeling, intensity, diary, commentCount }
], message: 'ok' }
```
**说明**：只返回 `visibility === 'public'`，按 `created_at` 倒序；`includeSelf=false` 时过滤 `uid === OPENID`。

### 19. commentOnMood — 评论公开心情（两级）
**输入**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `moodId` | String | 是 | 被评论心情 `_id`（须 public） |
| `content` | String | 是 | 1–200字 |
| `parentId` | String | 否 | 回复某评论填其 `_id`；顶层不填 |

```js
{ code: 0, data: { _id: 'comment_id', commentCount: 6 }, message: 'ok' }
{ code: 9001, data: null, message: '该心情不可评论' }
{ code: 1001, data: null, message: '评论包含违规信息' }
```
**说明**：写入前过 `moderateContent`，写入后递增 `commentCount`。

### 20. getMoodComments — 心情评论列表（分页）
**输入**：`{ moodId: String, page?: Number }`（每页 20）
```js
{ code: 0, data: [
  { _id, fromNickname, content, created_at, parent_id }
], message: 'ok' }
```
**说明**：前端按 `parent_id` 组装两级结构（`null` 为顶层）。

---

# 七、匹配推荐

### 21. getMatches — 计算匹配分（定时触发）
**触发**：每日 0:00 定时；也可手动触发。无入参。
```js
{ code: 0, data: { matched: 42 }, message: 'ok' }
```
**说明**：Jaccard 相似度；已通信用户不参与推荐；结果写 `matches`，`status: 'pending'`。

### 22. getDailyRecommend — 每日推荐
**输入**：无
```js
{ code: 0, data: [
  { _id, score, tagsCommon, profile: { _id, nickname, intro, tags, active_time, letter_freq } }
], message: 'ok' }
{ code: 1004, data: [], message: '今日推荐已用完，明天再来' }
```
**说明**：免费用户最多 3 条，会员最多 5 条。

### 23. skipUser — 跳过推荐
**输入**：`{ targetUid: String }` → `{ code: 0, data: null, message: 'ok' }`
**说明**：对应 `matches` 记录 `status` 置 `'skipped'`，当日不再出现。

---

# 八、用户

### 24. getPublicProfile — 他人公开资料
**输入**：`{ targetUid: String }`
```js
{ code: 0, data: {
  _id, nickname, intro, tags, active_time, letter_freq,
  last_active, isActiveRecently, recentExcerpt, activeTimeLabel, letterFreqLabel
}, message: 'ok' }
```
**说明**：不返回隐私标识；`recentExcerpt` 后端截 ≤ 50字。

### 25. createUser — 新用户注册
**输入**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `nickname` | String | 是 | ≤ 20字 |
| `intro` | String | 是 | 20–60字 |
| `tags` | Array | 是 | 3–5个 |
| `activeTime` | String | 否 | `morning`\|`afternoon`\|`night` |
| `letterFreq` | String | 否 | `weekly`\|`biweekly`\|`free` |

```js
{ code: 0, data: { _id, nickname, intro, tags, active_time, letter_freq, is_member }, message: 'ok' }
{ code: 9001, data: null, message: '用户已注册' }
{ code: 1002, data: null, message: '一句话介绍需在20-60字之间，当前10字' }
```
**说明**：`_id` 用 OPENID；后端复校 `intro` 字数；注册前过 `moderateContent`。

### 26. getUser — 当前用户信息
**输入**：无
```js
{ code: 0, data: {
  _id, nickname, intro, tags, active_time, letter_freq, is_member,
  created_at, last_active, lettersSent, lettersReceived, moodDays
}, message: 'ok' }
{ code: 9001, data: null, message: '用户不存在，请先完成注册' }
```
**说明**：统计字段（lettersSent/Received/moodDays）后端聚合。

### 27. updateUser — 更新资料
**输入**（均选填，传入才更新）：`nickname` / `intro` / `tags` / `activeTime` / `letterFreq`
```js
{ code: 0, data: { /* 同 getUser */ }, message: 'ok' }
{ code: 1001, data: null, message: '介绍内容包含违规信息，请修改' }
```

---

# 九、定时任务

### 28. checkInactivity — 检查不活跃通信
**触发**：每日 9:00 定时。无入参。
```js
{ code: 0, data: { checked: 3, inactiveLetters: [ { threshold: '7天未回应', letters: [ { _id, to_uid, from_uid } ] } ] }, message: 'ok' }
```
**说明**：识别 7/14/30 天未读信件。TODO：触发订阅消息提醒（需用户订阅模板）。

---

# 数据模型

### users
```js
{ _id /*openid*/, nickname /*≤20*/, intro /*20-60*/, tags /*3-5*/,
  active_time: 'morning'|'afternoon'|'night', letter_freq: 'weekly'|'biweekly'|'free',
  created_at, last_active, is_member, member_expire? }
```

### letters
```js
{ _id, from_uid, to_uid, parent_id /*回信*/, title /*≤30,可选*/, content,
  word_count /*后端算*/, status: 'sent'|'read'|'archived'|'rejected', is_first,
  created_at, read_at? }
```

### drafts （新增）
```js
{ _id, uid, to_uid /*可空*/, title /*可空,≤30*/, content,
  word_count /*后端算*/, is_first, created_at, updated_at }
```
索引：`{ uid: 1, updated_at: -1 }`

### moods （新增 feeling / visibility / comment_count）
```js
{ _id, uid, emotion: 'happy'|'calm'|'sad'|'anxious'|'mixed', intensity /*1-5*/,
  feeling /*可选,细分*/, visibility: 'private'|'friends'|'public' /*默认private*/,
  diary /*≥30,可选*/, comment_count /*默认0*/, date /*YYYY-MM-DD,同用户唯一*/ }
```

### mood_comments （新增）
```js
{ _id, mood_id, from_uid, content /*1-200*/, parent_id /*顶层null*/, created_at }
```
索引：`{ mood_id: 1, created_at: 1 }`

### matches
```js
{ _id, uid_a, uid_b, score /*0-100*/, tags_common, status: 'pending'|'active'|'skipped', updated_at }
```

---

# 数据库索引

| 集合 | 索引 | 用途 |
|------|------|------|
| `letters` | `{ to_uid: 1, status: 1 }` | 收件箱查询 < 300ms |
| `drafts` | `{ uid: 1, updated_at: -1 }` | 草稿列表 |
| `moods` | `{ uid: 1, date: 1 }` | 月历查询 < 200ms |
| `moods` | `{ visibility: 1, created_at: -1 }` | 心情广场列表 |
| `mood_comments` | `{ mood_id: 1, created_at: 1 }` | 评论列表 |
| `matches` | `{ uid_a: 1, updated_at: -1 }` | 推荐列表排序 |

---

*接口文档 v0.2 全量版。对应原型当前能力（含情绪细分、心情广场、AI 灵感、草稿箱）。*
