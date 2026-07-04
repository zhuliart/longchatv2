#!/usr/bin/env bash
# 一条命令启动整站：数据库 + 后端 + 前端。按 Ctrl+C 一起停止。
set -e
cd "$(dirname "$0")/.."

echo "▶ 确认数据库在运行…"
docker compose -f deploy/docker-compose.dev.yml up -d

trap 'echo; echo "正在停止…"; kill 0' EXIT
echo "▶ 启动后端（:3000）与前端（:5173）… 首次启动稍等几秒"
( cd server && npm run dev ) &
( cd web && npm run dev ) &
wait
