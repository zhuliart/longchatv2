import { Letter } from '../models/index.js';

/**
 * 不活跃检查（T4.3，契约 §9 / v0.2 №28，每日 09:00）：
 * 识别寄出后 7/14/30 天仍未获回信的信件（无 parent_id 指向它的信），
 * 按最大满足档位标记 letter.inactive_days；收到回信后标记清除。
 * archived/rejected 不参与（对话已明确终止）。
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const THRESHOLDS = [30, 14, 7]; // 降序：取满足的最大档

export async function inactivityCheck() {
  const now = Date.now();
  const candidates = await Letter.find({
    status: { $in: ['sent', 'read'] },
    created_at: { $lt: new Date(now - 7 * DAY_MS) },
  });

  const buckets = { 7: 0, 14: 0, 30: 0 };
  let checked = 0;
  let cleared = 0;
  for (const letter of candidates) {
    checked += 1;
    const replied = await Letter.exists({ parent_id: letter._id });
    if (replied) {
      if (letter.inactive_days) {
        letter.inactive_days = undefined;
        await letter.save();
        cleared += 1;
      }
      continue;
    }
    const days = Math.floor((now - letter.created_at.getTime()) / DAY_MS);
    const threshold = THRESHOLDS.find((t) => days >= t);
    if (!threshold) continue;
    buckets[threshold] += 1;
    if (letter.inactive_days !== threshold) {
      letter.inactive_days = threshold;
      await letter.save();
    }
  }
  // 返回形态对齐 v0.2 №28：checked + 各档命中数
  return {
    checked,
    cleared,
    inactiveLetters: THRESHOLDS.map((t) => ({ threshold: `${t}天未回应`, count: buckets[t] })),
  };
}
