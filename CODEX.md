# C++ AI 教学系统 — Codex 开发指南

## 项目概述
面向少儿编程机构的 AI 教学平台，核心能力：AI 对话、算法速懂卡、算法教练、边界盲盒、代码调试、教学工具。

## 技术栈
- **后端**: Node.js + Express + DeepSeek API (deepseek-chat)
- **前端**: Vue3 + Vite + Tailwind CSS
- **部署**: Docker + Nginx + 腾讯云 Lighthouse

## 项目结构
```
server/
  app.js              # Express 主入口，路由注册
  coach/              # 算法教练状态机、Schema、安全守卫与 P0 测试
  routes/             # 6 组路由: chat, opener, edgeCase, teaching, agent, oj
  controllers/        # 6 个控制器
  services/           # deepseek.js, promptRouter.js, knowledge.js, ojService.js
  agent/              # 自主编码 Agent 引擎
  public/panel.html   # PPT 链接的独立 AI 面板
  prompts/            # 8 个课程 Prompt 模板
web/
  src/App.vue         # 主界面（sidebar + 6 个工具 tab）
  src/components/     # Sidebar, ChatPanel, AgentPanel, PromptButtons
  src/utils/api.js    # SSE 流式请求工具
  vite.config.js      # 开发代理到 localhost:3000
knowledge/            # 15 个算法知识库文件
docker/               # Dockerfile + docker-compose + nginx + PM2
```

## 核心约定
1. **API 命名**: `/api/xxx`，SSE 流式用 `POST`，普通用 `GET/POST`
2. **Prompt 自动路由**: `promptRouter.js` 根据课程主题关键词选择对应 prompt 文件
3. **知识库注入**: `knowledge.js` 根据主题加载相关知识，拼接到 system prompt
4. **SSE 协议**: 服务端发 `data: {"content": "..."}` 格式，客户端 `streamPost()` 解析
5. **浅色主题**: 全站使用 `#f8fafc` 背景，`#4f46e5` 强调色，`#d97706` 加粗高亮
6. **AI 面板**: `panel.html` 是自包含的独立页面（无构建依赖），通过 URL 参数 `?topic=xxx` 预填主题

## 常见任务
- **新增 AI 功能**: 在 `routes/` 加路由 → `controllers/` 加控制器（参考 teachingController.js）→ 前端 App.vue 加 tab
- **新增知识库**: 在 `knowledge/` 加 md 文件 → 更新 `knowledge.js` 的 mapping
- **新增 Prompt**: 在 `server/prompts/` 加 md 文件 → 更新 `promptRouter.js` 的 routeTable
- **修改 AI 面板**: 编辑 `server/public/panel.html`（自包含，无构建步骤）

## 运行方式
```bash
# 后端
cd server && cp .env.example .env && npm install && npm run dev

# 前端（开发）
cd web && npm install && npm run dev
```

## API 列表
| 端点 | 功能 |
|------|------|
| `POST /api/chat` | AI 对话（SSE） |
| `POST /api/opener` | 算法脑洞（返回 JSON） |
| `POST /api/edge-case` | 边界盲盒（SSE） |
| `POST /api/generate-example` | 生成例题（SSE） |
| `POST /api/generate-exercise` | 生成练习题（SSE） |
| `POST /api/generate-script` | 生成讲稿（SSE） |
| `POST /api/debug-code` | 代码调试（SSE） |
| `POST /api/agent/execute` | Agent 自主执行（SSE） |
| `GET /api/health` | 健康检查 |
| `GET /api/oj/problems` | 内置题目列表 |
| `GET /api/oj/problem/:id` | 抓取 OJ 题目 |
| `POST /api/oj/submit` | 编译 + 样例 + AI 分析（SSE） |
| `POST /api/oj/hint` | 思路提示（SSE） |
| `POST /api/oj/debug-hint` | 调试引导（SSE） |
| `POST /api/coach/sessions` | 创建算法教练会话 |
| `POST /api/coach/sessions/:id/problem` | 提交题目并获取首轮诊断 |
| `POST /api/coach/sessions/:id/turns` | 提交学生表达或选项 |
| `GET /api/coach/sessions/:id` | 获取公开会话状态 |
| `DELETE /api/coach/sessions/:id` | 删除算法教练会话 |
