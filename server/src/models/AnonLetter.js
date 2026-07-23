import mongoose from 'mongoose';
import { MODERATION_STATES } from './constants.js';

/**
 * anon_letters（匿名信区）：所有人可见的匿名信。uid 仅服务端留存
 * （治理/防滥用依据），任何接口响应都不返回作者身份。
 * 门槛 ≥30 字（轻量树洞，低于书信 150/100），路由层 countWords 复算。
 */
const anonLetterSchema = new mongoose.Schema(
  {
    uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: '', trim: true, maxlength: [30, '标题最多 30 字'] },
    content: { type: String, required: [true, '正文必填'], minlength: 1 },
    word_count: { type: Number, required: true, min: 0 },
    comment_count: { type: Number, default: 0, min: 0 },
    moderation: { type: String, enum: MODERATION_STATES, default: undefined },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false }
);

anonLetterSchema.index({ created_at: -1 }); // 匿名信区列表

export const AnonLetter = mongoose.model('AnonLetter', anonLetterSchema, 'anon_letters');
