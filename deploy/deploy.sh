#!/usr/bin/env bash
# 一键部署/更新（M8）：在服务器的 deploy/ 目录下运行 `bash deploy.sh`
set -e
cd "$(dirname "$0")"

if [ ! -f .env.production ]; then
  echo "✗ 缺少 deploy/.env.production —— 先复制模板并填写："
  echo "    cp .env.production.example .env.production && chmod 600 .env.production && nano .env.production"
  exit 1
fi

echo "▶ 构建并启动（mongo + server + web）…"
docker compose up -d --build

echo "▶ 等待后端就绪…"
for i in $(seq 1 20); do
  if curl -fsS http://localhost/api/v1/health >/dev/null 2>&1; then break; fi
  sleep 3
done

echo "▶ 初始化官方账号「平常信使」（幂等，可重复运行）…"
docker compose exec -T server npm run seed || echo "  seed 稍后可手动重跑：docker compose exec server npm run seed"

echo ""
echo "✅ 部署完成。浏览器访问：http://<你的公网IP>/"
echo "   查看日志：docker compose logs -f server"
