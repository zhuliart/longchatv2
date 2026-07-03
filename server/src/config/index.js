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
    failOpen: env.MODERATION_FAIL_OPEN !== 'false',
  },
  ai: {
    provider: env.AI_PROVIDER || 'dashscope',
    dashscopeApiKey: env.DASHSCOPE_API_KEY || '',
    anthropicApiKey: env.ANTHROPIC_API_KEY || '',
    dailyLimit: int('AI_DAILY_LIMIT', 20),
    timeoutMs: int('AI_TIMEOUT_MS', 8000),
  },
};
