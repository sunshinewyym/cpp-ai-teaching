#!/usr/bin/env bash
# C++ AI 教学系统 - 腾讯云 Lighthouse 一键部署脚本
# 适用系统：Ubuntu 22.04 LTS

set -Eeuo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "\n${CYAN}--- $1 ---${NC}"; }

on_error() {
    log_error "部署在第 ${1} 行失败。请根据上方错误信息排查。"
}
trap 'on_error "$LINENO"' ERR

if [ "$(id -u)" -ne 0 ]; then
    log_error "请使用 root 用户运行：sudo bash deploy.sh"
    exit 1
fi

PROJECT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
cd "$PROJECT_DIR"

if [ ! -f docker/docker-compose.yml ] || [ ! -f server/.env.example ]; then
    log_error "当前目录不是完整的 cpp-ai-teaching 仓库：$PROJECT_DIR"
    exit 1
fi

compose() {
    docker compose --env-file "$PROJECT_DIR/.env" \
        -f "$PROJECT_DIR/docker/docker-compose.yml" "$@"
}

compose_ssl() {
    docker compose --env-file "$PROJECT_DIR/.env" \
        -f "$PROJECT_DIR/docker/docker-compose.yml" \
        -f "$PROJECT_DIR/docker/docker-compose.ssl.yml" "$@"
}

log_step "1/7 检查 Lighthouse 环境"

if ! grep -q '^ID=ubuntu' /etc/os-release 2>/dev/null; then
    log_warn "当前系统不是 Ubuntu，自动安装命令可能需要调整。"
fi

ARCH=$(dpkg --print-architecture)
OS_NAME=$(sed -n 's/^PRETTY_NAME="\?\(.*\)"\?$/\1/p' /etc/os-release)
MEM_KB=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
MEM_MB=$((MEM_KB / 1024))

log_info "系统：${OS_NAME:-unknown}"
log_info "架构：$ARCH"
log_info "内存：${MEM_MB} MB"

if [ "$MEM_MB" -lt 1800 ] && ! swapon --show | grep -q '^/swapfile'; then
    log_warn "内存少于 2 GB，正在创建 2 GB Swap。"
    if [ ! -f /swapfile ]; then
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
    fi
    swapon /swapfile
    grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log_info "Swap 已启用。"
fi

log_step "2/7 安装 Docker 与基础工具"

apt-get update
apt-get install -y ca-certificates curl git gnupg lsb-release ufw

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log_info "已安装 $(docker --version)"
    log_info "已安装 $(docker compose version)"
else
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
    echo "deb [arch=$ARCH signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $CODENAME stable" \
        > /etc/apt/sources.list.d/docker.list

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    log_info "Docker 安装完成。"
fi

log_step "3/7 配置主机防火墙"

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log_info "UFW 已开放 22、80、443 端口。"
log_warn "还需要在腾讯云 Lighthouse 控制台防火墙中开放 80 和 443。"
log_warn "不要对公网开放 3000、5174、5175 或 2358。"

log_step "4/7 配置模型与访问地址"

if [ ! -f server/.env ]; then
    cp server/.env.example server/.env
fi

CURRENT_KEY=$(awk -F= '/^DEEPSEEK_API_KEY=/{sub(/^[^=]*=/, ""); print; exit}' server/.env)
if [ -z "$CURRENT_KEY" ] || echo "$CURRENT_KEY" | grep -Eq '^sk-x+$'; then
    read -r -s -p "请输入 DeepSeek API Key：" API_KEY
    echo ""
    if [ -z "$API_KEY" ]; then
        log_error "DeepSeek API Key 不能为空。"
        exit 1
    fi

    if grep -q '^DEEPSEEK_API_KEY=' server/.env; then
        sed -i "s|^DEEPSEEK_API_KEY=.*|DEEPSEEK_API_KEY=$API_KEY|" server/.env
    else
        printf '\nDEEPSEEK_API_KEY=%s\n' "$API_KEY" >> server/.env
    fi
    unset API_KEY
    log_info "模型密钥已写入 server/.env。"
else
    log_info "server/.env 已配置，保留现有模型密钥。"
fi
chmod 600 server/.env

