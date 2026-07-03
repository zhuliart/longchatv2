/* data.jsx — PingChang mock data + constants (exported to window) */

const EMOTIONS = [
  { key: "happy", label: "开心", color: "var(--m-happy)" },
  { key: "calm", label: "平静", color: "var(--m-calm)" },
  { key: "sad", label: "难过", color: "var(--m-sad)" },
  { key: "anxious", label: "焦虑", color: "var(--m-anxious)" },
  { key: "mixed", label: "复杂", color: "var(--m-mixed)" },
];
const EMOTION_LABEL = { happy: "开心", calm: "平静", sad: "难过", anxious: "焦虑", mixed: "复杂" };

// nuanced sub-feelings under each primary emotion (feelings-wheel style).
// Picking one is optional; it refines the record but keeps the primary's color.
const EMOTION_FEELINGS = {
  happy: ["雀跃", "欣喜", "感激", "满足", "被爱", "自豪", "踏实", "期待"],
  calm:  ["放松", "安定", "自在", "专注", "释然", "安心", "温柔", "从容"],
  sad:   ["失落", "孤独", "想念", "委屈", "低落", "疲惫", "空落", "怀念"],
  anxious: ["紧张", "不安", "担忧", "烦躁", "压力", "害怕", "慌乱", "犹豫"],
  mixed: ["矛盾", "怅然", "五味杂陈", "起伏", "说不清", "百感交集", "欲言又止", "似喜似忧"],
};

const VISIBILITY_OPTIONS = [
  { key: "private", icon: "🔒", label: "仅自己" },
  { key: "friends", icon: "✉", label: "笔友" },
  { key: "public", icon: "🌍", label: "公开" },
];
const VISIBILITY_LABEL = { private: "仅自己", friends: "笔友可见", public: "公开" };

const ACTIVE_TIME_LABEL = { morning: "清晨", afternoon: "午后", night: "夜深", free: "随缘" };
const LETTER_FREQ_LABEL = { weekly: "每周一封", biweekly: "每两周一封", free: "随缘" };

const PRESET_TAGS = ["文学","诗歌","哲学","历史","音乐","电影","摄影","绘画","旅行","美食","自然","心理","科幻","悬疑","动漫","游戏","运动","瑜伽","冥想","园艺","手工","烹饪","茶道","书法","天文","生物","经济","社会学","建筑","时尚"];

const ME = {
  _id: "me",
  nickname: "拾光",
  intro: "习惯在夜里写字的人。喜欢旧书的味道、雨声，和一切慢下来的事物。愿意与你交换一些真诚的句子。",
  tags: ["文学", "摄影", "冥想", "自然", "哲学"],
  active_time: "night",
  letter_freq: "biweekly",
  is_member: false,
};

const STATS = { lettersSent: 14, lettersReceived: 9, moodDays: 28 };

const LETTERS = [
  {
    _id: "l1",
    senderNickname: "南风", from_uid: "u_nanfeng",
    title: "写给同样失眠的你",
    excerpt: "今晚月亮很好，我又一次没能睡着，于是想给一个陌生人写信。不知道你此刻是否也醒着……",
    content: "陌生的朋友：\n\n今晚月亮很好，我又一次没能睡着，于是想给一个陌生人写信。不知道你此刻是否也醒着。\n\n我常常觉得，深夜是属于诚实的人的。白天里我们都戴着各自的面具，说着得体的话，直到夜深，那些没说出口的句子才一点点浮上来。\n\n我想问你：最近有没有什么事，是你一直放在心里、却没对任何人讲过的？不必着急回答，我会等。书信最好的地方，就是它允许我们慢慢来。\n\n愿你今夜，能睡个好觉。",
    word_count: 198, status: "sent", is_first: true,
    timeDisplay: "2 小时前", date: "2026-06-04",
  },
  {
    _id: "l2",
    senderNickname: "苔痕", from_uid: "u_taihen",
    title: "关于你说的那本书",
    excerpt: "你上封信提到的《夜航西飞》，我去图书馆借来读了。第一章就被击中了……",
    content: "拾光：\n\n你上封信提到的《夜航西飞》，我去图书馆借来读了。第一章就被击中了——原来真的有人能把孤独写得这样辽阔而不悲伤。\n\n谢谢你的推荐。我把喜欢的句子抄在了一张卡片上，夹进了信封里（虽然在这里你看不见它，但请想象一下）。\n\n下次轮到我向你推荐了。你最近在读什么？",
    word_count: 142, status: "read", is_first: false,
    timeDisplay: "昨天", date: "2026-06-03",
  },
  {
    _id: "l3",
    senderNickname: "平常信使", from_uid: "u_messenger",
    title: "欢迎来到平常",
    excerpt: "这是一封来自平常的信。在这里，我们提倡慢一点、真诚一点地表达……",
    content: "你好呀：\n\n这是一封来自平常的信。在这里，我们提倡慢一点、真诚一点地表达。没有点赞，没有已读回执的催促，只有你愿意写下的、和别人愿意读到的句子。\n\n试着给今天的自己记录一种心情，或者，给某个推荐给你的灵魂写下第一封信吧。\n\n—— 平常信使",
    word_count: 121, status: "read", is_first: false,
    timeDisplay: "3 天前", date: "2026-06-01",
  },
];

