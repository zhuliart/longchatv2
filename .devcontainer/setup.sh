#!/usr/bin/env bash
# Codespaces 首次创建时自动运行：起数据库 + 装依赖 + 造测试数据。
set -e
cd "$(dirname "$0")/.."

echo "▶ [1/4] 等待 Docker 就绪…"
for i in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done

echo "▶ [2/4] 启动本地 MongoDB…"
docker compose -f deploy/docker-compose.dev.yml up -d

echo "▶ [3/4] 安装后端依赖并生成测试数据…"
cd server
[ -f .env ] || cp .env.example .env
npm install
for i in $(seq 1 15); do
  if npm run seed; then break; fi
  echo "  MongoDB 尚未就绪，2s 后重试播种…"; sleep 2
done

echo "▶ [4/4] 安装前端依赖…"
cd ../web
npm install

echo ""
echo "✅ 准备完成！在终端运行下面这一行即可启动网站："
echo "     bash .devcontainer/run.sh"
echo "   然后点弹出的 5173 端口链接（或「端口」面板里的地球图标）打开网站。"
