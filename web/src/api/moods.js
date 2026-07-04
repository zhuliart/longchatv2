/* 心情接口（契约 §6 / server routes/moods.js） */
import { client } from './client.js';

/** 某月记录（月历/走势/详情共用）：data 为数组 */
export const getMoods = (year, month) => client.get(`/moods?year=${year}&month=${month}`);

/** 去年今日（返回 mood / letter / null） */
export const getMemoryToday = () => client.get('/moods/memory-today');

/** 记录/更新今日心情（服务端今天）：{ emotion, feeling, intensity, diary, visibility } */
export const saveMood = (date, payload) => client.put(`/moods/${date}`, payload);

/** 往日仅改可见性：{ visibility } */
export const updateMoodVisibility = (id, visibility) =>
  client.patch(`/moods/${id}/visibility`, { visibility });
