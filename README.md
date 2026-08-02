# C++ AI 教学系统

面向 10～18 岁学生和 C++ 教师的中文 AI 教学工具，覆盖算法理解、题目练习、代码调试、课堂演示和课后反馈。

系统内置账号体系，分为管理员、老师、学生三种角色，老师只能看到自己名下的学生，学生数据互相隔离。当前版本包含 Algorithm Coach v1.0：以多轮选项和自由表达引导学生分析题目，维护会话状态，并阻止完整代码、完整伪代码及多轮累计解法泄露。

## 功能

### 学生端

- AI 对话：围绕 C++ 和算法拆解思路，默认只提供伪代码或关键代码片段，不直接返回完整解题代码。
- 语法可视化：把变量、循环、数组等基础语法做成可交互的动画演示，帮助初学者理解每一行代码的执行过程。
- 算法速懂卡：将算法拆成一句话讲清楚、适用场景、生活比喻、核心动作、算法小故事、C++ 最小模板和易错点，支持一键导出图片。
- 算法可视化：支持递归、二分查找、排序、BFS、DFS、二叉树遍历、双指针、前缀和、差分、打家劫舍、LIS、背包 DP、并查集、最小生成树、最短路、拓扑排序、单调栈/队列和 Trie 树。
- CSP-J/S 练习：选择题、阅读程序题和完善程序题，按年份组卷，整套提交后统一判分和解析，成绩自动存入个人记录。
- 我的集训：查看教师按天布置的课程知识点、历年真题和东方博宜 OJ 题目链接；历年真题逐道提交，教师按题统一开放答案与解析。
- 学习排行榜：查看刷题数和正确率排名，显示学生全名；CSP-J/S 练习与十天集训真题按小题统一统计，跨模块重复题只记录第一次有效提交，答题用时明显异常的数据自动排除。
- 我的记录：查看自己历次 CSP 练习的成绩、用时和提交时间。
- 错题集：自动收集做错的选择题，支持按题型筛选、回顾解析和重新作答。

### 老师端

- 教学工具：算法教练、题目列表、选择题练习和 135 分钟课堂讲稿。
- 课后反馈：填写上课日期（月视图日历）、主题、题号（可选）和课堂表现，一键生成面向家长的课评；每位老师可自定义课评风格规则；生成的课评可按学生保存为历史记录，并支持基于全部课评的 AI 阶段表现分析。
- 学生记录：查看名下学生的练习记录、成绩统计，并可对单个学生发起 AI 学情分析。
- 学习排行榜：查看名下学生的刷题数与正确率排名，支持按 CSP 组别、时间范围和班级筛选。
- 学生管理：添加（单个/批量）、删除、重置密码、移交给其他老师。
- 集训课程（管理员分配后可见）：查看和修改高阶组或进阶组十天集训的每日知识点、教学流程、GESP/CSP-J/S 历年选择/阅读/完善程序真题，以及通关线模板题和提高线迁移题；同一知识点共用课堂与真题，按学生掌握程度设置不同完成要求；可按学生或班级布置每天课程，查看逐题提交进度，并在全员提交后按题开放答案解析；东方博宜 OJ 题号仅作为外部提交链接。
- 教师管理（仅管理员）：添加、删除老师、重置密码，以及分配或取消分配集训课程。

### 通用

- 边界盲盒：根据题目描述或 4 位 OJ 题号生成边界和特殊测试点，并展示测试输入与预期输出。
- 代码调试：先进行受限的本地/隔离容器编译和样例验证，再由学生主动选择是否生成 AI 调试分析；本地结果与 AI 讲解分离，AI 不可用时仍保留验证结果，并支持取消、超时、重试和明确的失败状态，不直接提供完整解题代码。
- 独立教学面板：后端提供 `server/public/panel.html`，可通过链接嵌入 PPT 或课堂展示。

## 角色与数据隔离

- 管理员（admin）：拥有老师的全部功能，并可管理老师账号、查看全平台所有学生的数据。
- 老师：可管理自己创建的学生（`created_by` 关联），查看他们的练习记录和课评；不同老师之间的学生数据互相不可见。集训课程由管理员按账号分配，教师只能查看和修改自己的课程副本。
- 学生：登录后使用各项学习工具，练习成绩和错题归属自己的账号。

