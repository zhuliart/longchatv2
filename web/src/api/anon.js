/* 匿名信区接口（server routes/anon.js）：发信匿名；回应=私信回信落作者收件箱，
   信区只公开回信人数。 */
import { client } from './client.js';

/** 匿名信 ≥30 字（树洞轻量门槛）；树洞回信按普通回信 ≥100 字 */
export const BOARD_MIN = 30;

/** 匿名信区列表（分页）：{ _id,title,content,replyCount,created_at,isMine } */
export const getAnonLetters = (page = 0) => client.get(`/anon/letters?page=${page}`);

/** 寄往匿名信区：{ title?, content } */
export const sendAnonLetter = (payload) => client.post('/anon/letters', payload);

/** 回一封匿名信（≥100 字）：以普通回信落进作者收件箱；作者对你保持匿名 */
export const replyAnonLetter = (id, payload) => client.post(`/anon/letters/${id}/reply`, payload);
