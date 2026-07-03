import { config } from '../../../config/index.js';

/**
 * 阿里云百炼 DashScope（通义千问）provider —— 默认选项，境内服务器可直连。
 * 走 OpenAI 兼容模式的 chat/completions 端点（DashScope 官方提供，无第三方 SDK 依赖）。
 */

export const name = 'dashscope';

const DEFAULT_MODEL = 'qwen-plus';

export async function complete({ system, prompt, timeoutMs }) {
  const apiKey = config.ai.dashscopeApiKey;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY 未配置');

  const res = await fetch(`${config.ai.dashscopeBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.ai.model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`DashScope 接口异常：HTTP ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('DashScope 返回内容为空');
  return text;
}
