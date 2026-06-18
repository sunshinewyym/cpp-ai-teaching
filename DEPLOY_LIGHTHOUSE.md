# 🚀 腾讯云轻量应用服务器部署手册（Hermes Agent 自动执行版）

> **目标**：将 C++ AI 教学系统完整部署到腾讯云轻量应用服务器，实现 HTTPS 访问。
>
> **代码来源**：https://github.com/sunshinewyym/cpp-ai-teaching （Public）
>
> **预期结果**：通过 `https://你的域名` 或 `http://你的公网IP` 访问系统。

---

## 📋 前置条件

在开始部署之前，确认以下信息已就绪：

| 项目 | 是否就绪 | 说明 |
|------|----------|------|
| 腾讯云轻量应用服务器 | ✅ | Ubuntu 22.04，2核4G 或以上 |
| 服务器公网 IP | ✅ | 在控制台获取 |
| SSH 能连接服务器 | ✅ | 使用 root 用户，密码在控制台重置 |
| 域名（可选） | ⬜ | 如需 HTTPS 必须有域名 |
| DeepSeek API Key | ✅ | 从 https://platform.deepseek.com 获取 |

---

## 第一步：连接服务器并更新系统

```bash
# 连接服务器（替换为你的公网 IP）
ssh root@你的公网IP

# 更新系统包
apt update && apt upgrade -y

# 设置时区（确保日志时间正确）
timedatectl set-timezone Asia/Shanghai
```

**验证**：
```bash
date
# 应显示北京时间，如：Thu Jun 18 16:30:00 CST 2026
```

---

## 第二步：安装 Docker 和 Docker Compose

```bash
# 安装必要工具
apt install -y ca-certificates curl gnupg

# 添加 Docker 官方 GPG 密钥
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# 添加 Docker 仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list

# 安装 Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker 并设置开机自启
systemctl enable docker
systemctl start docker
```

**验证**：
```bash
docker --version
# 应显示：Docker version 24.x.x 或更高

docker compose version
# 应显示：Docker Compose version v2.x.x
```

---

## 第三步：配置防火墙

### 3.1 Linux 防火墙（ufw）

```bash
# 安装 ufw（如果未安装）
apt install -y ufw

# 放行必要端口
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# 启用防火墙
ufw --force enable

# 查看状态
ufw status
```

**预期输出**：
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

### 3.2 腾讯云控制台防火墙

> ⚠️ 这一步必须在腾讯云控制台手动操作，命令行无法完成。

1. 打开 https://console.cloud.tencent.com/lighthouse/instance/list
2. 点击你的服务器实例
3. 进入 **防火墙** 选项卡
4. 点击 **添加规则**，添加以下两条：

| 协议 | 端口 | 来源 | 策略 |
|------|------|------|------|
| TCP | 80 | 0.0.0.0/0 | 允许 |
| TCP | 443 | 0.0.0.0/0 | 允许 |

> SSH 端口（22）通常已默认放行，无需重复添加。

---

## 第四步：创建 Swap（仅 2核2G 服务器需要）

> 如果你的服务器内存 ≥ 4G，跳过此步。

```bash
# 检查内存
free -h
# 如果 Mem 总量 < 2G，执行以下命令

fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

**验证**：
```bash
free -h
# Swap 应显示 2.0G
```

---

## 第五步：克隆项目代码

```bash
# 克隆项目到 /opt 目录
git clone https://github.com/sunshinewyym/cpp-ai-teaching.git /opt/ppt-ai-system

# 进入项目目录
cd /opt/ppt-ai-system

# 查看项目结构
ls -la
```

**预期输出**：应看到 `server/`、`web/`、`docker/`、`knowledge/` 等目录。

---

## 第六步：配置环境变量

```bash
# 复制环境变量模板
cp server/.env.example server/.env

# 编辑文件（用 sed 直接替换，避免交互式编辑）
# ⚠️ 将下面的 sk-xxxxxxxx 替换为你的真实 DeepSeek API Key
sed -i 's|sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|你的真实API_KEY|' server/.env
```

**验证**：
```bash
cat server/.env
```

**预期输出**（API Key 已被替换为真实值）：
```
DEEPSEEK_API_KEY=sk-真实密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
PORT=3000
```

---

## 第七步：构建并启动 Docker 容器

```bash
# 创建 .env 文件（给 docker-compose 用，配置域名）
# 如果没有域名，用公网 IP 替换
echo "DOMAIN=你的公网IP" > .env

# 进入 docker 目录并构建
cd /opt/ppt-ai-system/docker

