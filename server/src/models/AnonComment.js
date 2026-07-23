import mongoose from 'mongoose';
import { MODERATION_STATES } from './constants.js';

/**
 * anon_comments（匿名信区回应）：两级（parent_id 顶层为 null，回复「回复」压平）。
 * 回应者以昵称示人（发信匿名、回应实名 —— 树洞式约定）。
 */
const anonCommentSchema = new mongoose.Schema(
  {
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AnonLetter', required: true },
    from_uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: [true, '内容必填'], minlength: 1 },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AnonComment', default: null },
    moderation: { type: String, enum: MODERATION_STATES, default: undefined },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false }
);

anonCommentSchema.index({ post_id: 1, created_at: 1 }); // 回应列表

export const AnonComment = mongoose.model('AnonComment', anonCommentSchema, 'anon_comments');
