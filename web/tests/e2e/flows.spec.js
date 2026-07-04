/* M7 · T7.3 核心链路 E2E（5 条，移动版式）。
   前置：MongoDB + 后端 :3000 已 seed 并运行（见 global-setup 指引）；前端由 playwright 自动拉起。
   设计：每条链路用独立账号，避免相互污染；跨用户收发用 UI 登出/登录切换（同时覆盖登出闭环）。 */
import { test, expect } from '@playwright/test';
import {
  uniqueAccount, seedUser, loginViaUI, logoutViaUI,
  registerAndOnboardViaUI, fillLetter,
} from './helpers.js';

/* ① 注册 → 引导 → 首页 */
test('① 注册→3步引导→进入首页', async ({ page }) => {
  await registerAndOnboardViaUI(page, { account: uniqueAccount('reg'), nickname: '拾光' });
  await expect(page.locator('.home-name')).toContainText('拾光');
  await expect(page.locator('.quick-tile')).toHaveCount(4);
});

/* ② 记心情 → 月历/趋势可见 → 改可见性 → 广场出现 → 评论 */
test('② 记心情→月历趋势→改公开→广场→他人评论', async ({ page }) => {
  const A = uniqueAccount('mood');
  await seedUser({ account: A, nickname: '记心情的人' });
  await loginViaUI(page, A);

  // 首页记录今日心情（先设私密，稍后改公开以覆盖「改可见性」）
  await page.locator('.emotion-item').first().click();
  await page.locator('.diary-input').fill('今天给自己泡了壶茶，把房间收拾干净，心里也跟着空出来一块，很安静。');
  await page.locator('.visibility-item', { hasText: '仅自己' }).click();
  await page.locator('.save-btn').click();
  await expect(page.locator('.mood-done-label')).toBeVisible();

  // 旅程：月历有当日彩点 + 趋势图渲染
  await page.goto('/journey');
  await expect(page.locator('.cal-cell.has-mood.today')).toBeVisible();
  await expect(page.locator('.trend-svg')).toBeVisible();

  // 改可见性 → 公开
  await page.locator('.cal-cell.today').click();
  await page.locator('.action-pill', { hasText: '修改' }).click();
  await page.locator('.visibility-item', { hasText: '公开' }).click();
  await page.locator('.save-btn').click();
  await expect(page.locator('.visibility-badge')).toContainText('公开');

  // 换一个用户在广场看到并评论（广场默认过滤本人）
  await logoutViaUI(page);
  const B = uniqueAccount('reader');
  await seedUser({ account: B, nickname: '路过的人' });
  await loginViaUI(page, B);
  await page.goto('/journey?tab=feed');
  const card = page.locator('.feed-card').first();
  await expect(card).toBeVisible();
  await card.locator('.comment-btn').click();
  await page.locator('.comment-input').fill('读到你的句子，很安心。');
  await page.locator('.comment-send').click();
  await expect(page.locator('.comment-content')).toContainText('很安心');
});

