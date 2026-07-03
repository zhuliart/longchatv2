import mongoose from 'mongoose';
import { LETTER_STATUSES, MODERATION_STATES } from './constants.js';

/**
 * letters（契约 §10）。字数门槛（首封 ≥150 / 回信 ≥100）是「寄出」这个动作的规则，
 * 由 M3 路由层用 countWords 重算并校验后写入 word_count，Schema 只保证字段形态。
 */
const letterSchema = new mongoose.Schema(
  {
    from_uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to_uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Letter', default: null }, // 回信指向原信
    title: { type: String, default: '', trim: true, maxlength: [30, '标题最多 30 字'] },
    content: { type: String, required: [true, '正文必填'], minlength: 1 },
    word_count: { type: Number, required: true, min: 0 }, // 服务端 countWords 重算
    status: { type: String, enum: LETTER_STATUSES, default: 'sent' },
    is_first: { type: Boolean, default: false },
    read_at: { type: Date, default: null },
    moderation: { type: String, enum: MODERATION_STATES, default: undefined },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false }
);

letterSchema.index({ to_uid: 1, status: 1 }); // 收件箱 < 300ms
letterSchema.index({ from_uid: 1, created_at: -1 }); // 已发出列表

export const Letter = mongoose.model('Letter', letterSchema, 'letters');
