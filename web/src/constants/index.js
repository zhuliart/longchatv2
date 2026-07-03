/* 词表常量 —— 照抄原型 data.jsx 第一节（T5.2）。
   语义与 server/src/models/constants.js 同源，以服务端为准。 */

export const EMOTIONS = [
  { key: 'happy', label: '开心', color: 'var(--m-happy)' },
  { key: 'calm', label: '平静', color: 'var(--m-calm)' },
  { key: 'sad', label: '难过', color: 'var(--m-sad)' },
  { key: 'anxious', label: '焦虑', color: 'var(--m-anxious)' },
  { key: 'mixed', label: '复杂', color: 'var(--m-mixed)' },
];

export const EMOTION_LABEL = { happy: '开心', calm: '平静', sad: '难过', anxious: '焦虑', mixed: '复杂' };

/* 每情绪 8 个二级细分感受（选填，细化记录但不改主情绪配色） */
export const EMOTION_FEELINGS = {
  happy: ['雀跃', '欣喜', '感激', '满足', '被爱', '自豪', '踏实', '期待'],
  calm: ['放松', '安定', '自在', '专注', '释然', '安心', '温柔', '从容'],
  sad: ['失落', '孤独', '想念', '委屈', '低落', '疲惫', '空落', '怀念'],
  anxious: ['紧张', '不安', '担忧', '烦躁', '压力', '害怕', '慌乱', '犹豫'],
  mixed: ['矛盾', '怅然', '五味杂陈', '起伏', '说不清', '百感交集', '欲言又止', '似喜似忧'],
};

export const VISIBILITY_OPTIONS = [
  { key: 'private', icon: '🔒', label: '仅自己' },
  { key: 'friends', icon: '✉', label: '笔友' },
  { key: 'public', icon: '🌍', label: '公开' },
];
export const VISIBILITY_LABEL = { private: '仅自己', friends: '笔友可见', public: '公开' };

export const ACTIVE_TIME_LABEL = { morning: '清晨', afternoon: '午后', night: '夜深', free: '随缘' };
export const LETTER_FREQ_LABEL = { weekly: '每周一封', biweekly: '每两周一封', free: '随缘' };

/* 注册引导第 2 步的 30 个预置标签 */
export const PRESET_TAGS = [
  '文学', '诗歌', '哲学', '历史', '音乐', '电影', '摄影', '绘画', '旅行', '美食',
  '自然', '心理', '科幻', '悬疑', '动漫', '游戏', '运动', '瑜伽', '冥想', '园艺',
  '手工', '烹饪', '茶道', '书法', '天文', '生物', '经济', '社会学', '建筑', '时尚',
];

/* 字数门槛（契约 §1：服务端复校，前端仅做即时反馈） */
export const FIRST_MIN = 150;
export const REPLY_MIN = 100;
export const DIARY_MIN = 30;
