import mongoose from 'mongoose';
import { MATCH_STATUSES } from './constants.js';

/**
 * matches（契约 §10）：每日 00:00 定时任务全量重算写入（uid_a 视角的推荐记录）；
 * 「当日」以 updated_at 判定。契约模型只有 updated_at，无 created_at。
 */
const matchSchema = new mongoose.Schema(
  {
    uid_a: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uid_b: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true, min: [0, '契合分为 0-100'], max: [100, '契合分为 0-100'] },
    tags_common: { type: [String], default: [] },
    status: { type: String, enum: MATCH_STATUSES, default: 'pending' },
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' }, versionKey: false }
);

matchSchema.index({ uid_a: 1, updated_at: -1 }); // 每日推荐列表

export const Match = mongoose.model('Match', matchSchema, 'matches');
