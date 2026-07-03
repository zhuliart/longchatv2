import { logger } from '../utils/logger.js';
import { User } from './User.js';
import { Letter } from './Letter.js';
import { Draft } from './Draft.js';
import { Mood } from './Mood.js';
import { MoodComment } from './MoodComment.js';
import { Match } from './Match.js';
import { TokenBlacklist } from './TokenBlacklist.js';

export { User, Letter, Draft, Mood, MoodComment, Match, TokenBlacklist };
export * from './constants.js';

export const ALL_MODELS = [User, Letter, Draft, Mood, MoodComment, Match, TokenBlacklist];

/**
 * 让库中索引与 Schema 定义完全一致（创建缺失、删除多余）——
 * 验收依据：db.collection.getIndexes() 与步骤书 T1.2 表逐条一致。
 * seed 与服务启动时调用。
 */
export async function syncAllIndexes() {
  for (const model of ALL_MODELS) {
    const dropped = await model.syncIndexes();
    if (dropped.length) logger.warn(`${model.collection.name} 删除了多余索引: ${dropped.join(', ')}`);
  }
  logger.info(`索引已同步（${ALL_MODELS.length} 个集合）`);
}
