import mongoose from 'mongoose';
import { countWords } from '../utils/countWords.js';
import { logger } from '../utils/logger.js';
import { EMOTIONS, EMOTION_FEELINGS, VISIBILITIES, MODERATION_STATES } from './constants.js';

/**
 * moods（契约 §10）：date 为业务日期 YYYY-MM-DD（服务端时间），同人同日唯一（upsert 依据）。
 * feeling 细分词表为软校验：不属对应情绪词表仅记日志，不拒绝写入（契约 §6）。
 */
const moodSchema = new mongoose.Schema(
  {
    uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emotion: { type: String, enum: EMOTIONS, required: [true, 'emotion 必填'] },
    intensity: {
      type: Number,
      required: [true, 'intensity 必填'],
      min: [1, '强度为 1-5'],
      max: [5, '强度为 1-5'],
      validate: { validator: Number.isInteger, message: '强度须为整数' },
    },
    feeling: { type: String, default: '', trim: true, maxlength: [8, '细分感受最多 8 字'] },
    visibility: { type: String, enum: VISIBILITIES, default: 'private' },
    diary: {
      type: String,
      default: '',
      validate: {
        validator: (v) => v === '' || countWords(v) >= 30,
        message: (props) => `日记至少需要30字，当前${countWords(props.value)}字`,
      },
    },
    comment_count: { type: Number, default: 0, min: 0 },
    date: {
      type: String,
      required: [true, 'date 必填'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date 须为 YYYY-MM-DD'],
    },
    moderation: { type: String, enum: MODERATION_STATES, default: undefined },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

moodSchema.index({ uid: 1, date: 1 }, { unique: true }); // 月历 < 200ms；同人同日唯一
moodSchema.index({ visibility: 1, created_at: -1 }); // 心情广场

moodSchema.pre('validate', function softCheckFeeling(next) {
  const list = EMOTION_FEELINGS[this.emotion];
  if (this.feeling && list && !list.includes(this.feeling)) {
    logger.warn(`moods.feeling 软校验：「${this.feeling}」不属 ${this.emotion} 词表（放行，仅记录）`);
  }
  next();
});

export const Mood = mongoose.model('Mood', moodSchema, 'moods');
