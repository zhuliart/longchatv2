# 后端镜像（M8）：Node 20 Alpine，仅装生产依赖。
FROM node:20-alpine
# 时区设为中国（Asia/Shanghai）：服务端「今天」以本地日期为准，避免 UTC 与用户差一天。
RUN apk add --no-cache tzdata
ENV TZ=Asia/Shanghai
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]
