import { User, OFFICIAL_ACCOUNT } from '../models/index.js';
import { generateMatchesFor } from '../services/match.js';

/**
 * 每日匹配计算（T4.3，契约 §9，每日 00:00）：全量用户两两 Jaccard 写 matches，
 * status:'pending'；排除已通信/官方号（复用 T3.5 services/match 算法，
 * 当日已 skipped/active 的记录不回退）。GET /matches/daily 的冷启动现场生成为兜底。
 */
export async function dailyMatch() {
  const users = await User.find({ has_profile: true, account: { $ne: OFFICIAL_ACCOUNT } });
  let written = 0;
  for (const user of users) {
    written += await generateMatchesFor(user);
  }
  return { users: users.length, matched: written };
}