首次启动时若没有任何老师账号，系统会自动创建默认管理员：`admin / admin123`，请登录后尽快修改密码。

## 技术栈

- 前端：Vue 3、Vite、Marked、Highlight.js、html2canvas
- 后端：Node.js（24+）、Express、DeepSeek API
- 数据库：Node.js 内置 `node:sqlite`（无需编译原生模块）、bcryptjs、jsonwebtoken（JWT）
- 通信：JSON API 与 SSE 流式输出
- 部署：Docker Compose、Nginx
- 代码执行：开发环境可使用本机 `g++`；生产 Docker Compose 默认使用无网络、非 root、带 CPU/内存/进程限制的独立 runner 容器。

## 项目结构

```text
server/                 Express 后端和 AI 接口
  app.js                入口，注册各路由
  db.js                 SQLite 初始化、建表、字段迁移与默认管理员
  middleware/auth.js    JWT 鉴权与老师/管理员权限中间件
  coach/                算法教练会话、状态机、Schema、安全守卫和 P0 测试
  training/             高阶组/进阶组十天集训模板、题库和权限流程测试
  controllers/          对话、算法卡、边界盲盒、教学工具和新闻控制器
  runner/               生产代码执行 runner（通过 Unix socket 与后端通信）
  routes/               API 路由（含 auth、practice、feedback）
  prompts/              AI 教学提示词
  services/             DeepSeek、知识库、代码执行和文案风格约束
  data/app.db           SQLite 数据文件（运行时自动创建，勿提交）
  public/panel.html     可嵌入 PPT 的独立教学面板
web/                    Vue 前端
  src/components/       主要页面组件（登录、侧边栏、各功能模块）
  src/data/             CSP 题库和题号索引
  src/utils/            SSE 请求、鉴权工具和算法可视化逻辑
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

# 代码调试（开发环境可将 runner 改为 local）
CODE_RUNNER_MODE=local
DEBUG_AI_MAX_TOKENS=1600
DEBUG_AI_THINKING=disabled
# 留空时沿用 AI_MODEL/DEEPSEEK_MODEL
DEBUG_AI_MODEL=
```

如需切换到其他 OpenAI 兼容模型服务，可设置 `AI_PROVIDER`、`AI_BASE_URL`、`AI_MODEL` 和 `AI_API_KEY`。通用的 `AI_*` 配置优先于对应服务商的配置；留空时使用当前服务商的配置。

切换到 MiMo 时，在 `server/.env` 中填写：

```env
AI_PROVIDER=mimo
MIMO_API_KEY=你的_MiMo_API_Key
MIMO_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5

# 保持为空，使用上面的 MIMO_API_KEY
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=
```

Windows PowerShell 可以使用：

```powershell
Copy-Item .env.example .env
```

数据库文件会在首次启动时自动创建在 `server/data/app.db`（WAL 模式），无需手动建表；旧版本升级时缺少的字段会自动迁移。

### 2. 启动前端

```bash
cd web
npm install
npm run dev
```

前端默认运行在 `http://localhost:5174`，并将 `/api` 请求代理到 `http://localhost:3000`。

### 3. 登录

打开前端页面后使用默认管理员账号登录：`admin / admin123`。管理员可在「教师管理」中创建老师账号，老师登录后可在「学生管理」中创建学生账号（默认密码 `123456`）。

### 4. 局域网访问

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

推荐部署到腾讯云轻量应用服务器（Lighthouse），使用 Ubuntu 22.04 LTS、2 核 4 GB 配置和 Docker Compose。Lighthouse 控制台只需开放 `22/80/443`，不要开放后端 `3000`、开发端口 `5174/5175` 或代码 runner。

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

代码调试的生产执行环境已集成独立 runner 容器：后端通过 Unix socket 提交任务，runner 无网络、非 root 运行，并由 Compose 限制 CPU、内存、进程数和临时目录。开发环境若不启动 runner，可在 `server/.env` 中设置 `CODE_RUNNER_MODE=local`，仅用于受控环境。

