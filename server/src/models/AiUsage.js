import mongoose from 'mongoose';

/**
 * AI 灵感每日用量计数（T4.2 限频依据）：同人同日一条，$inc 累加；
 * TTL 两天自动清理（限频只看「今天」，历史无保留价值）。
 */
const aiUsageSchema = new mongoose.Schema(
  {
    uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date 须为 YYYY-MM-DD'],
    },
    count: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false }
);

aiUsageSchema.index({ uid: 1, date: 1 }, { unique: true }); // 限频查询 + upsert 依据
aiUsageSchema.index({ created_at: 1 }, { expireAfterSeconds: 2 * 24 * 60 * 60 }); // TTL 清理

export const AiUsage = mongoose.model('AiUsage', aiUsageSchema, 'ai_usage');
