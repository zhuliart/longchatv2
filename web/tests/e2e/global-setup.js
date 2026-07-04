/* 全局前置（T7.3）：校验后端可达且已 seed。后端/DB 未起时给出明确指引并中止，
   避免把「环境未就绪」误判为用例失败（与后端 supertest「DB 不可达则跳过」同一理念）。 */
import { request } from '@playwright/test';

const API = process.env.E2E_API_BASE || 'http://localhost:3000/api/v1';

export default async function globalSetup() {
  const ctx = await request.newContext();
  try {
    const res = await ctx.get(`${API}/health`, { timeout: 4000 });
    if (!res.ok()) throw new Error(`health ${res.status()}`);
  } catch (err) {
    throw new Error(
      `\n[E2E] 后端未就绪（${API}/health 不可达：${err.message}）。\n` +
        '请先启动整栈：\n' +
        '  1) docker compose -f deploy/docker-compose.dev.yml up -d   # MongoDB\n' +
        '  2) cd server && npm run seed && npm run dev                 # 后端 :3000\n' +
        '再运行：cd web && npm run test:e2e\n'
    );
  } finally {
    await ctx.dispose();
  }
}