/* ③ 看推荐 → 对方主页 → 写首封(≥150) → 对方收 → 拆信动画 → 回信(≥100) */
test('③ 推荐→主页→写首封→对方拆信→回信', async ({ page }) => {
  const B = uniqueAccount('recv');
  await seedUser({ account: B, nickname: '归零', tags: ['文学', '摄影', '旅行'] });
  const A = uniqueAccount('send');
  await seedUser({ account: A, nickname: '拾光', tags: ['文学', '摄影', '冥想'] });
  await loginViaUI(page, A);

  // 推荐 → 对方主页 → 写信
  await page.goto('/match');
  await expect(page.locator('.soul-card').first()).toBeVisible();
  await page.locator('.rec-item').first().locator('.btn', { hasText: '写信给TA' }).click();
  await expect(page).toHaveURL(/\/write/);
  await fillLetter(page, { title: '写给同频的你', minChars: 150 });
  await page.locator('.btn', { hasText: '封存寄出' }).click();
  await expect(page).toHaveURL(/\/inbox/);

  // 对方登录 → 收件箱拆信 → 回信
  await logoutViaUI(page);
  await loginViaUI(page, B);
  await page.goto('/inbox');
  await page.locator('.envelope-card').first().click();
  await expect(page).toHaveURL(/\/letter\//);
  const anim = page.locator('.open-anim');
  if (await anim.count()) { await anim.click(); }         // 触发拆信动画
  await expect(page.locator('.read-body')).toBeVisible();  // 动画后展示正文
  await page.locator('.btn', { hasText: '回信' }).click();
  await fillLetter(page, { title: '回信', minChars: 100 });
  await page.locator('.btn', { hasText: '封存寄出' }).click();
  await expect(page).toHaveURL(/\/inbox/);

  // 发起方能收到回信
  await logoutViaUI(page);
  await loginViaUI(page, A);
  await page.goto('/inbox');
  await expect(page.locator('.envelope-card').first()).toBeVisible();
});

/* ④ 草稿保存 → 恢复 → 寄出后删除 */
test('④ 草稿保存/恢复/寄出后删除', async ({ page }) => {
  const B = uniqueAccount('draftpeer');
  await seedUser({ account: B, nickname: '青山', tags: ['冥想', '自然', '哲学'] });
  const A = uniqueAccount('drafter');
  await seedUser({ account: A, nickname: '拾光', tags: ['冥想', '自然', '文学'] });
  await loginViaUI(page, A);

  // 从推荐进入写信，存草稿
  await page.goto('/match');
  await page.locator('.rec-item').first().locator('.btn', { hasText: '写信给TA' }).click();
  await page.locator('.content-textarea').fill('青山：读到你说的等待也是一种照料，我想了很久……');
  await page.locator('.btn', { hasText: '存草稿' }).click();

  // 草稿箱出现该草稿
  await page.goto('/inbox?tab=draft');
  await expect(page.locator('.draft-card')).toHaveCount(1);

  // 恢复草稿 → 补足字数 → 寄出
  await page.locator('.draft-card').first().click();
  await expect(page).toHaveURL(/\/write/);
  await fillLetter(page, { title: '致青山', minChars: 150 });
  await page.locator('.btn', { hasText: '封存寄出' }).click();
  await expect(page).toHaveURL(/\/inbox/);

  // 寄出后草稿已被服务端删除
  await page.goto('/inbox?tab=draft');
  await expect(page.locator('.draft-card')).toHaveCount(0);
});

/* ⑤ AI 续写插入（配置 AI 时插入候选；未配置时优雅降级——两者皆不崩溃） */
test('⑤ AI 续写：候选插入或优雅降级', async ({ page }) => {
  const B = uniqueAccount('aipeer');
  await seedUser({ account: B, nickname: '南风' });
  const A = uniqueAccount('aiwriter');
  await seedUser({ account: A, nickname: '拾光' });
  await loginViaUI(page, A);

  await page.goto('/match');
  await page.locator('.rec-item').first().locator('.btn', { hasText: '写信给TA' }).click();
  await page.locator('.content-textarea').fill('夜深了，我想给你写点什么。');
  await page.locator('.inspire-btn').click();
  await page.locator('.ai-action', { hasText: '续写' }).click();

  // 等待候选或降级提示出现（8s 内二选一）
  const suggestion = page.locator('.ai-suggestion').first();
  const aiError = page.locator('.ai-error');
  await expect(suggestion.or(aiError)).toBeVisible({ timeout: 12_000 });

  if (await suggestion.count()) {
    const before = await page.locator('.content-textarea').inputValue();
    await suggestion.click();
    await expect
      .poll(async () => (await page.locator('.content-textarea').inputValue()).length)
      .toBeGreaterThan(before.length);
  } else {
    await expect(aiError).toBeVisible(); // 未配置密钥时的友好降级
    test.info().annotations.push({ type: 'note', description: 'AI 未配置密钥，验证降级路径（配置后可验证插入）' });
  }
});
