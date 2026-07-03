import mongoose from 'mongoose';
import { countWords } from '../utils/countWords.js';
import { ACTIVE_TIMES, LETTER_FREQS, MODERATION_STATES, isValidAccount } from './constants.js';

/**
 * users（契约 §10）：_id 为服务端生成 uid（ObjectId）；
 * 相对 v0.2 新增 account（unique）+ password_hash + has_profile。
 * nickname/intro/tags 在注册引导（POST /users/profile）前允许为空，提交后按契约校验。
 */
const userSchema = new mongoose.Schema(
  {
    account: {
      type: String,
      required: [true, 'account 必填'],
      trim: true,
      lowercase: true,
      unique: true, // 登录/注册查重（Web 新增索引）
      validate: { validator: isValidAccount, message: 'account 须为邮箱或 11 位手机号' },
    },
    password_hash: { type: String, required: [true, 'password_hash 必填'], select: false },
    nickname: { type: String, default: '', trim: true, maxlength: [20, '昵称最多 20 字'] },
    intro: {
      type: String,
      default: '',
      trim: true,
      validate: {
        validator: (v) => v === '' || (countWords(v) >= 20 && countWords(v) <= 60),
        message: (props) => `一句话介绍需在20-60字之间，当前${countWords(props.value)}字`,
      },
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) =>
          (arr.length === 0 || (arr.length >= 3 && arr.length <= 5)) &&
          arr.every((t) => typeof t === 'string' && t.trim().length > 0),
        message: '标签需为 3-5 个非空字符串',
      },
    },
    active_time: { type: String, enum: ACTIVE_TIMES, default: 'night' },
    letter_freq: { type: String, enum: LETTER_FREQS, default: 'free' },
    is_member: { type: Boolean, default: false },
    member_expire: { type: Date, default: null },
    has_profile: { type: Boolean, default: false },
    last_active: { type: Date, default: Date.now },
    moderation: { type: String, enum: MODERATION_STATES, default: undefined }, // intro 审核 review 标记（T4.1）
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false }
);

export const User = mongoose.model('User', userSchema, 'users');
