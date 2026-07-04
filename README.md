# 平常 PingChang — Web 版

情绪慢社交：写信、记情绪、慢慢遇见。本仓库为 HTML 网页版全栈工程（monorepo）。

- 设计交付包（像素基准 + API 契约）：`design/design_handoff_pingchang_web/`
- 开发任务步骤书：`docs/开发任务步骤书-网页版.md`
- 云资源与备案（人工操作项）：`docs/云资源与备案清单.md`

## 目录结构

```
longchatv2/
├── design/        # 设计交付包（只读参考，勿改）
├── docs/          # 项目文档
├── web/           # 前端 React 18 + Vite
├── server/        # 后端 Node.js + Express
└── deploy/        # Docker 编排与部署脚本
```

## 零安装云端启动（GitHub Codespaces · 推荐给不想本地装环境的人）

无需在电脑上装 Node/Docker，全程浏览器内运行：

1. 在本仓库页面点 **Code → Codespaces → Create codespace on main**；
2. 首次创建会自动装依赖、起 MongoDB、生成测试数据（约 2–3 分钟，看终端进度）；
3. 完成后在终端运行 **`bash .devcontainer/run.sh`** 启动整站；
4. 点弹出的 **5173** 端口链接（或「端口 / Ports」面板里的地球图标）打开网站；
5. 用测试账号 `shiguang@test.com` / `test123456` 登录。

配置见 `.devcontainer/`。停止：终端里按 `Ctrl+C`。

## 本地开发快速启动

要求：Node.js ≥ 20，Docker（本地数据库用）。

```bash
# 1. 启动本地 MongoDB（首次自动拉镜像）
docker compose -f deploy/docker-compose.dev.yml up -d

# 2. 启动后端（:3000）
cd server
cp .env.example .env      # 开发默认值开箱即用
npm install
npm run seed              # 种子数据：官方号「平常信使」+ 3 个测试用户，幂等可重跑
npm run dev

# 3. 启动前端（:5173，/api 已代理到 :3000）
cd ../web
npm install
npm run dev
```

验证：浏览器打开 http://localhost:5173 ，或 `curl http://localhost:3000/api/v1/health`。

后端可选能力（M4，默认零配置可跑）：

- **内容审核**：配置 `ALI_GREEN_AK_ID/SECRET` 后接入阿里云文本审核增强版；未配置时仅本地敏感词快筛（开发够用）。审核服务异常按 `MODERATION_FAIL_OPEN` 放行并记日志。
- **AI 灵感**：配置 `DASHSCOPE_API_KEY`（默认 provider）或切 `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`；未配置时接口降级返回 9002 友好提示，不影响写信主流程。
- **定时任务**：随服务自动注册（匹配 00:00 / 去年今日 08:00 / 不活跃检查 09:00）；手动触发 `npm run job:match` / `job:memory` / `job:inactivity`。

测试账号（seed 生成，仅开发环境）：`shiguang@test.com` / `guiling@test.com` / `qingshan@test.com`，密码均为 `test123456`。官方账号「平常信使」的密码由 `SEED_OFFICIAL_PASSWORD` 指定，未指定则随机生成并打印在 seed 日志中。生产环境跑 seed 只建官方号，不放测试数据。

前端说明（M5 静态还原 · M6 接入 API）：

- **像素基准**：`design/.../prototype/` 两个高保真原型；默认锁定「黛雾」主题 + 强调色 `#9C7B86` + 正文黑体（15 套主题机制保留，V1 不出切换 UI；首页月亮按钮切深色）。
- **响应式一体**：`<768px` 移动版式（Tab + 叠层页），`≥768px` 桌面壳层（侧栏 + 双栏），桌面再分 `<1160px` 图标栏 / `<960px` 纵向堆叠两档断点。
- **字体自托管**：Noto Sans/Serif SC 400–700 经 `@fontsource` 随构建打包，不走 Google Fonts 外链。
- **接口层（M6）**：`web/src/api/` 统一 fetch 封装（注入 Bearer、解析 `{code,data,message}`、401 清态回登录、9001/9002 toast + 9002 重试一次），各模块与契约路由一一对应，页面禁止直连 fetch。原型 `data.jsx` 的假数据（`web/src/mocks/`）已全部替换为接口并删除，仅词表常量保留在 `web/src/constants/`；用户资料 / 今日心情等跨页共享态收敛到 `web/src/store/`。加载骨架、`正在取信…` spinner、空态与网络异常 toast 见 `web/src/components/states.jsx`。

## 测试

```bash
cd server && npm test     # 后端单测（含前后端 countWords 同源一致性校验）
cd web && npm run lint    # 前端 lint
cd web && npm run build   # 前端构建（含字体产物）
```

## 全局约定（摘要，完整见步骤书 §1.4）

- 接口响应统一 `{ code, data, message }`；错误码 `1001/1002/1003/1004/1005/9001/9002`
- 服务端不信任前端：字数、标签数、权限一律服务端复校
- 字数算法前后端同源：中文按字 + 英文按词 + 数字组，各一份相同实现（`*/src/utils/countWords.js`），单测强制两份文件一致
- 「今天」以服务端时间为准；分页 `?page=0` 起，每页 10（评论 20）
