import mongoose from 'mongoose';

/**
 * refresh token 黑名单（T2.3）：logout 时把 refresh 的 jti 写入，
 * TTL 索引到期自动清理（expires_at = 该 token 自身的过期时间），不引入 Redis。
 */
const tokenBlacklistSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true },
    uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expires_at: { type: Date, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false }
);

tokenBlacklistSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL 自动清理

export const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema, 'token_blacklist');