PUBLIC_IP=$(curl -fsS --connect-timeout 5 https://ifconfig.me 2>/dev/null || true)
read -r -p "请输入访问域名；没有域名直接回车使用公网 IP：" DOMAIN_INPUT

HAS_DOMAIN=false
if [ -n "$DOMAIN_INPUT" ]; then
    DOMAIN_NAME=${DOMAIN_INPUT#http://}
    DOMAIN_NAME=${DOMAIN_NAME#https://}
    DOMAIN_NAME=${DOMAIN_NAME%%/*}
    if echo "$DOMAIN_NAME" | grep -Eq '^[A-Za-z0-9.-]+$' \
        && ! echo "$DOMAIN_NAME" | grep -Eq '^[0-9]+(\.[0-9]+){3}$'; then
        HAS_DOMAIN=true
    fi
else
    DOMAIN_NAME=${PUBLIC_IP:-localhost}
fi

printf 'DOMAIN=%s\n' "$DOMAIN_NAME" > .env
chmod 600 .env
log_info "访问地址已配置为：$DOMAIN_NAME"

log_step "5/7 构建并启动容器"

compose config --quiet
compose up -d --build

log_info "等待后端健康检查，最长 90 秒。"
SERVER_HEALTH=unknown
for _ in $(seq 1 18); do
    SERVER_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' ppt-ai-server 2>/dev/null || echo unknown)
    if [ "$SERVER_HEALTH" = healthy ]; then
        break
    fi
    sleep 5
done

compose ps
if [ "$SERVER_HEALTH" != healthy ]; then
    log_error "后端健康检查失败，最近日志如下："
    compose logs --tail=80 server
    exit 1
fi

API_HEALTH=$(curl -fsS --connect-timeout 8 http://127.0.0.1/api/health 2>/dev/null || true)
if echo "$API_HEALTH" | grep -q '"status":"ok"'; then
    log_info "API 健康检查通过。"
else
    log_error "Nginx 无法访问 API，请执行 Compose 日志命令排查。"
    compose logs --tail=80 web server
    exit 1
fi

HTTP_STATUS=$(curl -sS --connect-timeout 8 -o /dev/null -w '%{http_code}' http://127.0.0.1/ || true)
if [ "$HTTP_STATUS" = 200 ]; then
    log_info "前端页面检查通过。"
else
    log_error "前端页面返回 HTTP ${HTTP_STATUS:-000}。"
    compose logs --tail=80 web
    exit 1
fi

log_step "6/7 配置 HTTPS（可选）"

SSL_ENABLED=false
if [ "$HAS_DOMAIN" = true ]; then
    read -r -p "是否为 $DOMAIN_NAME 申请 Let's Encrypt 证书？[y/N]：" SETUP_SSL
    if [ "$SETUP_SSL" = y ] || [ "$SETUP_SSL" = Y ]; then
        read -r -p "请输入证书通知邮箱：" SSL_EMAIL
        if [ -z "$SSL_EMAIL" ]; then
            log_error "申请证书需要有效邮箱。"
            exit 1
        fi

        apt-get install -y certbot
        compose stop web

        if certbot certonly --standalone \
            -d "$DOMAIN_NAME" \
            --agree-tos \
            --no-eff-email \
            --non-interactive \
            -m "$SSL_EMAIL"; then
            mkdir -p ssl
            install -m 600 "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ssl/fullchain.pem
            install -m 600 "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" ssl/privkey.pem

            HOOK=/etc/letsencrypt/renewal-hooks/deploy/cpp-ai-teaching
            mkdir -p "$(dirname "$HOOK")"
            cat > "$HOOK" <<EOF
#!/bin/sh
set -eu
install -m 600 "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" "$PROJECT_DIR/ssl/fullchain.pem"
install -m 600 "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" "$PROJECT_DIR/ssl/privkey.pem"
cd "$PROJECT_DIR"
docker compose --env-file .env -f docker/docker-compose.yml -f docker/docker-compose.ssl.yml restart web
EOF
            chmod 750 "$HOOK"
            systemctl enable --now certbot.timer 2>/dev/null || true

            compose_ssl config --quiet
            compose_ssl up -d
            SSL_ENABLED=true
            log_info "HTTPS 已启用，证书续期后会自动更新容器内证书。"
        else
            log_error "证书申请失败。请检查域名解析和 80 端口后重试。"
            compose up -d web
            exit 1
        fi
    fi
else
    log_info "当前使用公网 IP，不申请 HTTPS 证书。"
fi

log_step "7/7 完成部署"

echo ""
if [ "$SSL_ENABLED" = true ]; then
    echo -e "访问地址：${CYAN}https://$DOMAIN_NAME${NC}"
else
    echo -e "访问地址：${CYAN}http://$DOMAIN_NAME${NC}"
fi
echo ""
echo "常用命令："
echo "  查看状态：cd $PROJECT_DIR && docker compose --env-file .env -f docker/docker-compose.yml ps"
echo "  查看日志：cd $PROJECT_DIR && docker compose --env-file .env -f docker/docker-compose.yml logs -f"
echo "  更新版本：cd $PROJECT_DIR && git pull --ff-only && docker compose --env-file .env -f docker/docker-compose.yml up -d --build"
echo "  停止服务：cd $PROJECT_DIR && docker compose --env-file .env -f docker/docker-compose.yml down"
if [ "$SSL_ENABLED" = true ]; then
    echo "  HTTPS 操作需在命令中同时添加：-f docker/docker-compose.ssl.yml"
fi
echo ""
log_warn "请再次确认 Lighthouse 控制台防火墙只开放必要端口。"