## 主要 API

### 账号与权限

| 接口 | 方法 | 用途 |
| --- | --- | --- |
| `/api/auth/login` | POST | 登录，返回 JWT |
| `/api/auth/change-password` | POST | 修改自己的密码 |
| `/api/auth/teachers` | POST / GET | 创建 / 列出老师（管理员） |
| `/api/auth/teachers/:id` | DELETE | 删除老师及其名下学生（管理员） |
| `/api/auth/teachers/:id/reset-password` | POST | 重置老师密码（管理员） |
| `/api/auth/teachers/search` | GET | 按姓名/用户名搜索老师（移交学生用） |
| `/api/auth/students` | POST / GET | 创建 / 列出学生（老师，数据隔离） |
| `/api/auth/students/batch` | POST | 批量创建学生（老师） |
| `/api/auth/students/:id` | DELETE | 删除学生及其练习记录（老师） |
| `/api/auth/students/:id/reset-password` | POST | 重置学生密码（老师） |
| `/api/auth/students/:id/transfer` | POST | 把学生移交给其他老师 |

### 集训课程

| 接口 | 方法 | 用途 |
| --- | --- | --- |
| `/api/training-courses/access` | GET | 查询当前教师是否获分配集训课程 |
| `/api/training-courses/me` | GET / PUT | 读取 / 修改当前教师自己的课程副本 |
| `/api/training-courses/days/:day/assignments` | GET / POST | 查看或保存某天课程的学生名单与逐题进度 |
| `/api/training-courses/days/:day/questions/:questionId/release` | POST | 全员提交后开放单道题的答案解析 |
| `/api/training-courses/student` | GET | 学生读取教师已布置的课程 |
| `/api/training-courses/student/courses/:courseId/days/:day/questions/:questionId/start` | POST | 服务端记录学生开始作答单道集训真题的时间 |
| `/api/training-courses/student/courses/:courseId/days/:day/questions/:questionId/submit` | POST | 学生提交单道集训真题 |
| `/api/training-courses/assign/:teacherId` | POST | 给指定教师分配或恢复课程（管理员，可传 `variant: "advanced"` 或 `"progress"`） |
| `/api/training-courses/assign/:teacherId` | DELETE | 取消教师的课程权限并保留内容（管理员） |

### 练习与记录

| 接口 | 方法 | 用途 |
| --- | --- | --- |
| `/api/practice/submit` | POST | 提交 CSP 练习成绩 |
| `/api/practice/my-history` | GET | 我的练习历史（学生） |
| `/api/practice/all-records` | GET | 全部学生记录（老师，数据隔离） |
| `/api/practice/student/:id` | GET | 单个学生的记录（老师） |
| `/api/practice/stats` | GET | 成绩统计（老师） |
| `/api/practice/analyze` | POST | AI 学情分析，SSE |
| `/api/leaderboard` | GET | CSP-J/S 练习与集训真题去重后的刷题数、正确率排行榜 |

### 课后反馈

| 接口 | 方法 | 用途 |
| --- | --- | --- |
| `/api/feedback/style` | GET / PUT | 读取 / 保存当前老师的课评风格规则 |
| `/api/feedback/generate` | POST | 生成课评，SSE |
| `/api/feedback/save` | POST | 把课评保存为学生的历史记录 |
| `/api/feedback/history` | GET | 获取某学生的历史课评 |
| `/api/feedback/history/:id` | DELETE | 删除一条历史课评 |
| `/api/feedback/analyze-student` | POST | 基于全部课评的阶段表现分析，SSE |

### AI 教学工具

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
| `/api/debug-code/verify` | POST | 受限编译和样例执行，JSON；不调用 AI |
| `/api/debug-code/analyze` | POST | 在本地验证完成后按需生成一次 AI 调试分析，JSON；失败时保留本地结果 |
| `/api/debug-code/explain` | POST | 兼容旧客户端的调试分析接口，SSE |
| `/api/debug-code/hint` | POST | 兼容旧客户端的调试提示接口，SSE |
| `/api/coach/sessions` | POST | 创建算法教练会话 |
| `/api/coach/sessions/:id/problem` | POST | 提交题目并获得首轮诊断 |
| `/api/coach/sessions/:id/turns` | POST | 提交学生表达或选项，进入下一轮 |
| `/api/coach/sessions/:id/prefetch` | POST | 后台预生成下一层算法教练提示 |
| `/api/coach/sessions/:id` | GET | 获取公开会话状态 |
| `/api/coach/sessions/:id` | DELETE | 删除会话与学生证据 |

