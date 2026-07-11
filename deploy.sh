#!/bin/bash
# ============================================================
# C++ AI 教学系统 — 腾讯云轻量应用服务器一键部署脚本
# 适用系统：Ubuntu 22.04 LTS
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

# ============================================================
# 1. 环境检查
# ============================================================
log_step "1/8 环境检查"

if [ "$(id -u)" -ne 0 ]; then
    log_error "请使用 root 用户运行此脚本"
    log_error "执行: sudo bash deploy.sh"
    exit 1
fi

if ! grep -q "Ubuntu" /etc/os-release 2>/dev/null; then
    log_warn "检测到非 Ubuntu 系统，脚本可能需要调整"
fi

ARCH=$(dpkg --print-architecture)
log_info "系统架构: $ARCH"
log_info "操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '"')"

# 检查内存（2G 以下需要 swap）
MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
MEM_MB=$((MEM_KB / 1024))
log_info "内存: ${MEM_MB}MB"

if [ "$MEM_MB" -lt 1800 ]; then
    log_warn "内存不足 2GB，将创建 2GB swap 分区..."
    if [ ! -f /swapfile ]; then
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        log_info "swap 创建完成"
    else
        log_info "swap 文件已存在，跳过"
    fi
fi

# ============================================================
# 2. 安装 Docker
# ============================================================
log_step "2/8 安装 Docker"

if command -v docker &>/dev/null; then
    log_info "Docker 已安装: $(docker --version)"
else
    log_info "正在安装 Docker..."
    apt update
    apt install -y ca-certificates curl gnupg

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$ARCH signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list

    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    systemctl enable docker
    systemctl start docker
    log_info "Docker 安装完成: $(docker --version)"
fi

# ============================================================
# 3. 配置防火墙
# ============================================================
log_step "3/8 配置防火墙"

if command -v ufw &>/dev/null; then
    ufw allow 22/tcp   # SSH
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS
    ufw --force enable
    log_info "ufw 防火墙已配置（开放 22/80/443）"
else
    log_warn "未找到 ufw，请手动确认防火墙规则"
fi

log_warn "请确认腾讯云控制台防火墙也已开放 80 和 443 端口！"
log_warn "路径: 控制台 → 轻量应用服务器 → 实例详情 → 防火墙 → 添加规则"

# ============================================================
# 4. 获取代码
# ============================================================
log_step "4/8 获取项目代码"

INSTALL_DIR="/opt/cpp-ai-teaching"

if [ -d "$INSTALL_DIR" ]; then
    log_info "项目目录已存在: $INSTALL_DIR"
    cd "$INSTALL_DIR"
    if [ -d ".git" ]; then
        log_info "拉取最新代码..."
        git pull
    fi
else
    read -p "请输入 Git 仓库地址（留空则跳过，手动上传代码）: " GIT_URL
    if [ -n "$GIT_URL" ]; then
        git clone "$GIT_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
        log_info "代码克隆完成"
    else
        log_warn "请手动将项目代码上传到 $INSTALL_DIR"
        log_warn "然后重新运行此脚本"
        mkdir -p "$INSTALL_DIR"
        exit 1
    fi
fi

# ============================================================
# 5. 配置环境变量
# ============================================================
log_step "5/8 配置环境变量"

if [ -f "server/.env" ]; then
    log_info "server/.env 已存在，跳过配置"
else
    cp server/.env.example server/.env
    read -p "请输入 DeepSeek API Key (sk-xxx): " API_KEY
    if [ -z "$API_KEY" ]; then
        log_error "API Key 不能为空！请稍后手动编辑 server/.env"
        exit 1
    fi
    sed -i "s|sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|$API_KEY|" server/.env
    log_info "API Key 已配置"
fi

# 配置域名
read -p "请输入域名（如 yourdomain.com，留空则使用服务器公网 IP）: " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
    DOMAIN_NAME=$(curl -s --connect-timeout 3 ifconfig.me 2>/dev/null || echo "localhost")
    log_info "未配置域名，使用公网 IP: $DOMAIN_NAME"
fi

# 创建 .env 文件给 docker-compose 使用
cat > .env << EOF
DOMAIN=$DOMAIN_NAME
EOF
log_info "域名配置: $DOMAIN_NAME"

