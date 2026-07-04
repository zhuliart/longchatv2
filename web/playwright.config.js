/* M7 · T7.3 端到端测试配置（Playwright，容器内已预装 Chromium）。
   前置：后端（:3000）+ MongoDB 需已启动并 seed；前端由本配置自动拉起 vite dev（:5173，/api 代理到 :3000）。
   运行：npm run test:e2e（或 npx playwright test）。
   Chromium 走预装路径（PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers），不联网下载。 */
import { defineConfig, devices } from '@playwright/test';

const CHROMIUM =
  process.env.E2E_CHROMIUM ||
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // 链路间共享后端数据，顺序执行更稳
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.js',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: CHROMIUM },
  },
  projects: [
    // 核心链路用移动版式（写信/详情/匹配/对方主页/编辑为独立路由，桌面版会重定向）。
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: { executablePath: CHROMIUM } } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
