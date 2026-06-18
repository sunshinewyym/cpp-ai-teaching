# 🎓 C++ AI 教学系统

PowerPoint 内嵌 AI 助教平台 — 面向 CSP-J / 少儿编程 / 机器人课程

## 🧱 系统架构

```
ppt-ai-system/
├── server/          Node.js 后端（Express + DeepSeek API）
├── web/             Vue3 前端（Vite + SSE 流式输出）
├── office-addin/    PowerPoint TaskPane 插件
├── prompts/         Prompt 工程中心（按课程自动路由）
├── knowledge/       课程知识库（RAG 基础版）
├── docker/          Docker + Nginx + PM2 部署文件
└── README.md
```

## 🚀 快速启动

### 1. 后端

```bash
cd server
cp .env.example .env
# 编辑 .env，填入 DeepSeek API Key
npm install
npm run dev
```

### 2. 前端

```bash
cd web
npm install
npm run dev
```

访问 http://localhost:5173

### 3. Docker 部署

```bash
cd docker
docker-compose up -d
```

### 4. PM2 部署

```bash
npm install -g pm2
pm2 start docker/ecosystem.config.js
```

## 📡 API 列表

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/chat` | POST (SSE) | AI 多轮对话 |
| `/api/opener` | POST (SSE) | 算法脑洞生成 |
| `/api/edge-case` | POST (SSE) | 边界盲盒 |
| `/api/generate-example` | POST (SSE) | 生成例题 |
| `/api/generate-exercise` | POST (SSE) | 生成练习题 |
| `/api/generate-script` | POST (SSE) | 生成讲稿 |
| `/api/debug-code` | POST (SSE) | 代码调试分析 |
| `/api/health` | GET | 健康检查 |

## 🔐 安全

- DeepSeek API Key 仅存于后端 `.env`
- 前端所有请求走 `/api/*` 代理
- 前端禁止直连 AI 服务

## 📦 PPT 中使用

### 推荐方式：插入链接

在 PPT 中插入超链接，指向 AI 面板地址：

```
http://yourdomain.com/panel.html?topic=单调栈
```

- 点击链接后浏览器打开独立 AI 助教页面
- `?topic=` 参数会自动填充课程主题
- 支持所有功能：对话、脑洞、盲盒、例题、讲稿、调试

### 备选方式：Office Add-in

1. 在 PowerPoint 中选择 **插入 → 我的加载项 → 共享文件夹**
2. 指向 `office-addin/manifest.xml`
3. 点击工具栏的 **AI 教学** 按钮打开侧边栏
