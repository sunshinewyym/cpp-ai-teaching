# 📘 C++ AI 教学系统 — 部署手册

> 本手册覆盖本地开发和腾讯云轻量应用服务器生产部署两种场景。

---

## 目录

- **第一部分：本地开发**
  - [1. 系统要求](#1-系统要求)
  - [2. 安装基础软件](#2-安装基础软件)
  - [3. 获取项目代码](#3-获取项目代码)
  - [4. 配置 DeepSeek API Key](#4-配置-deepseek-api-key)
  - [5. 启动后端](#5-启动后端)
  - [6. 启动前端](#6-启动前端)
  - [7. PowerPoint 插件](#7-powerpoint-插件)
- **第二部分：腾讯云轻量应用服务器部署（推荐）**
  - [8. 腾讯云 Lighthouse 部署](#8-腾讯云-lighthouse-部署)
- **第三部分：其他部署方式**
  - [9. PM2 部署](#9-pm2-部署)
  - [10. 手动 Nginx 配置](#10-手动-nginx-配置)
- **附录**
  - [11. 常见问题排查](#11-常见问题排查)
  - [12. 命令速查表](#12-命令速查表)
  - [13. 代码调试执行环境](#13-代码调试执行环境)

---

# 第一部分：本地开发

## 1. 系统要求

| 项目 | 最低要求 |
|------|----------|
| 内存 | ≥ 2GB |
| 硬盘 | ≥ 1GB 可用空间 |
| 网络 | 需要互联网（调用 DeepSeek API） |
| 操作系统 | Windows 10+ / macOS / Linux |

## 2. 安装基础软件

### 2.1 Node.js（必须）

1. 访问 https://nodejs.org ，下载 **LTS 版本**（v20 或更高）
2. 安装时确保勾选 **"Add to PATH"**
3. 验证：

```bash
node --version   # 应显示 v20.x.x 或更高
npm --version    # 应显示 10.x.x 或更高
```

### 2.2 Git（推荐）

1. 访问 https://git-scm.com/download/win 下载安装
2. 验证：`git --version`

### 2.3 Docker（可选，用于容器化部署）

1. 访问 https://www.docker.com/products/docker-desktop/ 下载 Docker Desktop
2. 安装后重启电脑
3. 验证：`docker --version`

## 3. 获取项目代码

```bash
# 方式一：Git 克隆
git clone https://github.com/你的用户名/cpp-ai-teaching.git
cd cpp-ai-teaching

# 方式二：下载 ZIP 解压后进入目录
cd cpp-ai-teaching
```

## 4. 配置 DeepSeek API Key

1. 访问 https://platform.deepseek.com 注册并登录
2. 左侧菜单 → **API Keys** → **创建 API Key**
3. 复制 `sk-xxx...` 密钥

```bash
cd server
cp .env.example .env
notepad .env   # Windows
# 或 vim .env  # Linux/macOS
```

将 `DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` 替换为你的真实密钥。

> ⚠️ 不要把 API Key 上传到公开仓库！

## 5. 启动后端

```bash
cd server
npm install
npm run dev
```

看到 `Server running on http://localhost:3000` 即成功。**保持窗口不关。**

验证：
```bash
curl http://localhost:3000/api/health
# 返回 {"status":"ok","time":"..."}
```

## 6. 启动前端

新开一个终端：

```bash
cd web
npm install
npm run dev
```

浏览器打开 **http://localhost:5174** 即可使用。

## 7. 在 PPT 中使用

### 方式一：插入链接（推荐，最简单）

1. 后端启动后，AI 面板地址为：`http://localhost:3000/panel.html`
2. 在 PPT 中选中文字或按钮 → **插入 → 链接** → 粘贴上面的 URL
3. 演示时点击链接，浏览器会打开 AI 助教面板
4. **自动填充课程主题**：URL 支持参数 `?topic=课程名`，如：
```
http://localhost:3000/panel.html?topic=单调栈
```

**部署到服务器后**，把 `localhost:3000` 替换为你的域名：
```
https://yourdomain.com/panel.html?topic=BFS
```

### 方式二：Office Add-in（需要额外配置）

前提：后端正在运行，且已配置 HTTPS。

1. 安装 HTTPS 证书工具：
```bash
npm install -g office-addin-dev-certs
office-addin-dev-certs install
```

2. 打开 PowerPoint → **文件 → 选项 → 信任中心 → 受信任的加载项目录**

3. 添加 `office-addin` 文件夹路径

4. 关闭重开 PowerPoint → **插入 → 我的加载项** → 选择 **C++ AI 教学助手**

---

# 第二部分：腾讯云轻量应用服务器部署

## 8. 腾讯云 Lighthouse 部署

### 8.1 购买服务器

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 搜索 **轻量应用服务器** → 点击 **创建**
3. 推荐配置：

| 配置项 | 推荐值 |
|--------|--------|
| 地域 | 离你最近（广州/上海/北京） |
| 镜像 | **Ubuntu 22.04 LTS** |
| 套餐 | **2核4G**（2核2G 也可，但构建时可能需要 swap） |
| 系统盘 | 60GB SSD |
| 购买时长 | 按需选择 |

4. 购买完成后，在实例列表中找到你的服务器，记录 **公网 IP**

### 8.2 重置密码并连接

1. 控制台 → 轻量应用服务器 → 点击实例 → **更多操作 → 重置密码**
2. 设置 root 密码
3. SSH 连接：

```bash
ssh root@你的公网IP
```

> Windows 用户可以用 PowerShell 自带的 ssh，或使用 [MobaXterm](https://mobaxterm.mobatek.net/) / [Termius](https://termius.com/) 等工具。

4. 连接成功后更新系统：

```bash
apt update && apt upgrade -y
```

### 8.3 域名绑定（可选但推荐）

**为什么要域名？** 域名比 IP 好记，且配置 HTTPS 必须有域名。

1. 在腾讯云或其他平台购买域名
2. 进入 [云解析 DNS 控制台](https://console.cloud.tencent.com/cns)
3. 添加两条记录：

| 记录类型 | 主机记录 | 记录值 |
|----------|----------|--------|
| A | @ | 你的公网IP |
| A | www | 你的公网IP |

4. 等待 DNS 生效（通常 10 分钟内）

验证：
```bash
ping yourdomain.com
# 应该解析到你的公网 IP
```

### 8.4 配置防火墙

**这一步非常关键！** 腾讯云有两层防火墙，都需要配置。

**第一层：控制台防火墙**

1. 控制台 → 轻量应用服务器 → 点击实例 → **防火墙** → **添加规则**

| 协议 | 端口 | 来源 | 备注 |
|------|------|------|------|
| TCP | 80 | 0.0.0.0/0 | HTTP |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 22 | 0.0.0.0/0 | SSH（通常已有） |

> ⚠️ **不要开放 3000 端口！** 后端通过 Nginx 内部代理访问，不需要对外暴露。

**第二层：Linux 防火墙（deploy.sh 会自动配置）**

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 8.5 一键部署

SSH 登录服务器后，执行：

```bash
# 下载部署脚本（方式一：从 Git 仓库获取）
git clone https://github.com/你的用户名/cpp-ai-teaching.git /opt/cpp-ai-teaching
cd /opt/cpp-ai-teaching
bash deploy.sh
```

或者手动上传项目代码到 `/opt/cpp-ai-teaching` 后执行 `bash deploy.sh`。

**脚本会自动完成：**
1. ✅ 检查系统环境（内存不足自动创建 swap）
2. ✅ 安装 Docker 和 Docker Compose
3. ✅ 配置防火墙（ufw）
4. ✅ 交互式配置 DeepSeek API Key
5. ✅ 交互式配置域名
6. ✅ 构建 Docker 镜像并启动
7. ✅ 等待健康检查通过
8. ✅ 验证服务可用
9. ✅ 可选：自动申请 Let's Encrypt SSL 证书

部署完成后会显示访问地址和常用命令。

### 8.6 手动部署（不用脚本）

如果你更喜欢手动操作：

```bash
# 1. 安装 Docker
apt update
apt install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 2. 进入项目目录
cd /opt/cpp-ai-teaching

# 3. 配置环境变量
cp server/.env.example server/.env
vim server/.env   # 填入 API Key

# 4. 创建 .env 文件（给 docker-compose 用）
echo "DOMAIN=yourdomain.com" > .env

# 5. 构建启动
docker compose up -d --build

# 6. 查看状态
docker compose ps
```

### 8.7 配置 HTTPS（强烈推荐）

HTTPS 对 Office Add-in 是必须的，也保护用户数据安全。

#### 方式 A：Let's Encrypt 免费证书（推荐）

```bash
# 安装 certbot
apt install -y certbot

# 停止 web 容器（释放 80 端口）
docker compose stop web

# 申请证书
certbot certonly --standalone \
  -d yourdomain.com \
  --agree-tos \
  -m your@email.com

# 复制证书到项目目录
mkdir -p ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
chmod 600 ssl/*.pem

# 启用 SSL 配置
cp docker/docker-compose.ssl.yml docker/docker-compose.override.yml

# 重启
docker compose up -d

# 设置自动续期
echo "0 3 * * * root certbot renew --quiet && docker compose restart web" \
  > /etc/cron.d/certbot-renew
```

验证：浏览器访问 `https://yourdomain.com` 应显示安全锁图标。

#### 方式 B：腾讯云免费证书

1. 控制台 → **SSL 证书** → **申请免费证书**
2. 下载 **Nginx 格式**证书
3. 上传到服务器：

```bash
# 本地执行
scp yourdomain.com_nginx/* root@你的IP:/opt/cpp-ai-teaching/ssl/
```

4. 服务器上执行：
```bash
cd /opt/cpp-ai-teaching
cp docker/docker-compose.ssl.yml docker/docker-compose.override.yml
docker compose up -d
```

### 8.8 更新 Office Add-in 的 URL

配置 HTTPS 后，需要更新 `office-addin/manifest.xml` 中的 URL：

```bash
# 替换所有 localhost 为你的域名
sed -i 's|https://localhost:3000|https://yourdomain.com|g' office-addin/manifest.xml
```

然后在 PowerPoint 中重新加载插件。

### 8.9 部署后验证清单

- [ ] `curl http://yourdomain.com/api/health` → `{"status":"ok"}`
- [ ] 浏览器打开 `http://yourdomain.com` 能看到界面
- [ ] AI 对话能正常流式回复
- [ ] （如配置 HTTPS）`https://yourdomain.com` 显示安全锁
- [ ] （如使用 Office Add-in）PowerPoint 右侧面板正常加载

### 8.10 日常运维

```bash
cd /opt/cpp-ai-teaching

# 查看日志（实时跟踪）
docker compose logs -f

# 只看后端日志
docker compose logs -f server

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 更新代码并重新部署
git pull
docker compose up -d --build

# 更新知识库（无需重建！直接编辑即可）
vim knowledge/bfs.md

# 更新 Prompt 模板（无需重建！直接编辑即可）
vim server/prompts/csp.md
```

### 8.11 监控

```bash
# Docker 容器状态（显示 healthy/unhealthy）
docker compose ps

# 系统资源
htop   # 如果没有: apt install htop

# 磁盘使用
df -h

# Docker 磁盘占用
docker system df
```

腾讯云控制台也提供 CPU、内存、带宽监控：控制台 → 轻量应用服务器 → 实例详情 → 监控。

### 8.12 备份

```bash
# 备份配置和数据
tar czf /tmp/ppt-ai-backup-$(date +%Y%m%d).tar.gz \
  /opt/cpp-ai-teaching/server/.env \
  /opt/cpp-ai-teaching/knowledge/ \
  /opt/cpp-ai-teaching/server/prompts/ \
  /opt/cpp-ai-teaching/ssl/ \
  /opt/cpp-ai-teaching/.env

# 下载备份到本地（在本地执行）
scp root@你的IP:/tmp/ppt-ai-backup-*.tar.gz ./
```

---

# 第三部分：其他部署方式

## 9. PM2 部署

不用 Docker 的方案，适合快速测试。

```bash
# 安装 PM2
npm install -g pm2

# 启动后端
cd /opt/cpp-ai-teaching
pm2 start docker/ecosystem.config.js

# 常用命令
pm2 list              # 查看状态
pm2 logs ppt-ai-server  # 查看日志
pm2 restart ppt-ai-server  # 重启

# 开机自启
pm2 startup
pm2 save
```

前端需要用 Nginx 单独部署（见第 10 节）。

## 10. 手动 Nginx 配置

不用 Docker 时，需要手动安装和配置 Nginx。

```bash
# 安装 Nginx
apt install -y nginx

# 构建前端
cd /opt/cpp-ai-teaching/web
npm install
npm run build

# 复制前端文件
cp -r dist/* /var/www/html/

# 配置 Nginx
cat > /etc/nginx/sites-available/ppt-ai << 'EOF'
server {
    listen 80;
    server_name yourdomain.com;
    client_max_body_size 2m;

    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
EOF

ln -s /etc/nginx/sites-available/ppt-ai /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

# 附录

## 11. 常见问题排查

### ❌ 问题 1：`npm install` 报错 ERESOLVE

```bash
npm install --legacy-peer-deps
```

### ❌ 问题 2：后端报错 `DEEPSEEK_API_KEY is not set`

确认 `server/.env` 文件存在且包含真实的 API Key（不是 `sk-xxx...` 示例值）。

### ❌ 问题 3：前端报错 `Failed to fetch`

后端没启动。确认 `http://localhost:3000/api/health` 能访问。

### ❌ 问题 4：AI 不回复

1. 登录 https://platform.deepseek.com 检查 API Key 有效性和余额
2. 查看后端日志是否有错误

### ❌ 问题 5：Docker 构建失败

```bash
# 确认 Docker 正在运行
docker info

# 如果报权限错误
usermod -aG docker $USER
```

### ❌ 问题 6：端口被占用

```bash
# 查看占用端口的进程
lsof -i :3000   # Linux
netstat -ano | findstr :3000   # Windows

# 修改端口：编辑 server/.env 中的 PORT=3001
```

### ❌ 问题 7：PowerPoint 插件加载失败

- 确认后端正在运行
- 确认 manifest.xml 中的 URL 可以在浏览器访问
- 尝试删除 `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef` 后重启 PowerPoint

### ❌ 问题 8：Docker build OOM（2核2G 服务器）

```bash
# 创建 2GB swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### ❌ 问题 9：SSL 证书续期失败

```bash
# 测试续期
certbot renew --dry-run

# 确认 80 端口可从外网访问
curl http://yourdomain.com
```

### ❌ 问题 10：nginx 报错 "host not found in upstream"

web 容器先于 server 启动。解决：
```bash
docker compose restart web
```

健康检查机制（`depends_on: condition: service_healthy`）会自动处理这个问题。

### ❌ 问题 11：腾讯云控制台无法访问服务器

- 检查实例状态是否为"运行中"
- 检查防火墙规则是否放行了对应端口
- 检查安全组是否绑定到实例

## 12. 命令速查表

### Docker 命令

| 操作 | 命令 |
|------|------|
| 构建并启动 | `docker compose up -d --build` |
| 查看状态 | `docker compose ps` |
| 查看日志 | `docker compose logs -f` |
| 重启 | `docker compose restart` |
| 停止 | `docker compose down` |
| 查看资源 | `docker stats` |
| 清理空间 | `docker system prune -a` |

### 项目维护命令

| 操作 | 命令 |
|------|------|
| 更新代码 | `git pull && docker compose up -d --build` |
| 编辑知识库 | `vim knowledge/bfs.md`（自动生效） |
| 编辑 Prompt | `vim server/prompts/csp.md`（自动生效） |
| 查看 API 日志 | `docker compose logs -f server` |
| 备份 | `tar czf backup.tar.gz server/.env knowledge/ server/prompts/ ssl/` |
| 申请 SSL | `certbot certonly --standalone -d domain.com` |

---

## 13. 代码调试执行环境

### 13.1 当前本地开发：使用本机 g++

代码调试功能在本地开发阶段使用 `server/services/codeRunner.js` 调用本机 `g++`，完成：

- 编译学生提交的 C++17 代码。
- 使用 OJ 题面中的样例输入运行程序并对比输出。
- 返回编译错误、运行错误、超时或样例不通过信息。

开始使用前确认编译器可用：

```bash
g++ --version
```

这套方式只用于本机开发和受控课堂演示。不要把当前直接执行 `g++` 的实现开放到公网或局域网环境，因为学生代码是不可信输入。

### 13.2 正式部署：Docker + 自建 Judge0 CE

生产环境不在业务 `server` 容器中安装或执行 `g++`。代码执行统一迁移到 Docker 部署的 Judge0 CE，由业务后端通过内网 API 提交代码和样例。

目标结构：

```text
浏览器 -> Nginx -> 教学系统 server -> Judge0 CE API/Worker -> 隔离执行环境
```

Judge0 CE 负责 C++ 编译、运行、时间/内存限制和执行结果；教学系统只负责题面样例、调试引导和结果展示。Judge0 不应映射公网端口，应只加入项目的 Docker 内部网络。

部署 Judge0 前，需要准备：

- Docker 与 Docker Compose。
- Judge0 CE、PostgreSQL 和 Redis 容器。
- 业务后端访问 Judge0 的内部地址和认证令牌。
- 时间、内存、输出大小和并发任务限制。

建议在 `server/.env` 中预留以下生产配置，密钥不要提交到仓库：

```env
CODE_RUNNER=judge0
JUDGE0_URL=http://judge0:2358
JUDGE0_AUTH_TOKEN=replace_with_private_token
JUDGE0_CPP_LANGUAGE_ID=54
JUDGE0_TIME_LIMIT=2
JUDGE0_MEMORY_LIMIT=128000
```

后续迁移时，将 `server/services/codeRunner.js` 替换为 Judge0 API 客户端即可，前端和“编译 -> 样例验证 -> 边界盲盒引导”的教学流程保持不变。

### 13.3 Judge0 上线验收清单

- [ ] Judge0 API 仅能从 `server` 容器访问，公网无法直接访问。
- [ ] C++17 编译错误能返回给教学系统。
- [ ] 单样例、多样例和只有输出的样例都能按预期处理。
- [ ] 死循环会在时间限制内终止，超大输出会被限制。
- [ ] 业务容器内没有额外安装 `g++`，不直接执行学生代码。
- [ ] 代码调试模块仍只给编译信息和调试引导，绝不返回完整解题代码。

Judge0 官方文档：<https://ce.judge0.com/docs>

### 当前 API 端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/chat` | POST | AI 对话（SSE） |
| `/api/opener` | POST | 算法速懂卡（SSE） |
| `/api/edge-case` | POST | 边界盲盒（SSE） |
| `/api/edge-case/problem/:id` | GET | 按 4 位题号获取题面和样例 |
| `/api/news` | GET | 获取中文新闻和历史上的今天 |
| `/api/generate-exercise` | POST | 生成练习题（SSE） |
| `/api/generate-script` | POST | 生成讲稿（SSE） |
| `/api/debug-code` | POST | 代码调试（SSE） |

教学工具中的「题目列表」由前端内置题号索引提供，不调用 AI，也不依赖外部数据文件。旧版 `/api/generate-example` 仅作为兼容接口保留，当前主界面不再使用。
