/* E2E 辅助（T7.3）：唯一账号、经 API 快速造已完成引导的用户（作为写信对象/收信人）、UI 登录。 */
import { request, expect } from '@playwright/test';

const API = process.env.E2E_API_BASE || 'http://localhost:3000/api/v1';

let seq = 0;
export function uniqueAccount(prefix = 'e2e') {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}@test.dev`;
}

/** 经 API 造一个已完成引导的用户，返回其登录信息（供另一账号登录/收信）。 */
export async function seedUser({ account, password = 'test123456', nickname, intro, tags }) {
  const ctx = await request.newContext({ baseURL: API });
  const reg = await ctx.post('/auth/register', { data: { account, password } });
  expect(reg.ok(), '注册请求应成功').toBeTruthy();
  const { token } = (await reg.json()).data;
  const prof = await ctx.post('/users/profile', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      nickname,
      intro: intro || '这是一段用于端到端测试的自我介绍，字数落在二十到六十之间，真诚一些。',
      tags: tags || ['文学', '摄影', '冥想'],
      activeTime: 'night',
      letterFreq: 'biweekly',
    },
  });
  expect(prof.ok(), '引导提交应成功').toBeTruthy();
  await ctx.dispose();
  return { account, password, nickname };
}

/** UI 登录（走真实表单，验证登录闭环）。 */
export async function loginViaUI(page, account, password = 'test123456') {
  await page.goto('/login');
  await page.locator('.seg-tab', { hasText: '登录' }).click();
  await page.locator('.form-input').first().fill(account);
  await page.locator('.form-input[type="password"]').first().fill(password);
  await page.locator('.login-btn').click();
  await expect(page).toHaveURL(/\/$|\/onboarding/);
}

/** 在写信页填满门槛字数并寄出。 */
export async function fillLetter(page, { title, minChars }) {
  if (title) await page.locator('.title-input, .dsk-write-title').first().fill(title);
  const body = '见字如面。'.repeat(Math.ceil(minChars / 5) + 2);
  await page.locator('.content-textarea, .dsk-write-body').first().fill(body);
}

export const zh = (n) => '字'.repeat(n);

/** UI 登出（/me → 退出登录），回到登录页。 */
export async function logoutViaUI(page) {
  await page.goto('/me');
  await page.locator('.menu-danger', { hasText: '退出登录' }).click();
  await expect(page).toHaveURL(/\/login/);
}

/** 注册并完成 3 步引导（走真实 UI，覆盖 flow ①）。 */
export async function registerAndOnboardViaUI(page, { account, password = 'test123456', nickname }) {
  await page.goto('/login');
  await page.locator('.seg-tab', { hasText: '注册' }).click();
  await page.locator('.form-input').nth(0).fill(account);
  await page.locator('.form-input[type="password"]').nth(0).fill(password);
  await page.locator('.form-input[type="password"]').nth(1).fill(password);
  await page.locator('.login-btn').click();
  await expect(page).toHaveURL(/\/onboarding/);
  // 步骤 1：昵称 + 介绍（20–60 字）
  await page.locator('.form-input').first().fill(nickname);
  await page.locator('.form-textarea').fill('我是一个喜欢在夜里写信的人，愿意与陌生的灵魂交换真诚而缓慢的句子。');
  await page.locator('.btn', { hasText: '下一步' }).click();
  // 步骤 2：选 3 个标签
  for (const t of ['文学', '摄影', '冥想']) {
    await page.locator('.tag-option', { hasText: new RegExp(`^${t}$`) }).click();
  }
  await page.locator('.btn', { hasText: '下一步' }).click();
  // 步骤 3：完成
  await page.locator('.option-item', { hasText: '夜深' }).click();
  await page.locator('.option-row-item', { hasText: '每两周一封' }).click();
  await page.locator('.btn', { hasText: '完成注册' }).click();
  await expect(page).toHaveURL(/\/$/);
}
