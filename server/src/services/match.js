import { User, Letter, Match, OFFICIAL_ACCOUNT } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { startOfToday } from '../utils/listing.js';

/**
 * 匹配算法（T3.5，供 GET /matches/daily 冷启动与 M4 dailyMatch 定时任务复用）：
 *   基础分 = |A∩B| / |A∪B| × 100（Jaccard，按 tags）
 *   +10 活跃时段相同  +5 书信频率相同  +8 对方 7 天内活跃；上限 100
 *   排除：已有通信关系 / 今日已跳过（读库侧过滤）；不足 3 人补「平常信使」
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const isActiveRecently = (user) =>
  !!user.last_active && Date.now() - user.last_active.getTime() < SEVEN_DAYS_MS;

/** 双方是否已有通信（任一方向有信即算） */
export const hasCorresponded = (a, b) =>
  Letter.exists({
    $or: [
      { from_uid: a, to_uid: b },
      { from_uid: b, to_uid: a },
    ],
  });

export function computeMatchScore(userA, userB) {
  const setB = new Set(userB.tags || []);
  const common = (userA.tags || []).filter((t) => setB.has(t));
  const union = new Set([...(userA.tags || []), ...(userB.tags || [])]).size;
  let score = union ? Math.round((common.length / union) * 100) : 0;
  if (userA.active_time === userB.active_time) score += 10;
  if (userA.letter_freq === userB.letter_freq) score += 5;
  if (isActiveRecently(userB)) score += 8;
  return { score: Math.min(score, 100), tagsCommon: common };
}

/**
 * 为单个用户生成当日 pending 匹配（幂等 upsert）。
 * 排除：自己 / 未完成引导 / 已有通信关系；不足 minFill 人时补官方号「平常信使」。
 * 返回写入（含更新）的条数。
 */
export async function generateMatchesFor(user, { minFill = 3 } = {}) {
  // 「跳过」只影响当日：往日 skipped 在重算时恢复 pending（当日已跳过的不动）
  await Match.updateMany(
    { uid_a: user._id, status: 'skipped', updated_at: { $lt: startOfToday() } },
    { $set: { status: 'pending' } }
  );

  const candidates = await User.find({
    _id: { $ne: user._id },
    has_profile: true,
    account: { $ne: OFFICIAL_ACCOUNT },
  });

  const scored = [];
  for (const cand of candidates) {
    if (await hasCorresponded(user._id, cand._id)) continue;
    scored.push({ cand, ...computeMatchScore(user, cand) });
  }
  scored.sort((a, b) => b.score - a.score);

  // 冷启动兜底：可推荐不足 minFill 人时，插入「平常信使」补足
  if (scored.length < minFill) {
    const messenger = await User.findOne({ account: OFFICIAL_ACCOUNT });
    if (messenger && !messenger._id.equals(user._id) && !(await hasCorresponded(user._id, messenger._id))) {
      scored.push({ cand: messenger, ...computeMatchScore(user, messenger) });
    }
  }

  let written = 0;
  for (const { cand, score, tagsCommon } of scored) {
    // 已 skipped/active 的当日记录不回退成 pending（用 setOnInsert 保住状态）
    await Match.updateOne(
      { uid_a: user._id, uid_b: cand._id },
      { $set: { score, tags_common: tagsCommon }, $setOnInsert: { status: 'pending' } },
      { upsert: true, timestamps: true }
    );
    written += 1;
  }
  logger.debug(`matches: 为 ${user.nickname || user._id} 生成 ${written} 条`);
  return written;
}