const SENT = [
  { _id: "s1", receiverNickname: "苔痕", to_uid: "u_taihen", title: "回信：我在读的书", excerpt: "很高兴《夜航西飞》也击中了你。最近我在重读汪曾祺，平淡里全是热爱……", word_count: 156, status: "read", timeDisplay: "昨天", date: "2026-06-03" },
  { _id: "s2", receiverNickname: "归零", to_uid: "u_guiling", title: "致一个爱拍照的人", excerpt: "看到你主页里写'记录是对抗遗忘的方式'，很想和你聊聊摄影这件事……", word_count: 173, status: "sent", timeDisplay: "2 天前", date: "2026-06-02" },
  { _id: "s3", receiverNickname: "南风", to_uid: "u_nanfeng", title: "也写给失眠的你", excerpt: "你的信我读了三遍。深夜确实是属于诚实的人的，这句话我记下了……", word_count: 211, status: "read", timeDisplay: "5 天前", date: "2026-05-30" },
];

const DRAFTS = [
  { _id: "d1", receiverNickname: "青山", to_uid: "u_qingshan", title: "关于阳台上的那些植物", excerpt: "青山：你信里提到“等待也是一种照料”，我想了好几天。我也在窗台种了一盆薄荷，可总是性急——每天都要去看它长高了没有……", word_count: 64, required: 100, timeDisplay: "刚刚", date: "2026-06-04" },
  { _id: "d2", receiverNickname: "宇宙尘", to_uid: "u_yuzhou", title: "那些深夜的胡思乱想", excerpt: "宇宙尘：“我们都是星尘做的”——读到这句时我正在回家的地铁上。突然觉得，那些让我焦虑的事好像也没那么重了……", word_count: 38, required: 100, timeDisplay: "昨天", date: "2026-06-03" },
  { _id: "d3", receiverNickname: "", to_uid: "", title: "", excerpt: "今天莫名地想写点什么，可还没想好寄给谁。先把这种想表达的冲动留在这里……", word_count: 21, required: 150, timeDisplay: "3 天前", date: "2026-06-01" },
];

const MATCHES = [
  {
    _id: "m1", score: 86, tagsCommon: ["文学", "摄影"],
    profile: {
      _id: "u_guiling", nickname: "归零", isActiveRecently: true,
      intro: "用相机和文字记录日常的微光。相信记录是对抗遗忘的方式。",
      tags: ["摄影", "文学", "旅行", "电影"],
      recentExcerpt: "今天在旧城区拍到一扇爬满常春藤的窗，像一封没有寄出的信。",
      active_time: "afternoon", letter_freq: "biweekly",
    },
  },
  {
    _id: "m2", score: 78, tagsCommon: ["冥想", "自然"],
    profile: {
      _id: "u_qingshan", nickname: "青山", isActiveRecently: true,
      intro: "在城市里种了一阳台的植物。喜欢清晨打坐，听得见风穿过叶子的声音。",
      tags: ["冥想", "自然", "园艺", "茶道", "哲学"],
      recentExcerpt: "薄荷又长高了。养植物教会我最重要的事是：等待也是一种照料。",
      active_time: "morning", letter_freq: "weekly",
    },
  },
  {
    _id: "m3", score: 71, tagsCommon: ["哲学"],
    profile: {
      _id: "u_yuzhou", nickname: "宇宙尘", isActiveRecently: false,
      intro: "天文爱好者，业余写点关于时间和存在的胡思乱想。",
      tags: ["天文", "哲学", "科幻", "音乐"],
      recentExcerpt: "我们都是星尘做的，这件事在难过的夜晚总能给我一点奇怪的安慰。",
      active_time: "night", letter_freq: "free",
    },
  },
];

const MEMORY_TODAY = {
  type: "mood", emotion: "calm", emotionLabel: "平静",
  displayDate: "2025-06-04",
  displayText: "去年的今天，第一次一个人去看了海。没有拍照，只是坐了很久。原来一个人也可以不孤单。",
};