# 构建镜像并启动（首次构建约 2-5 分钟）
docker compose up -d --build
```

**等待构建完成**，然后验证：

```bash
# 查看容器状态
docker compose ps
```

**预期输出**：
```
NAME             STATUS                    PORTS
ppt-ai-server    Up (healthy)              3000/tcp
ppt-ai-web       Up (healthy)              0.0.0.0:80->80/tcp
```

> 如果状态显示 `starting`，等待 30 秒后再执行 `docker compose ps`。
>
> 如果状态显示 `unhealthy`，执行 `docker compose logs server` 查看错误日志。

---

## 第八步：验证服务

```bash
# 测试 API 健康检查
curl http://localhost/api/health
```

**预期输出**：
```json
{"status":"ok","time":"2026-06-18T08:30:00.000Z"}
```

```bash
# 测试前端页面
curl -s -o /dev/null -w '%{http_code}' http://localhost/
```

**预期输出**：`200`

```bash
# 测试 panel.html（PPT 链接面板）
curl -s -o /dev/null -w '%{http_code}' http://localhost/panel.html
```

**预期输出**：`200`

---

## 第九步：配置域名和 DNS（可选，但强烈推荐）

> 如果你没有域名，跳过此步，直接用公网 IP 访问。

### 9.1 添加 DNS 解析

在腾讯云 **云解析 DNS** 控制台（https://console.cloud.tencent.com/cns）添加：

| 记录类型 | 主机记录 | 记录值 | TTL |
|----------|----------|--------|-----|
| A | @ | 你的公网IP | 600 |
| A | www | 你的公网IP | 600 |

### 9.2 验证 DNS 生效

```bash
# 替换为你的域名
ping yourdomain.com
# 应解析到你的公网 IP
```

### 9.3 更新 .env 中的域名

```bash
cd /opt/ppt-ai-system

# 更新域名
echo "DOMAIN=yourdomain.com" > .env

# 重启容器使域名生效
cd docker
docker compose down
docker compose up -d
```

---

## 第十步：配置 HTTPS（强烈推荐）

> HTTPS 对 Office Add-in 是必须的，也保护 API Key 传输安全。
>
> 前提：必须已完成第九步（域名已解析到服务器）。

### 方式 A：Let's Encrypt 免费证书（推荐，自动续期）

```bash
cd /opt/ppt-ai-system

# 安装 certbot
apt install -y certbot

# 停止 web 容器（释放 80 端口给 certbot）
cd docker
docker compose stop web

# 等待 3 秒
sleep 3

# 申请证书（替换为你的域名和邮箱）
certbot certonly --standalone \
  -d yourdomain.com \
  --agree-tos \
  -m your@email.com \
  --non-interactive

