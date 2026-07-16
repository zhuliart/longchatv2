# 前端镜像（M8）：第一段构建静态产物，第二段用 nginx 托管。
FROM node:20-alpine AS build
WORKDIR /app
# E2E 依赖（playwright）在构建阶段无需下载浏览器
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# nginx.conf 由 compose 挂载到 conf.d/default.conf
EXPOSE 80
