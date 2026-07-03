/* mock 数据（T5.2，静态还原阶段专用；M6 按 MOCK-INVENTORY 对照表逐项替换为接口）。
   业务日期一律相对「真实今天」生成 —— 原型硬编码 2026-06-04 不带入（约定 §1.4-6）。 */
import { ymd, daysAgo, yearsAgo } from '../utils/date.js';

const D = (n) => ymd(daysAgo(n));
const TODAY = D(0);
const LAST_YEAR_TODAY = ymd(yearsAgo(1));
const MD = (n) => D(n).slice(5); // MM-DD

export const ME = {
  _id: 'me',
  nickname: '拾光',
  intro: '习惯在夜里写字的人。喜欢旧书的味道、雨声，和一切慢下来的事物。愿意与你交换一些真诚的句子。',
  tags: ['文学', '摄影', '冥想', '自然', '哲学'],
  active_time: 'night',
  letter_freq: 'biweekly',
  is_member: false,
};

export const STATS = { lettersSent: 14, lettersReceived: 9, moodDays: 28 };

export const LETTERS = [
  {
    _id: 'l1',
    senderNickname: '南风', from_uid: 'u_nanfeng',
    title: '写给同样失眠的你',
    excerpt: '今晚月亮很好，我又一次没能睡着，于是想给一个陌生人写信。不知道你此刻是否也醒着……',
    content: '陌生的朋友：\n\n今晚月亮很好，我又一次没能睡着，于是想给一个陌生人写信。不知道你此刻是否也醒着。\n\n我常常觉得，深夜是属于诚实的人的。白天里我们都戴着各自的面具，说着得体的话，直到夜深，那些没说出口的句子才一点点浮上来。\n\n我想问你：最近有没有什么事，是你一直放在心里、却没对任何人讲过的？不必着急回答，我会等。书信最好的地方，就是它允许我们慢慢来。\n\n愿你今夜，能睡个好觉。',
    word_count: 198, status: 'sent', is_first: true,
    timeDisplay: '2 小时前', date: TODAY,
  },
  {
    _id: 'l2',
    senderNickname: '苔痕', from_uid: 'u_taihen',
    title: '关于你说的那本书',
    excerpt: '你上封信提到的《夜航西飞》，我去图书馆借来读了。第一章就被击中了……',
    content: '拾光：\n\n你上封信提到的《夜航西飞》，我去图书馆借来读了。第一章就被击中了——原来真的有人能把孤独写得这样辽阔而不悲伤。\n\n谢谢你的推荐。我把喜欢的句子抄在了一张卡片上，夹进了信封里（虽然在这里你看不见它，但请想象一下）。\n\n下次轮到我向你推荐了。你最近在读什么？',
    word_count: 142, status: 'read', is_first: false,
    timeDisplay: '昨天', date: D(1),
  },
  {
    _id: 'l3',
    senderNickname: '平常信使', from_uid: 'u_messenger',
    title: '欢迎来到平常',
    excerpt: '这是一封来自平常的信。在这里，我们提倡慢一点、真诚一点地表达……',
    content: '你好呀：\n\n这是一封来自平常的信。在这里，我们提倡慢一点、真诚一点地表达。没有点赞，没有已读回执的催促，只有你愿意写下的、和别人愿意读到的句子。\n\n试着给今天的自己记录一种心情，或者，给某个推荐给你的灵魂写下第一封信吧。\n\n—— 平常信使',
    word_count: 121, status: 'read', is_first: false,
    timeDisplay: '3 天前', date: D(3),
  },
];

