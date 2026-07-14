# 腾讯云 Lighthouse 部署手册

本文用于把 C++ AI 教学系统部署到腾讯云轻量应用服务器（Lighthouse）。默认方案为 Ubuntu + Docker Compose + Nginx，适合单机课堂服务和小规模教学使用。

项目地址：<https://github.com/sunshinewyym/cpp-ai-teaching>

## 1. 部署结构

```text
浏览器
  -> Lighthouse 防火墙 80/443
  -> Nginx web 容器
     -> Vue 静态页面
     -> /api 反向代理到 server:3000
  -> Express server 容器
     -> DeepSeek 或其他 OpenAI 兼容模型接口
```

只有 `80` 和 `443` 对公网开放。不要开放 `3000`、`5174`、`5175`，后续接入 Judge0 时也不要开放 `2358`。

## 2. 准备 Lighthouse 实例

推荐配置：

| 项目 | 推荐值 |
| --- | --- |
| 镜像 | Ubuntu 22.04 LTS |
| CPU/内存 | 2 核 4 GB |
| 系统盘 | 60 GB SSD |
| 带宽 | 按课堂并发人数选择 |

2 核 2 GB 可以运行，但首次构建前建议创建 2 GB Swap。

如果服务器位于中国大陆并使用域名对外提供网站服务，请先确认域名实名认证和 ICP 备案要求。备案主体信息应与域名所有者信息一致，具体规则以[腾讯云 ICP 备案文档](https://cloud.tencent.com/document/product/243/18905)为准。

## 3. 配置 Lighthouse 防火墙

进入腾讯云控制台：轻量应用服务器 -> 实例 -> 防火墙，添加或确认以下规则：

| 协议 | 端口 | 来源 | 用途 |
| --- | --- | --- | --- |
| TCP | 22 | 你的固定公网 IP，或临时使用 `0.0.0.0/0` | SSH |
| TCP | 80 | `0.0.0.0/0` | HTTP 与证书申请 |
| TCP | 443 | `0.0.0.0/0` | HTTPS |

腾讯云建议遵循最小授权原则。Lighthouse 防火墙只控制入站流量，规则说明见[管理实例防火墙](https://cloud.tencent.com/document/product/1207/44577)。

服务器内部同时配置 UFW：

```bash
apt update
apt install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

## 4. 连接服务器并准备环境

```bash
ssh root@你的公网IP

apt update && apt upgrade -y
apt install -y git ca-certificates curl gnupg lsb-release
timedatectl set-timezone Asia/Shanghai
```

2 GB 内存实例建议创建 Swap：

```bash
free -h
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

## 5. 一键部署

首次部署执行：

```bash
git clone https://github.com/sunshinewyym/cpp-ai-teaching.git /opt/cpp-ai-teaching
cd /opt/cpp-ai-teaching
bash deploy.sh
```

脚本会完成：

- 安装 Docker Engine 和 Docker Compose 插件；
- 配置 UFW；
- 创建低内存实例所需的 Swap；
- 创建 `server/.env` 并读取 DeepSeek API Key；
- 配置公网 IP 或域名；
- 构建、启动并检查两个容器；
- 可选申请 Let's Encrypt 证书。

部署完成后访问：

```text
http://你的公网IP
```

配置域名和 HTTPS 后访问：

```text
https://你的域名
```

## 6. 手动部署

### 6.1 安装 Docker

下面使用 Docker 官方 APT 仓库。完整安装说明见[Docker Engine for Ubuntu](https://docs.docker.com/engine/install/ubuntu/)。

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

docker --version
docker compose version
```

### 6.2 获取代码

```bash
git clone https://github.com/sunshinewyym/cpp-ai-teaching.git /opt/cpp-ai-teaching
cd /opt/cpp-ai-teaching
```

### 6.3 配置模型密钥

```bash
cp server/.env.example server/.env
nano server/.env
chmod 600 server/.env
```

至少修改：

```env
DEEPSEEK_API_KEY=你的真实密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
PORT=3000
```

算法教练相关默认配置可以直接使用：

```env
COACH_TIMEOUT_MS=45000
COACH_MODEL_RETRIES=0
COACH_MAX_ROUNDS=16
```

不要把 `server/.env` 提交到 GitHub，也不要在日志或聊天中发送密钥。

### 6.4 配置访问域名

无域名时写公网 IP：

```bash
printf 'DOMAIN=%s\n' '你的公网IP' > .env
```

有域名时写域名：

```bash
printf 'DOMAIN=%s\n' 'yourdomain.com' > .env
```

根目录 `.env` 只供 Docker Compose 和 Nginx 读取域名；`server/.env` 保存模型与算法教练配置，两者用途不同。

### 6.5 检查并启动

所有 Compose 命令都从仓库根目录执行：

```bash
cd /opt/cpp-ai-teaching

docker compose --env-file .env \
  -f docker/docker-compose.yml config

docker compose --env-file .env \
  -f docker/docker-compose.yml up -d --build

docker compose --env-file .env \
  -f docker/docker-compose.yml ps
```

健康检查：

```bash
curl --fail http://127.0.0.1/api/health
curl -I http://127.0.0.1/
```

预期结果：

```json
{"status":"ok","time":"..."}
```

## 7. 域名与 HTTPS

### 7.1 配置 DNS

在腾讯云 DNSPod 添加 A 记录，将主域名或子域名指向 Lighthouse 公网 IP。等待解析生效后验证：

```bash
getent hosts yourdomain.com
```

### 7.2 申请 Let's Encrypt 证书

```bash
cd /opt/cpp-ai-teaching
apt install -y certbot

docker compose --env-file .env \
  -f docker/docker-compose.yml stop web

certbot certonly --standalone \
  -d yourdomain.com \
  --agree-tos \
  -m your@email.com \
  --non-interactive

mkdir -p ssl
install -m 600 /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/fullchain.pem
install -m 600 /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/privkey.pem

docker compose --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.ssl.yml up -d
```

也可以在腾讯云申请证书，下载 Nginx 格式后分别保存为：

```text
/opt/cpp-ai-teaching/ssl/fullchain.pem
/opt/cpp-ai-teaching/ssl/privkey.pem
```

腾讯云提供的 Nginx 证书部署说明见[Nginx 服务器 SSL 证书安装部署](https://cloud.tencent.com/document/product/400/35244)。

### 7.3 配置自动续期

创建 Certbot 部署钩子：

```bash
cat > /etc/letsencrypt/renewal-hooks/deploy/cpp-ai-teaching <<'EOF'
#!/bin/sh
set -e
DOMAIN='yourdomain.com'
APP_DIR='/opt/cpp-ai-teaching'
install -m 600 "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$APP_DIR/ssl/fullchain.pem"
install -m 600 "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$APP_DIR/ssl/privkey.pem"
cd "$APP_DIR"
docker compose --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.ssl.yml restart web
EOF

chmod +x /etc/letsencrypt/renewal-hooks/deploy/cpp-ai-teaching
certbot renew --dry-run
```

验证 HTTPS：

```bash
curl --fail https://yourdomain.com/api/health
```

## 8. 上线验收

逐项检查：

- [ ] `docker compose ... ps` 显示 `ppt-ai-server` 和 `ppt-ai-web` 正常运行；
- [ ] `/api/health` 返回 `status: ok`；
- [ ] 首页和 `panel.html?topic=BFS` 可以访问；
- [ ] AI 对话可以流式输出；
- [ ] 算法速懂卡、边界盲盒、练习题和讲稿可以生成；
- [ ] 算法教练可以创建会话、点击选项并进入下一轮；
- [ ] 浏览器开发者工具中没有 `/api` 的 401 或 500 错误；
- [ ] Lighthouse 控制台未开放 `3000/5174/5175/2358`；
- [ ] 配置 HTTPS 后，HTTP 会跳转到 HTTPS。

## 9. 日常运维

先定义方便使用的命令：

```bash
cd /opt/cpp-ai-teaching
COMPOSE='docker compose --env-file .env -f docker/docker-compose.yml'
```

常用操作：

```bash
# 查看状态
$COMPOSE ps

# 查看后端日志
$COMPOSE logs -f --tail 200 server

# 查看前端日志
$COMPOSE logs -f --tail 200 web

# 重启
$COMPOSE restart

# 停止但保留镜像
$COMPOSE down

# 查看资源
docker stats
df -h
docker system df
```

更新到 GitHub 最新版本：

```bash
cd /opt/cpp-ai-teaching
git status --short
git pull --ff-only

docker compose --env-file .env \
  -f docker/docker-compose.yml up -d --build

curl --fail http://127.0.0.1/api/health
```

如果正在使用 HTTPS，更新后使用两份 Compose 文件：

```bash
docker compose --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.ssl.yml up -d --build
```

更新失败时先查看最近提交，再切回上一个确认可用的提交并重新构建：

```bash
git log --oneline -5
git checkout <可用提交ID>
docker compose --env-file .env -f docker/docker-compose.yml up -d --build
```

## 10. 备份与恢复

需要备份的内容只有配置、知识库、Prompt 和证书：

```bash
cd /opt/cpp-ai-teaching
tar czf "/root/cpp-ai-teaching-$(date +%Y%m%d-%H%M).tar.gz" \
  server/.env .env knowledge server/prompts ssl 2>/dev/null
```

算法教练 v1.0 的会话保存在 Node.js 进程内，容器重启后会清空。需要长期保存学习记录时，再接入 Redis 或数据库。

## 11. 代码调试与 Judge0

当前生产镜像不会在业务容器中直接运行学生代码，也没有安装 `g++`。因此公网部署后，代码调试模块的本地编译能力不可用，这是安全限制，不是部署故障。

正式开放代码调试前，应部署自建 Judge0 CE，并满足：

- Judge0、PostgreSQL 和 Redis 只加入 Docker 内网；
- 不向 Lighthouse 公网防火墙开放 `2358`；
- 业务后端通过内部地址调用 Judge0；
- 设置时间、内存、输出和并发限制；
- 保留“不给完整解题代码”的教学守卫。

建议环境变量：

```env
CODE_RUNNER=judge0
JUDGE0_URL=http://judge0:2358
JUDGE0_AUTH_TOKEN=替换为内部令牌
JUDGE0_CPP_LANGUAGE_ID=54
JUDGE0_TIME_LIMIT=2
JUDGE0_MEMORY_LIMIT=128000
```

业务后端尚未接入 Judge0 客户端前，不要单独启动 Judge0 对公网提供服务。

## 12. 常见问题

### 页面打不开

```bash
docker compose --env-file .env -f docker/docker-compose.yml ps
docker compose --env-file .env -f docker/docker-compose.yml logs --tail 100 web
curl -I http://127.0.0.1/
```

同时检查 Lighthouse 控制台防火墙和 UFW 的 `80/443` 规则。

### API 返回 401

检查 `server/.env` 中的 API Key、模型名和接口地址，然后重启后端：

```bash
docker compose --env-file .env -f docker/docker-compose.yml restart server
docker compose --env-file .env -f docker/docker-compose.yml logs --tail 100 server
```

### API 返回 500 或算法教练无响应

```bash
docker compose --env-file .env -f docker/docker-compose.yml logs --tail 200 server
curl http://127.0.0.1/api/health
```

确认 Lighthouse 可以访问模型服务，并检查 `COACH_TIMEOUT_MS` 是否过小。

### 构建时内存不足

确认已创建 Swap，然后只重新构建：

```bash
free -h
docker compose --env-file .env -f docker/docker-compose.yml build --no-cache
docker compose --env-file .env -f docker/docker-compose.yml up -d
```

### Nginx 报 `host not found in upstream`

```bash
docker compose --env-file .env -f docker/docker-compose.yml restart server web
```

### HTTPS 启动失败

```bash
ls -l ssl/fullchain.pem ssl/privkey.pem
docker compose --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.ssl.yml config
```

证书文件名必须是 `fullchain.pem` 和 `privkey.pem`。