// moods for current month (June 2026) — keyed by day-of-month
const MOODS = [
  { _id: "md0", date: "2025-06-04", emotion: "calm", feeling: "释然", intensity: 3, diary: "去年的今天，第一次一个人去看了海。没有拍照，只是坐了很久。原来一个人也可以不孤单。", visibility: "private", commentCount: 0 },
  { _id: "md1", date: "2026-06-01", emotion: "calm", feeling: "释然", intensity: 3, diary: "新的一个月。给自己泡了壶茶，把房间收拾干净，心里也跟着空了一块出来。", visibility: "private", commentCount: 0 },
  { _id: "md2", date: "2026-06-02", emotion: "anxious", feeling: "压力", intensity: 4, diary: "项目临近截止，整晚都在赶。深呼吸，提醒自己：尽力就好，结果交给时间。", visibility: "friends", commentCount: 0 },
  { _id: "md3", date: "2026-06-03", emotion: "happy", feeling: "被爱", intensity: 4, diary: "收到了苔痕的回信，她也读了我推荐的书。被一个陌生人理解的感觉，真好。", visibility: "public", commentCount: 3 },
  { _id: "md4", date: "2026-06-04", emotion: "mixed", feeling: "五味杂陈", emotionLabel: "五味杂陈", intensity: 3, diary: "", visibility: "private", commentCount: 0 },
];

// 30-day trend (intensity, 0 = no record / break)
const TREND = [
  {d:"5-06",v:3,e:"calm",note:"周末睡到自然醒，阳台上的薄荷又抽了新芽。"},{d:"5-07",v:0,e:null},{d:"5-08",v:4,e:"happy",note:"和老友冰释前嫌，一顿饭的功夫，心里的结就解开了。"},{d:"5-09",v:2,e:"sad",note:"下雨的黄昏，突然很想家。"},{d:"5-10",v:3,e:"calm"},
  {d:"5-11",v:0,e:null},{d:"5-12",v:4,e:"anxious",note:"明天要汇报，脚本改了五遍还是不满意。"},{d:"5-13",v:3,e:"mixed"},{d:"5-14",v:5,e:"happy",note:"汇报顺利通过，走出会议室那一刻阳光正好。"},{d:"5-15",v:0,e:null},
  {d:"5-16",v:2,e:"sad"},{d:"5-17",v:3,e:"calm"},{d:"5-18",v:3,e:"calm"},{d:"5-19",v:0,e:null},{d:"5-20",v:4,e:"happy",note:"路边摆摊买了一束满天星，插进玻璃瓶里。"},
  {d:"5-21",v:3,e:"mixed"},{d:"5-22",v:2,e:"anxious"},{d:"5-23",v:0,e:null},{d:"5-24",v:3,e:"calm"},{d:"5-25",v:4,e:"happy",note:"读完一本拖了很久的书，合上那刻意犹未尽。"},
  {d:"5-26",v:3,e:"calm"},{d:"5-27",v:0,e:null},{d:"5-28",v:2,e:"sad",note:"和人起了点小争执，一整天都提不起劲。"},{d:"5-29",v:3,e:"calm"},{d:"5-30",v:4,e:"happy"},
  {d:"5-31",v:3,e:"mixed"},{d:"6-01",v:3,e:"calm"},{d:"6-02",v:4,e:"anxious"},{d:"6-03",v:4,e:"happy"},{d:"6-04",v:3,e:"mixed"},
];

const FEED = [
  { _id: "f1", authorNickname: "归零", date: "06-04", emotion: "happy", feeling: "雀跃", intensity: 4, diary: "今天在旧城区拍到一扇爬满常春藤的窗，像一封没有寄出的信。把照片洗了出来，贴在墙上。", commentCount: 5,
    comments: [
      { _id: "c1", fromNickname: "拾光", content: "这个比喻太美了，我也想去看看那扇窗。", created_at: "1 小时前", parent_id: null },
      { _id: "c2", fromNickname: "归零", content: "在城南的老巷子里，改天我把具体位置写信告诉你～", created_at: "刚刚", parent_id: "c1" },
      { _id: "c3", fromNickname: "青山", content: "常春藤的生命力总让人安心。", created_at: "2 小时前", parent_id: null },
    ] },
  { _id: "f2", authorNickname: "青山", date: "06-03", emotion: "calm", feeling: "从容", intensity: 3, diary: "薄荷又长高了。养植物教会我最重要的事是：等待也是一种照料。", commentCount: 2,
    comments: [ { _id: "c4", fromNickname: "拾光", content: "等待也是一种照料，记下了。", created_at: "昨天", parent_id: null } ] },
  { _id: "f3", authorNickname: "宇宙尘", date: "06-02", emotion: "sad", feeling: "孤独", intensity: 2, diary: "我们都是星尘做的，这件事在难过的夜晚总能给我一点奇怪的安慰。", commentCount: 0, comments: [] },
];

Object.assign(window, {
  EMOTIONS, EMOTION_LABEL, EMOTION_FEELINGS, VISIBILITY_OPTIONS, VISIBILITY_LABEL,
  ACTIVE_TIME_LABEL, LETTER_FREQ_LABEL, PRESET_TAGS,
  ME, STATS, LETTERS, SENT, DRAFTS, MATCHES, MEMORY_TODAY, MOODS, TREND, FEED,
});
