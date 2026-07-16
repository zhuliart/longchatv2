# 部署（M8 · 阿里云 ECS · Ubuntu 22.04）

单机 Docker Compose：`mongo`（仅内网）+ `server`（Node）+ `web`（nginx 托管前端并反代 `/api`）。

## 首次部署

```bash
# 1. 装 Docker（若创建实例时已预装可跳过）
curl -fsSL https://get.docker.com | sh

# 2. 拉代码
git clone https://github.com/zhuliart/longchatv2.git
cd longchatv2/deploy

# 3. 配置生产环境变量（密码/密钥务必改强随机）
cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production           # 改 MONGO 密码、JWT_SECRET（openssl rand -hex 32）、CORS_ORIGIN=http://公网IP

# 4. 一键起
bash deploy.sh
```

浏览器打开 `http://<公网IP>/`，注册账号即可使用（生产 seed 只建官方号，测试账号仅开发环境）。

## 常用命令

```bash
docker compose ps                       # 看状态
docker compose logs -f server           # 看后端日志
git pull && bash deploy.sh              # 更新到最新代码
docker compose down                     # 停止（数据保留在 mongo-data 卷）
```

## 安全组（阿里云控制台）
只放行 `22`（限自己 IP）、`80`、`443`；**`3000`、`27017` 不要对公网开放**。

## 绑域名 + HTTPS（备案通过后）
1. 域名 A 记录解析到公网 IP；
2. 阿里云签发免费 DV 证书，下载后放 `deploy/certs/`；
3. 在 `nginx.conf` 增加 443 server 块 + 80→443 跳转，`docker-compose.yml` 的 web 服务加 `"443:443"` 与证书挂载；
4. `.env.production` 的 `CORS_ORIGIN` 改成 `https://你的域名`，重跑 `bash deploy.sh`。
