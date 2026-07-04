/* 灵魂匹配接口（契约 §7 / server routes/matches.js） */
import { client } from './client.js';
import { ApiError } from './client.js';

/** 每日推荐：额度用完时服务端返回 code 1004 + data:[]，此处归一为空数组（不算错误） */
export async function getDailyRecommend() {
  try {
    return await client.get('/matches/daily');
  } catch (err) {
    if (err instanceof ApiError && err.code === 1004) return [];
    throw err;
  }
}

/** 跳过推荐用户（当日不再出现，幂等） */
export const skipUser = (targetUid) => client.post(`/matches/${targetUid}/skip`);
