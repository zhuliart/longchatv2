import mongoose from 'mongoose';
import { countWords } from '../utils/countWords.js';
import { MODERATION_STATES } from './constants.js';

/**
 * mood_comments（契约 §10）：parent_id 顶层为 null，仅支持两级
 * （「只能回复顶层评论」在 M3 路由层校验，Schema 只存结构）。
 */
const moodCommentSchema = new mongoose.Schema(
  {
    mood_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Mood', required: true },
    from_uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: {
      type: String,
      required: [true, '评论内容必填'],
      validate: {
        validator: (v) => countWords(v) >= 1 && countWords(v) <= 200,
        message: (props) => `评论需在1-200字之间，当前${countWords(props.value)}字`,
      },
    },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MoodComment', default: null },
    moderation: { type: String, enum: MODERATION_STATES, default: undefined },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false }
);

moodCommentSchema.index({ mood_id: 1, created_at: 1 }); // 评论列表

export const MoodComment = mongoose.model('MoodComment', moodCommentSchema, 'mood_comments');
