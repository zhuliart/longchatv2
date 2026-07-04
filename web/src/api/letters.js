/* 信件接口（契约 §4 / server routes/letters.js） */
import { client } from './client.js';

/** 收件箱（分页，page 从 0 起） */
export const getInbox = (page = 0) => client.get(`/letters/inbox?page=${page}`);

/** 已发出 */
export const getSent = (page = 0) => client.get(`/letters/sent?page=${page}`);

/** 信件详情（收件人首读服务端自动置 read） */
export const getLetter = (id) => client.get(`/letters/${id}`);

/** 寄首/普通信：{ targetUid, title, content } */
export const sendLetter = (payload) => client.post('/letters', payload);

/** 回信：{ title, content } */
export const replyLetter = (id, payload) => client.post(`/letters/${id}/reply`, payload);

/** 归档 */
export const archiveLetter = (id) => client.post(`/letters/${id}/archive`);
