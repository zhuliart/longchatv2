/**
 * 种子数据（T1.3）：npm run seed，幂等可重跑。
 * - 始终：upsert 官方账号「平常信使」（匹配冷启动兜底 + 欢迎信发送方）；
 * - 非生产：另建 3 个测试用户及少量信件/草稿/情绪/公开心情/评论/匹配，供前端联调；
 *   重跑时先清空种子用户名下业务数据再插入（NODE_ENV=production 只建官方号，不放测试数据）。
 * 业务日期一律相对「服务端今天」生成，不带入原型硬编码日期（约定 §1.4-6）。
 */
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { connectMongo, disconnectMongo } from '../db.js';
import { countWords } from '../utils/countWords.js';
import {
  User, Letter, Draft, Mood, MoodComment, Match,
  OFFICIAL_ACCOUNT, syncAllIndexes,
} from '../models/index.js';
import { computeMatchScore, hasCorresponded } from '../services/match.js';

const TEST_PASSWORD = 'test123456'; // 仅测试用户；README 有说明

/** 距今 n 天的业务日期 YYYY-MM-DD（服务端本地时间） */
function ymd(daysAgo = 0, yearsAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setFullYear(d.getFullYear() - yearsAgo);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 距今 n 天的时间戳（错开几小时避免同刻） */
function at(daysAgo = 0, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function upsertUser(fields) {
  const found = await User.findOne({ account: fields.account });
  if (found) {
    found.set(fields);
    await found.save();
    return found;
  }
  return User.create(fields);
}

async function main() {
  await connectMongo();
  await syncAllIndexes();

  // ---- 官方账号（生产/开发都建） ----
  const officialPassword = process.env.SEED_OFFICIAL_PASSWORD || randomBytes(12).toString('hex');
  const messenger = await upsertUser({
    account: OFFICIAL_ACCOUNT,
    password_hash: await bcrypt.hash(officialPassword, config.bcryptRounds),
    nickname: '平常信使',
    intro: '平常的官方信使。负责送出每一封欢迎信，也在你还没遇到笔友的时候，先陪你写一写。',
    tags: ['文学', '书法', '自然'],
    active_time: 'morning',
    letter_freq: 'free',
    has_profile: true,
  });
  logger.info(
    `官方账号「平常信使」就绪（${OFFICIAL_ACCOUNT}）` +
      (process.env.SEED_OFFICIAL_PASSWORD ? '' : `，本次随机密码：${officialPassword}`)
  );

  if (config.isProd) {
    logger.info('NODE_ENV=production：仅建官方号，不放测试数据。seed 完成');
    return;
  }

  // ---- 测试用户（联调用，人设取自原型） ----
  const shiguang = await upsertUser({
    account: 'shiguang@test.com',
    password_hash: await bcrypt.hash(TEST_PASSWORD, config.bcryptRounds),
    nickname: '拾光',
    intro: '习惯在夜里写字的人。喜欢旧书的味道、雨声，和一切慢下来的事物。愿意与你交换一些真诚的句子。',
    tags: ['文学', '摄影', '冥想', '自然', '哲学'],
    active_time: 'night',
    letter_freq: 'biweekly',
    has_profile: true,
  });
  const guiling = await upsertUser({
    account: 'guiling@test.com',
    password_hash: await bcrypt.hash(TEST_PASSWORD, config.bcryptRounds),
    nickname: '归零',
    intro: '用相机和文字记录日常的微光。相信记录是对抗遗忘的方式，也相信慢慢写下来的字更接近真心。',
    tags: ['摄影', '文学', '旅行', '电影'],
    active_time: 'afternoon',
    letter_freq: 'biweekly',
    has_profile: true,
  });
  const qingshan = await upsertUser({
    account: 'qingshan@test.com',
    password_hash: await bcrypt.hash(TEST_PASSWORD, config.bcryptRounds),
    nickname: '青山',
    intro: '在城市里种了一阳台的植物。喜欢清晨打坐，听得见风穿过叶子的声音，也想听听你的日常。',
    tags: ['冥想', '自然', '园艺', '茶道', '哲学'],
    active_time: 'morning',
    letter_freq: 'weekly',
    has_profile: true,
  });
  const testUsers = [shiguang, guiling, qingshan];
  const seedUids = [messenger._id, ...testUsers.map((u) => u._id)];

  // ---- 幂等：清掉种子用户名下旧业务数据后重建 ----
  await Promise.all([
    Letter.deleteMany({ $or: [{ from_uid: { $in: seedUids } }, { to_uid: { $in: seedUids } }] }),
    Draft.deleteMany({ uid: { $in: seedUids } }),
    Mood.deleteMany({ uid: { $in: seedUids } }),
    MoodComment.deleteMany({ from_uid: { $in: seedUids } }),
    Match.deleteMany({ $or: [{ uid_a: { $in: seedUids } }, { uid_b: { $in: seedUids } }] }),
  ]);

  // ---- 信件：欢迎信 ×3 + 拾光⇄归零 首封与回信 ----
  const welcome =
    '你好呀：\n\n这是一封来自平常的信。在这里，我们提倡慢一点、真诚一点地表达。没有点赞，没有已读回执的催促，只有你愿意写下的、和别人愿意读到的句子。\n\n试着给今天的自己记录一种心情，或者，给某个推荐给你的灵魂写下第一封信吧。\n\n—— 平常信使';
  const firstLetter =
    '归零：\n\n看到你主页里写「记录是对抗遗忘的方式」，很想和你聊聊摄影这件事。我拍照的习惯是从大学开始的，那时候用一台二手胶片机，快门声音很轻，像是怕惊动了眼前的光。\n\n后来我发现，自己留下的照片大多不是风景，而是一些说不清楚为什么按下快门的瞬间：楼道里斜进来的光、雨后地面的反光、书页间夹着的干花。它们不好看，却诚实。\n\n你说记录是对抗遗忘，我想补一句：记录也是承认此刻值得被留下。很高兴遇到同样相信这件事的人，期待你的回信。\n\n—— 拾光';
  const replyLetter =
    '拾光：\n\n读到「记录也是承认此刻值得被留下」这句时，我在阳台上站了很久。今天在旧城区拍到一扇爬满常春藤的窗，像一封没有寄出的信，回来的路上一直在想要把它讲给谁听——原来是你。\n\n胶片机的快门声我也喜欢，轻，但是笃定。下次把那扇窗的照片洗出来，随信寄给你（先在想象里寄出）。\n\n—— 归零';

  const [, , , sentFirst] = await Letter.create(
    [
      ...testUsers.map((u, i) => ({
        from_uid: messenger._id,
        to_uid: u._id,
        title: '欢迎来到平常',
        content: welcome,
        word_count: countWords(welcome),
        status: i === 0 ? 'read' : 'sent', // 拾光已读，其余保留未读供拆信动画联调
        is_first: true,
        created_at: at(5, 9),
        read_at: i === 0 ? at(5, 21) : null,
      })),
      {
        from_uid: shiguang._id,
        to_uid: guiling._id,
        title: '致一个爱拍照的人',
        content: firstLetter,
        word_count: countWords(firstLetter),
        status: 'read',
        is_first: true,
        created_at: at(2, 22),
        read_at: at(1, 14),
      },
    ],
    { timestamps: false }
  );
  await Letter.create(
    [
      {
        from_uid: guiling._id,
        to_uid: shiguang._id,
        parent_id: sentFirst._id,
        title: '回信：那扇爬满常春藤的窗',
        content: replyLetter,
        word_count: countWords(replyLetter),
        status: 'sent', // 未读：收件箱红点 + 首读自动置已读联调
        is_first: false,
        created_at: at(0, 8),
      },
    ],
    { timestamps: false }
  );

  // ---- 草稿：一条指定收件人 + 一条「还没想好寄给谁」 ----
  const draft1 = '青山：你信里提到「等待也是一种照料」，我想了好几天。我也在窗台种了一盆薄荷，可总是性急——每天都要去看它长高了没有。';
  const draft2 = '今天莫名地想写点什么，可还没想好寄给谁。先把这种想表达的冲动留在这里。';
  await Draft.create(
    [
      {
        uid: shiguang._id, to_uid: qingshan._id, title: '关于阳台上的那些植物',
        content: draft1, word_count: countWords(draft1), is_first: true,
        created_at: at(1, 20), updated_at: at(0, 7),
      },
      {
        uid: shiguang._id, to_uid: null, title: '',
        content: draft2, word_count: countWords(draft2), is_first: true,
        created_at: at(3, 23), updated_at: at(3, 23),
      },
    ],
    { timestamps: false }
  );

  // ---- 情绪记录：拾光近几日 + 去年今日（memory-today）；归零/青山各一条公开 ----
  const [, moodPublicShiguang] = await Mood.create(
    [
      {
        uid: shiguang._id, emotion: 'mixed', feeling: '五味杂陈', intensity: 3,
        visibility: 'private', diary: '', date: ymd(0),
        created_at: at(0, 9), updated_at: at(0, 9),
      },
      {
        uid: shiguang._id, emotion: 'happy', feeling: '被爱', intensity: 4, visibility: 'public',
        diary: '收到了归零的回信，她真的去看了那扇爬满常春藤的窗。被一个陌生人认真对待的感觉，像冬天里递过来的一杯热茶。',
        date: ymd(1), created_at: at(1, 21), updated_at: at(1, 21),
      },
      {
        uid: shiguang._id, emotion: 'anxious', feeling: '压力', intensity: 4, visibility: 'friends',
        diary: '项目临近截止，整晚都在赶进度。深呼吸，提醒自己：尽力就好，结果交给时间，睡前泡了杯热牛奶。',
        date: ymd(2), created_at: at(2, 23), updated_at: at(2, 23),
      },
      {
        uid: shiguang._id, emotion: 'calm', feeling: '释然', intensity: 3, visibility: 'private',
        diary: '第一次一个人去看了海。没有拍照，只是在防波堤上坐了很久。原来一个人也可以不孤单，风都是温柔的。',
        date: ymd(0, 1), // 去年今日：GET /moods/memory-today 联调
        created_at: at(365, 18), updated_at: at(365, 18),
      },
      {
        uid: guiling._id, emotion: 'happy', feeling: '雀跃', intensity: 4, visibility: 'public',
        diary: '今天在旧城区拍到一扇爬满常春藤的窗，像一封没有寄出的信。把照片洗了出来，贴在了书桌前的墙上。',
        date: ymd(1), created_at: at(1, 17), updated_at: at(1, 17),
      },
      {
        uid: qingshan._id, emotion: 'calm', feeling: '从容', intensity: 3, visibility: 'public',
        diary: '薄荷又长高了一截，掐了两片叶子泡水。养植物教会我最重要的事是：等待也是一种照料，急不来的。',
        date: ymd(2), created_at: at(2, 7), updated_at: at(2, 7),
      },
    ],
    { timestamps: false }
  );

  // ---- 广场评论（两级）挂在拾光的公开心情下 ----
  const [top] = await MoodComment.create(
    [
      {
        mood_id: moodPublicShiguang._id, from_uid: guiling._id, parent_id: null,
        content: '是我要谢谢你才对，那句「记录也是承认此刻值得被留下」我抄在了相册扉页。',
        created_at: at(1, 22),
      },
      {
        mood_id: moodPublicShiguang._id, from_uid: qingshan._id, parent_id: null,
        content: '被认真对待的感觉，像植物晒到了太阳。',
        created_at: at(0, 8),
      },
    ],
    { timestamps: false }
  );
  await MoodComment.create(
    [
      {
        mood_id: moodPublicShiguang._id, from_uid: shiguang._id, parent_id: top._id,
        content: '那我们就继续写下去吧，慢慢来。',
        created_at: at(0, 10),
      },
    ],
    { timestamps: false }
  );
  await Mood.updateOne({ _id: moodPublicShiguang._id }, { $set: { comment_count: 3 } });

  // ---- 匹配：当日 pending 推荐（复用 T3.5 算法，排除已通信关系） ----
  const matches = [];
  for (const a of testUsers) {
    for (const b of testUsers) {
      if (a._id.equals(b._id)) continue;
      if (await hasCorresponded(a._id, b._id)) continue;
      const { score, tagsCommon } = computeMatchScore(a, b);
      matches.push({ uid_a: a._id, uid_b: b._id, status: 'pending', score, tags_common: tagsCommon });
    }
  }
  await Match.create(matches);

  const counts = await Promise.all(
    [User, Letter, Draft, Mood, MoodComment, Match].map((m) => m.countDocuments())
  );
  logger.info(
    `seed 完成：users=${counts[0]} letters=${counts[1]} drafts=${counts[2]} ` +
      `moods=${counts[3]} mood_comments=${counts[4]} matches=${counts[5]}`
  );
  logger.info(`测试账号：shiguang/guiling/qingshan@test.com，密码 ${TEST_PASSWORD}`);
}

try {
  await main();
} finally {
  await disconnectMongo();
}
