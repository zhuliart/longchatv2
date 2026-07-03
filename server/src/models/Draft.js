import mongoose from 'mongoose';

/**
 * drafts（契约 §10）：to_uid 可空（「还没想好寄给谁」）；未发布内容不过审核。
 * is_first 决定寄出门槛（150/100），列表接口据此回传 required。
 */
const draftSchema = new mongoose.Schema(
  {
    uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to_uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, default: '', trim: true, maxlength: [30, '标题最多 30 字'] },
    content: { type: String, default: '' },
    word_count: { type: Number, default: 0, min: 0 },
    is_first: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

draftSchema.index({ uid: 1, updated_at: -1 }); // 草稿列表

export const Draft = mongoose.model('Draft', draftSchema, 'drafts');
