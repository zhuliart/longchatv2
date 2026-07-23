/* 匿名信区接口（server routes/anon.js）：发信匿名、回应实名、全员可看 */
import { client } from './client.js';

/** 匿名信 ≥30 字（树洞轻量门槛） */
export const BOARD_MIN = 30;

/** 匿名信区列表（分页） */
export const getAnonLetters = (page = 0) => client.get(`/anon/letters?page=${page}`);

/** 寄往匿名信区：{ title?, content } */
export const sendAnonLetter = (payload) => client.post('/anon/letters', payload);

/** 某封匿名信的回应列表（每页 20） */
export const getAnonComments = (id, page = 0) => client.get(`/anon/letters/${id}/comments?page=${page}`);

/** 回应匿名信：{ content, parentId? } → { _id, commentCount } */
export const commentOnAnon = (id, payload) => client.post(`/anon/letters/${id}/comments`, payload);