# ============================================================
# 6. 构建并启动
# ============================================================
log_step "6/8 构建并启动 Docker 容器"

log_info "正在构建镜像（首次约 2-5 分钟）..."
docker compose up -d --build

log_info "等待服务启动..."
sleep 10

# 等待 healthcheck
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    SERVER_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' ppt-ai-server 2>/dev/null || echo "unknown")
    if [ "$SERVER_HEALTH" = "healthy" ]; then
        break
    fi
    sleep 5
    WAITED=$((WAITED + 5))
    echo -n "."
done
echo ""

# ============================================================
# 7. 验证部署
# ============================================================
log_step "7/8 验证部署"

docker compose ps

HEALTH=$(curl -s --connect-timeout 5 http://localhost/api/health 2>/dev/null || echo "failed")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    log_info "✅ API 健康检查通过"
else
    log_warn "API 健康检查未通过，请查看日志: docker compose logs server"
fi

FRONTEND=$(curl -s --connect-timeout 5 -o /dev/null -w '%{http_code}' http://localhost/ 2>/dev/null || echo "000")
if [ "$FRONTEND" = "200" ]; then
    log_info "✅ 前端页面可访问"
else
    log_warn "前端页面访问异常 (HTTP $FRONTEND)，请查看日志: docker compose logs web"
fi

# ============================================================
# 8. SSL 证书（可选）
# ============================================================
log_step "8/8 SSL 证书配置（可选）"

if [ "$DOMAIN_NAME" != "localhost" ] && [ "$DOMAIN_NAME" != "" ]; then
    read -p "是否配置 HTTPS？(y/N): " SETUP_SSL
    if [ "$SETUP_SSL" = "y" ] || [ "$SETUP_SSL" = "Y" ]; then
        log_info "正在安装 certbot..."
        apt install -y certbot

        # 停止 nginx 以释放 80 端口
        docker compose stop web
        sleep 3

        read -p "请输入邮箱（用于 Let's Encrypt 证书通知）: " SSL_EMAIL
        SSL_EMAIL=${SSL_EMAIL:-admin@$DOMAIN_NAME}

        log_info "正在申请 SSL 证书..."
        certbot certonly --standalone \
            -d "$DOMAIN_NAME" \
            --agree-tos \
            -m "$SSL_EMAIL" \
            --non-interactive

        # 创建 SSL 目录并链接证书
        mkdir -p ssl
        cp /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem ssl/
        cp /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem ssl/
        chmod 600 ssl/*.pem

        # 使用 SSL 配置重启
        cp docker/docker-compose.ssl.yml docker/docker-compose.override.yml
        docker compose up -d

        # 设置自动续期
        echo "0 3 * * * root certbot renew --quiet && docker compose restart web" > /etc/cron.d/certbot-renew
        log_info "✅ SSL 证书配置完成，已设置自动续期"
    fi
else
    log_info "跳过 SSL 配置（未配置域名）"
fi

# ============================================================
# 完成
# ============================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🎉 部署完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  访问地址: ${CYAN}http://$DOMAIN_NAME${NC}"
if [ -f "docker/docker-compose.override.yml" ]; then
    echo -e "  HTTPS:    ${CYAN}https://$DOMAIN_NAME${NC}"
fi
echo ""
echo -e "  常用命令:"
echo -e "    查看日志: ${CYAN}cd $INSTALL_DIR && docker compose logs -f${NC}"
echo -e "    重启服务: ${CYAN}cd $INSTALL_DIR && docker compose restart${NC}"
echo -e "    停止服务: ${CYAN}cd $INSTALL_DIR && docker compose down${NC}"
echo -e "    更新代码: ${CYAN}cd $INSTALL_DIR && git pull && docker compose up -d --build${NC}"
echo ""
echo -e "  更新知识库（无需重建）:"
echo -e "    编辑 ${CYAN}$INSTALL_DIR/knowledge/*.md${NC}"
echo -e "    编辑 ${CYAN}$INSTALL_DIR/server/prompts/*.md${NC}"
echo ""
echo -e "${YELLOW}  ⚠️ 请确认腾讯云控制台防火墙已开放 80/443 端口${NC}"
echo -e "${YELLOW}  ⚠️ 如配置了域名，请确认 DNS A 记录已指向 $DOMAIN_NAME${NC}"
echo ""
