const axios = require('axios');
const cheerio = require('cheerio');

// 内置示例题目
const BUILTIN_PROBLEMS = [
  { id: '1000', title: '熟悉一下Online Judge的环境' },
  { id: '1002', title: '编程求解1+2+3+...+n' },
  { id: '1003', title: '编程求1+3+5+...+n' },
  { id: '1004', title: '与指定数字相同的数的个数' },
  { id: '1005', title: '计算2的幂' },
];

// 题目缓存
const problemCache = new Map();

/**
 * 从东方博宜 OJ 抓取题目
 */
async function fetchProblem(problemId) {
  if (problemCache.has(problemId)) {
    return problemCache.get(problemId);
  }

  const url = `https://oj.czos.cn/p/${problemId}`;
  try {
    const resp = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000,
    });

    const html = resp.data;

    // 检查 404
    if (html.includes('Not Found') && html.includes('找不到该问题')) {
      return { error: `题号 ${problemId} 不存在`, status: 404 };
    }

    const $ = cheerio.load(html);

    // 提取标题
    const titleText = $('title').text();
    const titleMatch = titleText.match(/(\d+)\s*-\s*(.+?)\s*-\s*东方博宜OJ/);
    const title = titleMatch ? titleMatch[2].trim() : `题目 ${problemId}`;

    // 提取各节内容（用 cheerio 正确处理嵌套 div）
    const sections = [];
    $('.content-header').each((i, header) => {
      const sectionTitle = $(header).find('span').text().trim();
      const wrapper = $(header).next('.content-wrapper');
      const markdownDiv = wrapper.find('.markdown');
      const content = htmlToText(markdownDiv.html() || '');
      if (content) {
        sections.push(`## ${sectionTitle}\n${content}`);
      }
    });

    // 提取样例
    const samples = [];
    $('.sample-test .input').each((i, inputEl) => {
      const inputText = $(inputEl).find('pre').text();
      const outputEl = $(inputEl).next('.output');
      const outputText = outputEl.find('pre').text();
      if (inputText || outputText) {
        samples.push([inputText.trim(), outputText.trim()]);
      }
    });

    // 提取限制信息
    const bodyText = $.text();
    const timeMatch = bodyText.match(/时间限制:\s*(\d+)/);
    const memMatch = bodyText.match(/内存限制:\s*(\d+)/);

    const problem = {
      id: problemId,
      title,
      description: sections.join('\n\n'),
      sample_input: samples.length > 0 ? samples[0][0] : '',
      sample_output: samples.length > 0 ? samples[0][1] : '',
      samples,
      time_limit: timeMatch ? timeMatch[1] : '1',
      memory_limit: memMatch ? memMatch[1] : '16',
      url,
    };

    problemCache.set(problemId, problem);
    return problem;
  } catch (err) {
    return { error: `获取题目失败: ${err.message}`, status: 502 };
  }
}

/**
 * HTML 转纯文本
 */
function htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<h[1-6]>/gi, '### ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<code>(.*?)<\/code>/gi, '`$1`')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 解码 HTML 实体
 */
function decodeEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * 使用 Piston API 编译并运行 C++ 代码
 * @param {string} code - C++ 源代码
 * @param {string} stdin - 标准输入
 * @param {number} compileTimeout - 编译超时(ms)
 * @param {number} runTimeout - 运行超时(ms)
 */
async function compileAndRun(code, stdin = '', compileTimeout = 10000, runTimeout = 5000) {
  try {
    const resp = await axios.post('https://emkc.org/api/v2/piston/execute', {
      language: 'c++',
      version: '*',
      files: [{ name: 'main.cpp', content: code }],
      stdin,
      compile_timeout: compileTimeout,
      run_timeout: runTimeout,
    }, { timeout: 30000 });

    const data = resp.data;
    const compileResult = data.compile || {};
    const runResult = data.run || {};

    return {
      compile_success: compileResult.code === 0,
      compile_output: compileResult.stderr || compileResult.stdout || '',
      run_stdout: runResult.stdout || '',
      run_stderr: runResult.stderr || '',
      run_code: runResult.code,
      run_timeout: (runResult.stdout === '' && runResult.stderr === '' && runResult.code !== 0),
    };
  } catch (err) {
    // Piston API 不可用时，回退到只分析代码（不编译）
    return {
      compile_success: null,
      compile_output: `编译服务暂不可用: ${err.message}`,
      run_stdout: '',
      run_stderr: '',
      run_code: null,
      run_timeout: false,
      piston_unavailable: true,
    };
  }
}

/**
 * 样例自测
 */
async function runSamples(code, samples) {
  if (!samples || samples.length === 0) {
    return { results: [], all_pass: false, message: '无样例可测试' };
  }

  const results = [];
  let allPass = true;

  for (let i = 0; i < samples.length; i++) {
    const [input, expected] = samples[i];
    const runResult = await compileAndRun(code, input);

    if (!runResult.compile_success) {
      results.push({
        index: i,
        status: 'compile_error',
        input,
        expected,
        actual: '',
        message: '编译失败',
      });
      allPass = false;
      continue;
    }

    if (runResult.run_timeout) {
      results.push({
        index: i,
        status: 'timeout',
        input,
        expected,
        actual: '',
        message: '运行超时',
      });
      allPass = false;
      continue;
    }

    const actual = runResult.run_stdout.replace(/\s+$/, '');
    const exp = expected.replace(/\s+$/, '');
    const pass = actual === exp;

    if (!pass) allPass = false;

    results.push({
      index: i,
      status: pass ? 'pass' : 'fail',
      input,
      expected: exp,
      actual,
      message: pass ? '样例通过 ✓' : '样例不通过 ✗',
    });
  }

  return {
    results,
    all_pass: allPass,
    message: allPass ? '样例全部通过 ✓' : '部分样例未通过',
  };
}

module.exports = {
  BUILTIN_PROBLEMS,
  fetchProblem,
  compileAndRun,
  runSamples,
};
