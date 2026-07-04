/* 心情广场接口（契约 §6 / server routes/plaza.js） */
import { client } from './client.js';

/** 广场列表（仅公开，默认过滤本人，分页） */
export const getPublicMoods = (page = 0) => client.get(`/plaza/moods?page=${page}`);

/** 某条心情的评论列表（每页 20） */
export const getMoodComments = (moodId, page = 0) =>
  client.get(`/plaza/moods/${moodId}/comments?page=${page}`);

/** 评论/回复：{ content, parentId? }，成功后返回 { _id, commentCount } */
export const commentOnMood = (moodId, payload) =>
  client.post(`/plaza/moods/${moodId}/comments`, payload);
