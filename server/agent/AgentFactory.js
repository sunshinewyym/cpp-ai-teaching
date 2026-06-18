/**
 * AgentFactory — 创建预配置的 Agent 实例
 * 提供常见任务的预设 prompt 和工具组合
 */

const AgentCore = require('./AgentCore');
const ToolRegistry = require('./ToolRegistry');
const { registerFileTools } = require('./tools/fileTools');
const { registerCodeTools } = require('./tools/codeTools');
const { registerWebTools } = require('./tools/webTools');

/**
 * 创建一个完整的编码 Agent
 * @param {object} options
 * @param {string} options.workDir - 工作目录
 * @param {string} options.mode - 模式
 * @param {function} options.onStep - 步骤回调
 * @param {AbortSignal} options.signal - 中止信号
 * @param {number} options.maxSteps - 最大步数
 */
function createCodingAgent(options = {}) {
  const workDir = options.workDir || process.cwd();

  // 注册所有工具
  const registry = new ToolRegistry();
  registerFileTools(registry, workDir);
  registerCodeTools(registry, workDir);
  registerWebTools(registry);

  const systemPrompt = `你是一个专业的自主编码 Agent，专注于 C++ 教学和竞赛编程。

## 你的能力
你可以通过调用工具来完成各种编码任务：
- 读取、写入、编辑文件
- 搜索代码库
- 分析 C++ 代码的复杂度和潜在问题
- 编译运行 C++ 代码验证结果
- 抓取网页获取参考资料

## 工作流程
每一轮你需要：
1. <think>分析当前状态，确定下一步行动</think>
2. 调用一个或多个工具执行操作
3. <reflect status="continue|complete|stuck">评估结果，决定是否继续</reflect>
4. 当任务完成时，用 <done>输出最终结果</done>

## 关键规则
- 每次只做一个小步骤，保持清晰的逻辑链
- 代码修改前一定要先读取当前内容
- 每次编辑后要验证修改是否正确
- 如果连续 3 次相同操作没有进展，换一种策略
- 最终结果要包含完整的修改总结
- 使用中文交流，代码注释也用中文
- C++ 代码使用 C++17 标准

## 当你被要求修复代码时
1. 先读取代码
2. 分析所有问题
3. 逐个修复
4. 修复后运行验证
5. 给出修改总结`;

  return new AgentCore({
    tools: registry,
    systemPrompt,
    mode: options.mode || 'auto',
    maxSteps: options.maxSteps || 25,
    onStep: options.onStep || (() => {}),
    signal: options.signal,
  });
}

/**
 * 创建教学任务 Agent（生成讲稿、脑洞等）
 */
function createTeachingAgent(options = {}) {
  const registry = new ToolRegistry();
  registerWebTools(registry);

  const systemPrompt = `你是一个专业的教学设计 Agent，专注于 C++ 编程教育。

## 你的能力
- 设计课堂讲稿和教案
- 创作算法脑洞（生活化的故事引入算法）
- 设计练习题和测试用例
- 分析课程内容并给出教学建议
- 搜索参考资料辅助教学设计

## 工作流程
每一轮你需要：
1. <think>分析教学需求，确定设计方向</think>
2. 调用工具获取参考资料或执行辅助操作
3. <reflect status="continue|complete">评估设计质量</reflect>
4. 当设计完成时，用 <done>输出最终教学内容</done>

## 教学设计原则
- 面向 10-14 岁学生，语言通俗易懂
- 用生活案例解释抽象概念
- 由浅入深，循序渐进
- 注重互动和趣味性
- 使用中文`;

  return new AgentCore({
    tools: registry,
    systemPrompt,
    mode: options.mode || 'auto',
    maxSteps: options.maxSteps || 15,
    onStep: options.onStep || (() => {}),
    signal: options.signal,
  });
}

/**
 * 创建问题诊断 Agent（分析代码错误、性能问题）
 */
function createDebugAgent(options = {}) {
  const workDir = options.workDir || process.cwd();
  const registry = new ToolRegistry();
  registerFileTools(registry, workDir);
  registerCodeTools(registry, workDir);

  const systemPrompt = `你是一个专业的代码诊断 Agent，擅长找出 C++ 代码中的 Bug 和性能问题。

## 诊断流程
1. 读取代码
2. <think>逐行分析，识别潜在问题</think>
3. 使用 cpp_lint 检查语法和常见错误
4. 使用 analyze_complexity 分析复杂度
5. 如果需要，使用 cpp_run 运行代码验证
6. <reflect status="continue|complete">评估是否找到所有问题</reflect>
7. 用 <done>输出诊断报告和修复建议</done>

## 诊断维度
- 语法错误（编译错误）
- 逻辑错误（结果不对）
- 边界问题（数组越界、溢出）
- 性能问题（TLE 风险）
- 代码风格（可读性）
- 安全问题（缓冲区溢出等）

## 输出格式
诊断报告要包含：
1. 问题列表（按严重程度排序）
2. 每个问题的位置、描述、影响
3. 修复方案和修改后的代码
4. 学习建议

使用中文交流。`;

  return new AgentCore({
    tools: registry,
    systemPrompt,
    mode: options.mode || 'auto',
    maxSteps: options.maxSteps || 15,
    onStep: options.onStep || (() => {}),
    signal: options.signal,
  });
}

module.exports = {
  createCodingAgent,
  createTeachingAgent,
  createDebugAgent,
};
