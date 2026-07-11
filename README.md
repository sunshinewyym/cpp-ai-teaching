# C++ AI 教学系统

面向 10～18 岁学生和 C++ 教师的中文 AI 教学工具，覆盖算法理解、题目练习、代码调试和课堂演示。

## 功能

- AI 对话：围绕 C++ 和算法拆解思路，默认只提供伪代码或关键代码片段，不直接返回完整解题代码。
- 算法速懂卡：将算法拆成一句话讲清楚、适用场景、生活比喻、核心动作、算法小故事、C++ 最小模板和易错点。
- 算法可视化：支持递归、二分查找、排序、BFS、DFS、二叉树遍历、双指针、前缀和、差分、打家劫舍、LIS、背包 DP、并查集、最小生成树、最短路、拓扑排序、单调栈/队列和 Trie 树。
- 边界盲盒：根据题目描述或 4 位 OJ 题号生成边界和特殊测试点，并展示测试输入与预期输出。
- 教学工具：题目列表、10 道选择题练习和 135 分钟课堂讲稿。
- 代码调试：本地开发阶段使用 `g++` 编译验证，先检查编译和样例，再引导学生检查边界条件与算法思路。
- CSP-J/S 练习：选择题、阅读程序题和完善程序题，按年份组卷，整套提交后统一判分和解析。
- 独立教学面板：后端提供 `server/public/panel.html`，可通过链接嵌入 PPT 或课堂展示。

## 技术栈

- 前端：Vue 3、Vite、Marked、Highlight.js
- 后端：Node.js、Express、DeepSeek API
- 通信：JSON API 与 SSE 流式输出
- 部署：Docker Compose、Nginx
- 代码执行规划：本地使用 `g++`；生产环境迁移到 Docker + 自建 Judge0 CE

## 项目结构

```text
server/                 Express 后端和 AI 接口
  controllers/          对话、算法卡、边界盲盒、教学工具和新闻控制器
  routes/               API 路由
  prompts/              AI 教学提示词
  services/             DeepSeek、知识库、代码执行和文案风格约束
  public/panel.html     可嵌入 PPT 的独立教学面板
web/                    Vue 前端
  src/components/       主要页面组件
  src/data/             CSP 题库和题号索引
  src/utils/             SSE 请求和算法可视化逻辑
knowledge/              算法知识库
docker/                 Docker Compose、Dockerfile 和 Nginx 配置
scripts/                CSP 题库导入脚本
```

## 本地运行

### 1. 配置后端

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

在 `server/.env` 中填写：

```env
DEEPSEEK_API_KEY=你的_API_Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
PORT=3000
```

Windows PowerShell 可以使用：

```powershell
Copy-Item .env.example .env
```

### 2. 启动前端

```bash
cd web
npm install
npm run dev
```

前端默认运行在 `http://localhost:5174`，并将 `/api` 请求代理到 `http://localhost:3000`。

### 3. 局域网访问

```bash
cd web
npm run dev -- --host 0.0.0.0
```

同一局域网设备访问：

```text
http://你的电脑 IP:5174
```

Windows 防火墙需要允许 Node.js 或开放 TCP `5174` 端口；后端仍需保持运行。

## 生产部署

推荐使用 Docker Compose：

```bash
cp server/.env.example server/.env
# 编辑 server/.env，填写 DeepSeek API Key
docker compose -f docker/docker-compose.yml up -d --build
```

生产环境由 Nginx 对外提供 `80/443` 端口，后端只在 Docker 内部网络监听 `3000`。详细步骤、域名、HTTPS、防火墙、备份和运维命令见 [DEPLOY.md](DEPLOY.md)。

代码调试的生产执行环境暂未直接集成 Judge0。当前 `server/services/codeRunner.js` 使用本机 `g++`，不应直接暴露到公网。正式部署时使用 Docker + 自建 Judge0 CE，并让业务后端通过 Docker 内网调用 Judge0。

## 主要 API

| 接口 | 方法 | 用途 |
| --- | --- | --- |
| `/api/health` | GET | 健康检查 |
| `/api/chat` | POST | AI 对话，SSE |
| `/api/opener` | POST | 生成算法速懂卡 |
| `/api/edge-case` | POST | 生成边界测试点，SSE |
| `/api/edge-case/problem/:id` | GET | 按 4 位题号获取题面和样例 |
| `/api/news` | GET | 获取中文新闻和历史上的今天 |
| `/api/generate-exercise` | POST | 生成选择题练习，SSE |
| `/api/generate-script` | POST | 生成课堂讲稿，SSE |
| `/api/debug-code` | POST | 编译、样例验证和调试引导，SSE |

教学工具中的「题目列表」由前端内置题号索引提供，不调用 AI，也不依赖外部 Markdown 文件。旧版 `/api/generate-example` 仅作为兼容接口保留，当前主界面不再使用。

## 开发检查

```bash
cd server
npm run test:copy-style

cd ../web
npm run test:problem-index
npm run build
```

## 安全约定

- 不要提交 `server/.env`、API Key 或其他密钥。
- AI 生成内容统一经过文案风格约束，使用中文全角标点、规范的中英文间距和标准专有名词。
- AI 对话和代码调试不得直接提供完整解题代码。
- 本地 `g++` 只用于开发和受控课堂环境；生产环境使用隔离的 Judge0 CE。
