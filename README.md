# C++ AI 教学系统

面向 10～18 岁学生和 C++ 教师的中文 AI 教学工具，覆盖算法理解、题目练习、代码调试和课堂演示。

当前版本包含 Algorithm Coach v1.0：以多轮选项和自由表达引导学生分析题目，维护会话状态，并阻止完整代码、完整伪代码及多轮累计解法泄露。

## 功能

- AI 对话：围绕 C++ 和算法拆解思路，默认只提供伪代码或关键代码片段，不直接返回完整解题代码。
- 算法速懂卡：将算法拆成一句话讲清楚、适用场景、生活比喻、核心动作、算法小故事、C++ 最小模板和易错点。
- 算法可视化：支持递归、二分查找、排序、BFS、DFS、二叉树遍历、双指针、前缀和、差分、打家劫舍、LIS、背包 DP、并查集、最小生成树、最短路、拓扑排序、单调栈/队列和 Trie 树。
- 边界盲盒：根据题目描述或 4 位 OJ 题号生成边界和特殊测试点，并展示测试输入与预期输出。
- 教学工具：算法教练、题目列表、选择题练习和 135 分钟课堂讲稿。
- 生成练习题：围绕课程主题生成 12 道选择题，页面展示 10 道，另外 2 道作为备用；单题有问题时可点击“换一道题”，优先即时替换，备用题用完后再单独请求 AI。
- 算法教练：按题号或题面创建会话，先给关键提示，再根据题目难度逐层展开；不强制每轮提问，只在有必要时用小例子检查理解，并预先准备下一层提示。
- 代码调试：本地开发阶段使用 `g++` 编译验证，先检查编译和样例，再引导学生检查边界条件与算法思路；“进一步提示”会在后台预加载，减少等待，不直接提供完整解题代码。
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
  coach/                算法教练会话、状态机、Schema、安全守卫和 P0 测试
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

COACH_TIMEOUT_MS=45000
COACH_MODEL_RETRIES=0
COACH_MAX_ROUNDS=16
```

如需切换到其他 OpenAI 兼容模型服务，可设置 `AI_PROVIDER`、`AI_BASE_URL`、`AI_MODEL` 和 `AI_API_KEY`。这些变量优先于 `DEEPSEEK_*`；留空时继续使用现有 DeepSeek 配置。

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

推荐部署到腾讯云轻量应用服务器（Lighthouse），使用 Ubuntu 22.04 LTS、2 核 4 GB 配置和 Docker Compose。Lighthouse 控制台只需开放 `22/80/443`，不要开放后端 `3000`、开发端口 `5174/5175` 或 Judge0 `2358`。

一键部署：

```bash
git clone https://github.com/sunshinewyym/cpp-ai-teaching.git /opt/cpp-ai-teaching
cd /opt/cpp-ai-teaching
bash deploy.sh
```

手动启动：

```bash
cp server/.env.example server/.env
# 编辑 server/.env，填写 DeepSeek API Key
printf 'DOMAIN=%s\n' '你的公网IP或域名' > .env
docker compose --env-file .env -f docker/docker-compose.yml up -d --build
```

生产环境由 Nginx 对外提供 `80/443`，后端只在 Docker 内网监听 `3000`。详细的 Lighthouse 防火墙、备案、HTTPS、更新回滚、备份和排障步骤见 [DEPLOY.md](DEPLOY.md)。

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
| `/api/debug-code/hint` | POST | 生成代码调试的进一步提示，SSE |
| `/api/coach/sessions` | POST | 创建算法教练会话 |
| `/api/coach/sessions/:id/problem` | POST | 提交题目并获得首轮诊断 |
| `/api/coach/sessions/:id/turns` | POST | 提交学生表达或选项，进入下一轮 |
| `/api/coach/sessions/:id/prefetch` | POST | 后台预生成下一层算法教练提示 |
| `/api/coach/sessions/:id` | GET | 获取公开会话状态 |
| `/api/coach/sessions/:id` | DELETE | 删除会话与学生证据 |

教学工具中的「题目列表」由前端内置题号索引提供，不调用 AI，也不依赖外部 Markdown 文件。旧版 `/api/generate-example` 仅作为兼容接口保留，当前主界面不再使用。

### 选择题练习说明

点击「生成练习题」后，系统会生成 12 道题，但只展示 10 道，避免学生看到重复或质量不稳定的备用题。每道题右上角都有「换一道题」按钮：

1. 优先使用本次生成时保留的备用题，通常可以立即完成替换；
2. 备用题用完后，系统才会单独请求 AI 生成 1 道新题；
3. 换题只清除被替换题目的作答状态，不影响其他题目的答案和解析；
4. 单题请求会携带当前题目列表，提示模型尽量避免重复题干和考点。

## 算法教练 API 示例

先创建会话：

```bash
curl -X POST http://localhost:3000/api/coach/sessions \
  -H "Content-Type: application/json" \
  -d '{"student":{"grade":6,"known_topics":["循环","数组"]}}'
```

记录返回的 `session.session_id`，然后提交题目：

```bash
curl -X POST http://localhost:3000/api/coach/sessions/SESSION_ID/problem \
  -H "Content-Type: application/json" \
  -d '{"problem":{"title":"两数距离","text":"给定 n 个整数，求最小差值。","constraints":"2 <= n <= 100000","samples":[{"input":"4\n8 1 5 3","output":"2"}]}}'
```

继续一轮对话，可以发送自由表达或上一轮的选项编号：

```bash
curl -X POST http://localhost:3000/api/coach/sessions/SESSION_ID/turns \
  -H "Content-Type: application/json" \
  -d '{"message":"我完全没思路","selected_choice_id":null}'
```

学生界面只展示 `coach_message`、`focus`、`choices` 和简化阶段。内部题目分析、学生证据来源及泄露检查不会发送到学生界面。

## 开发检查

```bash
cd server
npm run test:copy-style
npm run test:debug-hint
npm run test:coach

cd ../web
npm run test:problem-index
npm run build
```

`npm run test:coach` 覆盖全部 P0 场景、10 条红队绕过提示、五轮累计泄露、Schema 修复和状态更新。测试不调用外部模型，可离线重复运行。

## 已知限制

- 算法教练会话保存在当前 Node.js 进程内，后端重启后会清空；多实例生产部署需要接入 Redis 或数据库。
- 当前模型层支持 DeepSeek 及 OpenAI 兼容接口，不包含各厂商的专用 SDK。
- 规则守卫会在模型返回无效 JSON 或泄露过多时改用保守提示，因此极少数轮次的表达会比模型原回答简短。
- Algorithm Coach v1.0 只负责思路训练，不自动判题，也不生成可提交代码。

## 安全约定

- 不要提交 `server/.env`、API Key 或其他密钥。
- AI 生成内容统一经过文案风格约束，使用中文全角标点、规范的中英文间距和标准专有名词。
- AI 对话和代码调试不得直接提供完整解题代码。
- 本地 `g++` 只用于开发和受控课堂环境；生产环境使用隔离的 Judge0 CE。
