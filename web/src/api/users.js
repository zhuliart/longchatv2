/* 用户接口（契约 §7 / server routes/users.js） */
import { client } from './client.js';

/** 当前用户资料 + 服务端聚合统计（lettersSent/lettersReceived/moodDays/hasProfile） */
export const getMe = () => client.get('/users/me');

/** 注册引导提交（createUser）：{ nickname, intro, tags, activeTime, letterFreq } */
export const submitProfile = (payload) => client.post('/users/profile', payload);

/** 局部更新资料（传啥改啥） */
export const updateMe = (payload) => client.patch('/users/me', payload);

/** 他人公开主页 */
export const getProfile = (uid) => client.get(`/users/${uid}/profile`);