教学工具中的「题目列表」由前端内置题号索引提供，不调用 AI，也不依赖外部 Markdown 文件。旧版 `/api/generate-example` 仅作为兼容接口保留，当前主界面不再使用。

### 代码调试说明

代码调试采用“本地验证优先、AI 分析可选”的流程：

1. `/api/debug-code/verify` 先完成受限编译和样例执行，不调用 AI，优先给出编译错误、运行超时、输出差异或样例通过结果。
2. 学生确认需要帮助后，再调用 `/api/debug-code/analyze` 生成一次调试分析；不会在本地验证完成后自动发起第二次 AI 请求。
3. 调试讲解按题目证据自适应：简单问题只给结论和一两个检查动作，复杂问题才展开执行路径或小数据推演，不强制套用固定章节，也不会为了凑格式重复检查清单。
4. AI 返回空内容、超时、被截断或服务不可用时，接口返回明确状态，前端保留本地验证结果并允许稍后重试。
5. DeepSeek 调试请求默认关闭深度推理，避免短提示耗尽输出预算；如需调整，可在 `server/.env` 中设置 `DEBUG_AI_THINKING`、`DEBUG_AI_MODEL` 和 `DEBUG_AI_MAX_TOKENS`。

### 课后反馈说明

老师在「课后反馈」页面填写上课日期、主题、题号（可选）和课堂表现后，系统会先按题号抓取东方博宜 OJ 的题目名称（正文中不出现数字题号），再结合老师自定义的风格规则流式生成课评。每位老师的风格规则保存在自己的账号下，留空时使用系统默认模板。生成的课评可以按学生保存为历史记录，「AI 阶段表现分析」会读取该学生全部历史课评，按时间线总结阶段总评、进步轨迹、持续薄弱点和下阶段建议。

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
npm run test:debug-runner
npm run test:coach
npm run test:training-course

cd ../web
npm run test:problem-index
npm run test:training-course
npm run build
```

`npm run test:coach` 覆盖全部 P0 场景、10 条红队绕过提示、五轮累计泄露、Schema 修复和状态更新。测试不调用外部模型，可离线重复运行。

## 已知限制

- 账号、练习记录和课后反馈保存在 SQLite（`server/data/app.db`），单文件部署简单，但不适合高并发多实例；如需横向扩展请迁移到 PostgreSQL/MySQL。
- 算法教练会话保存在当前 Node.js 进程内，后端重启后会清空；多实例生产部署需要接入 Redis 或数据库。
- 当前模型层支持 DeepSeek 及 OpenAI 兼容接口，不包含各厂商的专用 SDK。
- 代码调试的本地验证只覆盖题目提供的样例，样例通过不等于所有数据正确；AI 调试分析仅提供定位建议，不负责判题。
- AI 调试分析依赖模型服务的可用性和配置，模型不可用时不会影响本地编译与样例验证。
- 规则守卫会在模型返回无效 JSON 或泄露过多时改用保守提示，因此极少数轮次的表达会比模型原回答简短。
- Algorithm Coach v1.0 只负责思路训练，不自动判题，也不生成可提交代码。
- 集训课程中的编程题只保存东方博宜 OJ 题号和跳转链接，不同步 OJ 提交记录、得分或代码。

## 安全约定

- 不要提交 `server/.env`、`server/data/`、API Key 或其他密钥。
- 首次部署后请立即修改默认管理员密码（`admin / admin123`）。
- AI 生成内容统一经过文案风格约束，使用中文全角标点、规范的中英文间距和标准专有名词。
- AI 对话和代码调试不得直接提供完整解题代码。
- 本地 `g++` 只用于开发和受控课堂环境；生产环境使用隔离的 runner 容器。
