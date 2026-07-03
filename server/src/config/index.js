import 'dotenv/config';

/**
 * 环境变量装载与校验（T0.6）：缺失必填项时启动直接报错，一次性列出全部缺项。
 * 生产环境额外强制：CORS_ORIGIN、内容安全 AK、AI 密钥（按 provider）、JWT_SECRET 强度。
 */

const env = process.env;
const isProd = env.NODE_ENV === 'production';

const missing = [];
const need = (key) => {
  if (!env[key] || !String(env[key]).trim()) missing.push(key);
  return env[key];
};

need('MONGO_URI');
need('JWT_SECRET');

if (isProd) {
  need('CORS_ORIGIN');
  need('ALI_GREEN_AK_ID');
  need('ALI_GREEN_AK_SECRET');
  need('ALI_GREEN_REGION');
  const provider = env.AI_PROVIDER || 'dashscope';
  if (provider === 'dashscope') need('DASHSCOPE_API_KEY');
  else if (provider === 'anthropic') need('ANTHROPIC_API_KEY');
  else missing.push(`AI_PROVIDER（未知值 "${provider}"，应为 dashscope | anthropic）`);

  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    missing.push('JWT_SECRET（生产环境长度必须 ≥32，建议 openssl rand -hex 32）');
  }
}

if (missing.length) {
  throw new Error(
    `[config] 环境变量缺失或不合法，启动中止：\n  - ${missing.join('\n  - ')}\n` +
      '请参照 server/.env.example 补全。'
  );
}

const int = (key, def) => {
  const n = parseInt(env[key], 10);
  return Number.isFinite(n) ? n : def;
};

export const config = {
  env: env.NODE_ENV || 'development',
  isProd,
  port: int('PORT', 3000),
  mongoUri: env.MONGO_URI,
  jwt: {
    secret: env.JWT_SECRET,
    expires: env.JWT_EXPIRES || '2h',
    refreshExpires: env.REFRESH_EXPIRES || '30d',
  },
  bcryptRounds: int('BCRYPT_ROUNDS', 10),
  corsOrigin: (env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  moderation: {
    akId: env.ALI_GREEN_AK_ID || '',
    akSecret: env.ALI_GREEN_AK_SECRET || '',
    region: env.ALI_GREEN_REGION || 'cn-shanghai',
    // 文本审核增强版的业务场景 service code，须与控制台开通的服务一致
    service: env.ALI_GREEN_SERVICE || 'comment_detection_pro',
    // 默认按 region 拼接官方 endpoint；可覆盖（内网 VPC endpoint / 测试 mock）
    endpoint: env.ALI_GREEN_ENDPOINT || '',
    timeoutMs: int('ALI_GREEN_TIMEOUT_MS', 3000),
    failOpen: env.MODERATION_FAIL_OPEN !== 'false',
  },
  ai: {
    provider: env.AI_PROVIDER || 'dashscope',
    dashscopeApiKey: env.DASHSCOPE_API_KEY || '',
    dashscopeBaseUrl: env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    anthropicApiKey: env.ANTHROPIC_API_KEY || '',
    model: env.AI_MODEL || '', // 空则用各 provider 默认（dashscope: qwen-plus / anthropic: claude-opus-4-8）
    dailyLimit: int('AI_DAILY_LIMIT', 20),
    timeoutMs: int('AI_TIMEOUT_MS', 8000),
  },
};
