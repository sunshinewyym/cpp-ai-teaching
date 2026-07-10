# C++ AI 教学系统

面向 C++、算法与竞赛入门教学的 AI 助教平台。它把教师备课和学生自学中常见的提问、算法理解、边界测试、练习与可视化演示集中在一个中文界面中。

## 功能

- AI 对话：根据课程主题回答 C++ 与算法问题。
- 算法速懂卡：用分卡形式生成核心思路、关键步骤、模板、易错点和算法小故事。
- 边界盲盒：输入题目描述或四位 OJ 题号，生成边界、特殊数据、复杂度和样例陷阱测试点；支持数学公式显示。
- 教学工具：生成例题、讲稿、代码调试建议，以及 10 道可即时判题和查看解析的选择题。
- 算法可视化：逐步演示递归调用与返回、二分查找、冒泡排序、BFS 走迷宫和 DFS 寻找迷宫出口。
- 等待提示：AI 生成期间展示中文 AI、编程新闻或历史上的今天内容。

## 技术栈

- 前端：Vue 3、Vite、Marked、Highlight.js
- 后端：Node.js、Express、DeepSeek API
- 通信：普通 JSON 接口与 SSE 流式输出

## 项目结构

```text
server/                 Express 后端与 DeepSeek 调用
  controllers/          对话、算法卡、边界测试、教学工具、新闻控制器
  routes/               API 路由
  prompts/              教学提示词
  services/             模型、题目与知识库服务
  public/panel.html     可嵌入 PPT 的独立教学面板
web/                    Vue 前端
  src/components/       对话、侧边栏、算法可视化等组件
knowledge/              课程知识库
docker/                 Docker、Nginx 与 PM2 部署文件
```

## 快速开始

### 1. 配置后端

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

在 `server/.env` 中填写 DeepSeek 配置：

```env
DEEPSEEK_API_KEY=你的_API_Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
PORT=3000
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
```

### 2. 启动前端

```bash
cd web
npm install
npm run dev
```

默认访问 `http://localhost:5173`。开发环境会将 `/api` 请求代理到 `http://localhost:3000`。

### 3. 局域网访问

前端使用本机网卡监听：

```bash
npm run dev -- --host 0.0.0.0
```

局域网设备可通过 `http://你的电脑IP:5173` 访问。后端也需要保持运行；如更换后端端口，可设置 `VITE_API_PROXY_TARGET`。

## 接口

| 接口 | 方法 | 用途 |
| --- | --- | --- |
| `/api/health` | GET | 健康检查 |
| `/api/chat` | POST | AI 对话，SSE 流式输出 |
| `/api/opener` | POST | 生成算法速懂卡 |
| `/api/edge-case` | POST | 生成边界测试点 |
| `/api/edge-case/problem/:id` | GET | 获取四位 OJ 题号对应题目 |
| `/api/news` | GET | 获取中文等待内容 |
| `/api/generate-example` | POST | 生成教学例题 |
| `/api/generate-exercise` | POST | 生成 10 道选择练习题 |
| `/api/generate-script` | POST | 生成课程讲稿 |
| `/api/debug-code` | POST | 分析代码问题 |

## 构建

```bash
cd web
npm run build
```

构建产物位于 `web/dist`。

## 安全说明

- 不要提交 `server/.env` 或任何 API Key。
- 前端通过 `/api/*` 访问后端，不应在浏览器中保存模型密钥。
- 对外部署时请配置 HTTPS、访问控制与反向代理。