# 复制证书到项目目录
cd /opt/ppt-ai-system
mkdir -p ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
chmod 600 ssl/*.pem

# 启用 SSL 配置
cp docker/docker-compose.ssl.yml docker/docker-compose.override.yml

# 重启所有容器
cd docker
docker compose up -d

# 设置证书自动续期（每天凌晨 3 点检查）
echo "0 3 * * * root certbot renew --quiet && cd /opt/ppt-ai-system/docker && docker compose restart web" > /etc/cron.d/certbot-renew
```

### 方式 B：腾讯云免费证书

1. 控制台 → **SSL 证书** → **申请免费证书**
2. 下载 **Nginx 格式**证书
3. 上传到服务器：

```bash
# 在本地电脑执行（替换 IP）
scp yourdomain.com_nginx/1_yourdomain.com_bundle.crt root@你的IP:/opt/ppt-ai-system/ssl/fullchain.pem
scp yourdomain.com_nginx/2_yourdomain.com.key root@你的IP:/opt/ppt-ai-system/ssl/privkey.pem
```

4. 在服务器上执行：

```bash
cd /opt/ppt-ai-system
chmod 600 ssl/*.pem
cp docker/docker-compose.ssl.yml docker/docker-compose.override.yml
cd docker
docker compose up -d
```

**验证 HTTPS**：
```bash
curl https://yourdomain.com/api/health
```

**预期输出**：
```json
{"status":"ok","time":"2026-06-18T08:30:00.000Z"}
```

---

## 第十一步：验证完整功能

### 11.1 浏览器访问

打开浏览器访问：
- HTTP: `http://你的公网IP` 或 `http://yourdomain.com`
- HTTPS: `https://yourdomain.com`（如已配置）

应看到 C++ AI 教学助手界面，左侧有 6 个功能菜单。

### 11.2 测试 AI 对话

1. 点击 **💬 AI 对话**
2. 输入：`什么是变量？`
3. 应看到流式输出的回答

### 11.3 测试算法脑洞

1. 点击 **💡 算法脑洞**
2. 输入：`单调栈`
3. 点击 **💡 生成脑洞**
4. 应看到大字号的故事卡片

### 11.4 测试 PPT 面板

浏览器访问：
```
http://你的公网IP/panel.html?topic=BFS
```

应看到独立的 AI 助教面板，课程主题自动填充为"BFS"。

---

## 第十二步：日常运维命令

### 查看日志

```bash
cd /opt/ppt-ai-system/docker

# 实时查看所有日志
docker compose logs -f

# 只看后端日志
docker compose logs -f server

# 只看最近 100 行
docker compose logs --tail 100
```

### 重启服务

```bash
cd /opt/ppt-ai-system/docker

# 重启所有容器
docker compose restart

# 只重启后端
docker compose restart server

# 只重启前端
docker compose restart web
```

### 更新代码

```bash
cd /opt/ppt-ai-system

# 拉取最新代码
git pull

# 重新构建并启动
cd docker
docker compose up -d --build
```

### 更新知识库或 Prompt（无需重建）

直接编辑文件，改动会通过 volume 挂载自动生效：

```bash
# 编辑知识库
vim /opt/ppt-ai-system/knowledge/bfs.md

# 编辑 Prompt 模板
vim /opt/ppt-ai-system/server/prompts/csp.md

# 重启后端使改动生效
cd /opt/ppt-ai-system/docker
docker compose restart server
```

### 备份

```bash
# 备份配置和数据
tar czf /tmp/ppt-ai-backup-$(date +%Y%m%d).tar.gz \
  /opt/ppt-ai-system/server/.env \
  /opt/ppt-ai-system/knowledge/ \
  /opt/ppt-ai-system/server/prompts/ \
  /opt/ppt-ai-system/ssl/ \
  /opt/ppt-ai-system/.env

# 查看备份
ls -lh /tmp/ppt-ai-backup-*.tar.gz
```

### 清理 Docker 空间

```bash
# 查看 Docker 磁盘占用
docker system df

# 清理无用镜像和容器
docker system prune -a
```

---

## 🔧 常见问题排查

### 问题 1：Docker build 时 OOM（内存不足）

**症状**：`npm install` 被 killed

**解决**：
```bash
# 创建 swap（见第四步）
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 重新构建
cd /opt/ppt-ai-system/docker
docker compose up -d --build
```

### 问题 2：容器启动后 nginx 报错 "host not found in upstream"

**原因**：web 容器在 server 容器就绪前启动

**解决**：
```bash
cd /opt/ppt-ai-system/docker
docker compose restart web
```

### 问题 3：AI 不回复 / API 报错

**排查步骤**：
```bash
# 1. 检查 .env 是否配置正确
cat /opt/ppt-ai-system/server/.env
# 确认 DEEPSEEK_API_KEY 不是 sk-xxxxx 示例值

# 2. 查看后端日志
docker compose logs server | tail -20

# 3. 测试 API Key 是否有效
curl https://api.deepseek.com/v1/models \
  -H "Authorization: Bearer 你的真实API_KEY"
```

### 问题 4：端口被占用

**症状**：`Error: listen EADDRINUSE`

**解决**：
```bash
# 查看占用端口的进程
lsof -i :80
lsof -i :3000

# 杀掉占用进程
kill -9 进程ID

# 重新启动
cd /opt/ppt-ai-system/docker
docker compose up -d
```

### 问题 5：SSL 证书续期失败

**排查**：
```bash
# 测试续期
certbot renew --dry-run

# 确认 80 端口可从外网访问
curl http://yourdomain.com

# 确认腾讯云控制台防火墙允许 80 端口
```

### 问题 6：Git pull 失败

**解决**：
```bash
cd /opt/ppt-ai-system

# 丢弃本地改动
git stash

# 重新拉取
git pull

# 如果还是失败，强制同步
git fetch origin
git reset --hard origin/main
```

---

## 📊 部署完成检查清单

逐项确认：

- [ ] `docker --version` 正常输出
- [ ] `docker compose ps` 显示两个容器都是 `healthy`
- [ ] `curl http://localhost/api/health` 返回 `{"status":"ok"}`
- [ ] 浏览器打开 `http://公网IP` 能看到界面
- [ ] AI 对话能正常流式回复
- [ ] `http://公网IP/panel.html?topic=BFS` 能正常访问
- [ ] （如配置域名）`http://domain.com` 能访问
- [ ] （如配置 HTTPS）`https://domain.com` 显示安全锁
- [ ] （如配置 HTTPS）证书自动续期已设置

**全部打勾？部署完成！🎉**
