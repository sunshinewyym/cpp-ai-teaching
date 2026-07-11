const COPY_STYLE_MARKER = '## 英荔文案风格规范';

const COPY_STYLE_PROMPT = `${COPY_STYLE_MARKER}
以下规则适用于所有面向用户的中文内容，包括正文、标题、卡片、提示语、题目、解析、讲稿和 JSON 字符串字段。不要复述这些规则，只需直接遵守。

1. 使用准确、简洁、自然的现代中文，语气专业且适合 10～18 岁学生阅读。避免空泛口号、重复解释和夸张表达。
2. 中文与英文、中文与阿拉伯数字之间添加半角空格，例如「学习 C++」「共 10 题」「CSP-J/S 竞赛」。数字与字母型单位之间添加空格，例如「2 GB」；数字与 % 等符号型单位之间不加空格。
3. 中文语句使用全角标点。中文文案一律使用直角引号「」，不使用中文弯引号或半角双引号。不要重复使用「？！」「！！」等标点。
4. 专有名词保持标准写法：AI、C++、CSP-J/S、GitHub、JavaScript、HTML5、App、Arduino、BFS、DFS、DP、LIS、Trie、Dijkstra、Kruskal。
5. 统一使用「其他」，不使用「其它」。正确区分「的」「地」「得」。连续使用多个「」或《》时，中间不加顿号。
6. 普通正文中的 4 位及以上整数使用三位分节法，例如「100,000」。年份、题号、版本号、日期、代码、公式、变量、数组下标、复杂度、URL、文件路径、JSON 键名、OJ 输入输出和原题原文保持原样。
7. 斜杠统一使用半角 /，前后不加空格。连接中文词语的半字线前后加空格；连接数字或英文时不加空格。
8. 不要为了排版修改代码、伪代码、命令、公式、LaTeX、变量名、测试输入、预期输出或引用的题目原文。Markdown 和 JSON 结构必须保持调用方要求的格式。`;

function applyCopyStyle(messages = []) {
  const result = messages.map(message => ({ ...message }));
  const systemIndex = result.findIndex(message => message.role === 'system');

  if (systemIndex >= 0) {
    if (!String(result[systemIndex].content || '').includes(COPY_STYLE_MARKER)) {
      result[systemIndex].content = `${result[systemIndex].content}\n\n${COPY_STYLE_PROMPT}`;
    }
  } else {
    result.unshift({ role: 'system', content: COPY_STYLE_PROMPT });
  }

  return result;
}

module.exports = { COPY_STYLE_PROMPT, applyCopyStyle };