export const SENT = [
  { _id: 's1', receiverNickname: '苔痕', to_uid: 'u_taihen', title: '回信：我在读的书', excerpt: '很高兴《夜航西飞》也击中了你。最近我在重读汪曾祺，平淡里全是热爱……', content: '苔痕：\n\n很高兴《夜航西飞》也击中了你。最近我在重读汪曾祺，平淡里全是热爱。他写咸鸭蛋、写栀子花，写得那么认真，好像世界上没有小事。\n\n我想，这大概就是我喜欢书信的原因——它让我们把日常过成值得记录的样子。\n\n等你的推荐。', word_count: 156, status: 'read', timeDisplay: '昨天', date: D(1) },
  { _id: 's2', receiverNickname: '归零', to_uid: 'u_guiling', title: '致一个爱拍照的人', excerpt: '看到你主页里写「记录是对抗遗忘的方式」，很想和你聊聊摄影这件事……', content: '归零：\n\n看到你主页里写「记录是对抗遗忘的方式」，很想和你聊聊摄影这件事。我拍照的习惯是从大学开始的，那时候用一台二手胶片机，快门声音很轻，像是怕惊动了眼前的光。\n\n期待你的回信。', word_count: 173, status: 'sent', timeDisplay: '2 天前', date: D(2) },
  { _id: 's3', receiverNickname: '南风', to_uid: 'u_nanfeng', title: '也写给失眠的你', excerpt: '你的信我读了三遍。深夜确实是属于诚实的人的，这句话我记下了……', content: '南风：\n\n你的信我读了三遍。深夜确实是属于诚实的人的，这句话我记下了。\n\n你问我有没有一直放在心里没对人讲过的事——有的。等下一封信，我讲给你听。', word_count: 211, status: 'read', timeDisplay: '5 天前', date: D(5) },
];

export const DRAFTS = [
  { _id: 'd1', receiverNickname: '青山', to_uid: 'u_qingshan', title: '关于阳台上的那些植物', excerpt: '青山：你信里提到“等待也是一种照料”，我想了好几天。我也在窗台种了一盆薄荷，可总是性急——每天都要去看它长高了没有……', word_count: 64, required: 100, timeDisplay: '刚刚', date: TODAY },
  { _id: 'd2', receiverNickname: '宇宙尘', to_uid: 'u_yuzhou', title: '那些深夜的胡思乱想', excerpt: '宇宙尘：“我们都是星尘做的”——读到这句时我正在回家的地铁上。突然觉得，那些让我焦虑的事好像也没那么重了……', word_count: 38, required: 100, timeDisplay: '昨天', date: D(1) },
  { _id: 'd3', receiverNickname: '', to_uid: '', title: '', excerpt: '今天莫名地想写点什么，可还没想好寄给谁。先把这种想表达的冲动留在这里……', word_count: 21, required: 150, timeDisplay: '3 天前', date: D(3) },
];

export const MATCHES = [
  {
    _id: 'm1', score: 86, tagsCommon: ['文学', '摄影'],
    profile: {
      _id: 'u_guiling', nickname: '归零', isActiveRecently: true,
      intro: '用相机和文字记录日常的微光。相信记录是对抗遗忘的方式。',
      tags: ['摄影', '文学', '旅行', '电影'],
      recentExcerpt: '今天在旧城区拍到一扇爬满常春藤的窗，像一封没有寄出的信。',
      active_time: 'afternoon', letter_freq: 'biweekly',
    },
  },
  {
    _id: 'm2', score: 78, tagsCommon: ['冥想', '自然'],
    profile: {
      _id: 'u_qingshan', nickname: '青山', isActiveRecently: true,
      intro: '在城市里种了一阳台的植物。喜欢清晨打坐，听得见风穿过叶子的声音。',
      tags: ['冥想', '自然', '园艺', '茶道', '哲学'],
      recentExcerpt: '薄荷又长高了。养植物教会我最重要的事是：等待也是一种照料。',
      active_time: 'morning', letter_freq: 'weekly',
    },
  },
  {
    _id: 'm3', score: 71, tagsCommon: ['哲学'],
    profile: {
      _id: 'u_yuzhou', nickname: '宇宙尘', isActiveRecently: false,
      intro: '天文爱好者，业余写点关于时间和存在的胡思乱想。',
      tags: ['天文', '哲学', '科幻', '音乐'],
      recentExcerpt: '我们都是星尘做的，这件事在难过的夜晚总能给我一点奇怪的安慰。',
      active_time: 'night', letter_freq: 'free',
    },
  },
];

export const MEMORY_TODAY = {
  type: 'mood', emotion: 'calm', emotionLabel: '平静', feeling: '释然',
  displayDate: LAST_YEAR_TODAY,
  displayText: '去年的今天，第一次一个人去看了海。没有拍照，只是坐了很久。原来一个人也可以不孤单。',
};

