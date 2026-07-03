import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../../config/index.js';

/**
 * Anthropic Claude provider —— AI_PROVIDER=anthropic 时启用（provider 抽象的可切换实现）。
 * 用官方 SDK；claude-opus-4-8 不接受 temperature/top_p/budget_tokens 等参数，不要加。
 */

export const name = 'anthropic';

const DEFAULT_MODEL = 'claude-opus-4-8';

let client = null;

export async function complete({ system, prompt, timeoutMs }) {
  const apiKey = config.ai.anthropicApiKey;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 未配置');

  // 重试交给上层降级逻辑（8s 内要么成功要么友好失败），SDK 自身不重试
  client ??= new Anthropic({ apiKey, maxRetries: 0 });

  const response = await client.messages.create(
    {
      model: config.ai.model || DEFAULT_MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: prompt }],
    },
    { timeout: timeoutMs }
  );
  if (response.stop_reason === 'refusal') throw new Error('Claude 拒绝了本次生成请求');
  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
  if (!text) throw new Error('Claude 返回内容为空');
  return text;
}
