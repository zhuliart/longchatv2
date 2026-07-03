/**
 * 数据模型词表（契约 §10 / v0.2 数据模型；细分情绪与预置标签照抄原型 data.jsx 第一节）。
 * 前端 web/src/constants/ 在 M5 迁移同一份词表，语义以本文件（服务端）为准。
 */

export const EMOTIONS = ['happy', 'calm', 'sad', 'anxious', 'mixed'];

export const EMOTION_LABEL = {
  happy: '开心',
  calm: '平静',
  sad: '难过',
  anxious: '焦虑',
  mixed: '复杂',
};

/** 每情绪 8 个细分词（feeling 软校验词表：不属词表仅记日志，不拒绝） */
export const EMOTION_FEELINGS = {
  happy: ['雀跃', '欣喜', '感激', '满足', '被爱', '自豪', '踏实', '期待'],
  calm: ['放松', '安定', '自在', '专注', '释然', '安心', '温柔', '从容'],
  sad: ['失落', '孤独', '想念', '委屈', '低落', '疲惫', '空落', '怀念'],
  anxious: ['紧张', '不安', '担忧', '烦躁', '压力', '害怕', '慌乱', '犹豫'],
  mixed: ['矛盾', '怅然', '五味杂陈', '起伏', '说不清', '百感交集', '欲言又止', '似喜似忧'],
};

export const VISIBILITIES = ['private', 'friends', 'public'];

export const ACTIVE_TIMES = ['morning', 'afternoon', 'night'];
export const ACTIVE_TIME_LABEL = { morning: '清晨', afternoon: '午后', night: '夜深' };

export const LETTER_FREQS = ['weekly', 'biweekly', 'free'];
export const LETTER_FREQ_LABEL = { weekly: '每周一封', biweekly: '每两周一封', free: '随缘' };

export const LETTER_STATUSES = ['sent', 'read', 'archived', 'rejected'];

export const MATCH_STATUSES = ['pending', 'active', 'skipped'];

/** UGC 审核标记（T4.1 写入）：pass 通过；review 放行但待人工复核 */
export const MODERATION_STATES = ['pass', 'review'];

/** 注册引导第 2 步的 30 个预置标签（匹配 Jaccard 的取值域，非硬校验） */
export const PRESET_TAGS = [
  '文学', '诗歌', '哲学', '历史', '音乐', '电影', '摄影', '绘画', '旅行', '美食',
  '自然', '心理', '科幻', '悬疑', '动漫', '游戏', '运动', '瑜伽', '冥想', '园艺',
  '手工', '烹饪', '茶道', '书法', '天文', '生物', '经济', '社会学', '建筑', '时尚',
];

/** 官方账号「平常信使」：匹配冷启动兜底 + 欢迎信发送方（seed 建号，代码按 account 查找） */
export const OFFICIAL_ACCOUNT = 'messenger@pingchang.app';

/** account 合法性：邮箱 或 11 位手机号（M2 注册接口复用同一判断） */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^1[3-9]\d{9}$/;
export function isValidAccount(account) {
  const v = String(account || '').trim();
  return EMAIL_RE.test(v) || PHONE_RE.test(v);
}