/* 心情记录：去年今日 + 最近几天（今天为「已记录」形态，昨天为公开带评论） */
export const MOODS = [
  { _id: 'md0', date: LAST_YEAR_TODAY, emotion: 'calm', feeling: '释然', intensity: 3, diary: MEMORY_TODAY.displayText, visibility: 'private', commentCount: 0 },
  { _id: 'md1', date: D(3), emotion: 'calm', feeling: '释然', intensity: 3, diary: '给自己泡了壶茶，把房间收拾干净，心里也跟着空了一块出来。', visibility: 'private', commentCount: 0 },
  { _id: 'md2', date: D(2), emotion: 'anxious', feeling: '压力', intensity: 4, diary: '项目临近截止，整晚都在赶。深呼吸，提醒自己：尽力就好，结果交给时间。', visibility: 'friends', commentCount: 0 },
  { _id: 'md3', date: D(1), emotion: 'happy', feeling: '被爱', intensity: 4, diary: '收到了苔痕的回信，她也读了我推荐的书。被一个陌生人理解的感觉，真好。', visibility: 'public', commentCount: 3 },
  { _id: 'md4', date: TODAY, emotion: 'mixed', feeling: '五味杂陈', emotionLabel: '五味杂陈', intensity: 3, diary: '', visibility: 'private', commentCount: 0 },
];

/* 心情广场（两级评论：parent_id 顶层为 null） */
export const FEED = [
  {
    _id: 'f1', authorNickname: '归零', date: MD(0), emotion: 'happy', feeling: '雀跃', intensity: 4,
    diary: '今天在旧城区拍到一扇爬满常春藤的窗，像一封没有寄出的信。把照片洗了出来，贴在墙上。', commentCount: 5,
    comments: [
      { _id: 'c1', fromNickname: '拾光', content: '这个比喻太美了，我也想去看看那扇窗。', created_at: '1 小时前', parent_id: null },
      { _id: 'c2', fromNickname: '归零', content: '在城南的老巷子里，改天我把具体位置写信告诉你～', created_at: '刚刚', parent_id: 'c1' },
      { _id: 'c3', fromNickname: '青山', content: '常春藤的生命力总让人安心。', created_at: '2 小时前', parent_id: null },
    ],
  },
  {
    _id: 'f2', authorNickname: '青山', date: MD(1), emotion: 'calm', feeling: '从容', intensity: 3,
    diary: '薄荷又长高了。养植物教会我最重要的事是：等待也是一种照料。', commentCount: 2,
    comments: [{ _id: 'c4', fromNickname: '拾光', content: '等待也是一种照料，记下了。', created_at: '昨天', parent_id: null }],
  },
  {
    _id: 'f3', authorNickname: '宇宙尘', date: MD(2), emotion: 'sad', feeling: '孤独', intensity: 2,
    diary: '我们都是星尘做的，这件事在难过的夜晚总能给我一点奇怪的安慰。', commentCount: 0, comments: [],
  },
];

/* 写信静态灵感组（AI 灵感为 M6 接通 POST /ai/*，此处仅面板占位数据） */
export const INSPIRATION = [
  { label: '破冰 · 开头', lines: [
    '陌生的朋友，见信好。提笔时我正……',
    '不知道该怎么称呼你，但有些话，想说给一个素未谋面的人听。',
    '今天发生了一件很小的事，却让我很想写信给你。',
  ] },
  { label: '分享 · 此刻', lines: [
    '最近我常常想起一句话——',
    '想和你聊聊最近让我心动的一件小事：',
    '窗外的天气是……，而我此刻的心情是……',
  ] },
  { label: '提问 · 给对方', lines: [
    '你最近，有没有什么一直放不下的事？',
    '如果能问你一个问题，我想问的是……',
    '你也会在深夜里失眠、胡思乱想吗？',
  ] },
  { label: '收尾 · 落款', lines: [
    '写到这里，天色已经晚了。愿你一切都好。',
    '不必急着回信，慢慢来就好。',
    '期待你的回音，像期待一场不期而遇的雨。',
  ] },
];

export const AI_MOCK_SUGGESTIONS = [
  '夜又深了一层。我总是在这样的时刻想起没说完的话，就像想起抽屉里没寄出的信。',
  '你上次说的那句话，我这几天反复想了很多遍——原来被认真回应，是这样安静的欢喜。',
  '窗台的薄荷终于活过来了。我想，有些事急不得，比如植物，比如我们慢慢变熟这件事。',
];

/* 桌面写信收件人 chips（区分「首封」；M6 换为通信关系接口派生） */
export const RECIPIENTS = [
  { name: '苔痕', first: false }, { name: '南风', first: false }, { name: '青山', first: false },
  { name: '归零', first: true }, { name: '宇宙尘', first: true },
];
