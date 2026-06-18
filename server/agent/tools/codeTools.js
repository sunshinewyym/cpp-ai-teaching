/**
 * 代码工具集 — 语法检查、代码分析、C++ 编译运行
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function registerCodeTools(registry, workDir) {
  // ===== C++ 语法检查 =====
  registry.register({
    name: 'cpp_lint',
    description: '检查 C++ 代码的语法错误和常见问题。不需要编译运行。',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: '要检查的 C++ 代码' },
        filePath: { type: 'string', description: '或者指定已存在的文件路径' },
      },
    },
    async execute(params) {
      let code = params.code;
      if (!code && params.filePath) {
        const fp = path.resolve(workDir, params.filePath);
        if (!fs.existsSync(fp)) return { error: `文件不存在: ${params.filePath}` };
        code = fs.readFileSync(fp, 'utf-8');
      }
      if (!code) return { error: '请提供 code 或 filePath' };

      const issues = [];
      const lines = code.split('\n');

      // 检查常见问题
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // 数组越界风险
        if (/\[\s*\w+\s*\]/.test(line) && !/\.size\(\)|\.length|sizeof/.test(line)) {
          if (/for\s*\(/.test(line) && /<=/.test(line)) {
            issues.push({ line: lineNum, severity: 'warning', message: '循环条件可能越界：检查是否应该是 < 而不是 <=' });
          }
        }

        // 未初始化变量
        if (/^\s*(int|long|float|double|char|bool)\s+\w+\s*;/.test(line)) {
          issues.push({ line: lineNum, severity: 'warning', message: '变量未初始化，可能导致未定义行为' });
        }

        // memset 用法
        if (/memset.*0x3f/.test(line)) {
          issues.push({ line: lineNum, severity: 'info', message: '使用 0x3f 做 INF，注意加法可能溢出' });
        }

        // 整数溢出
        if (/\bint\b/.test(line) && /\*.*\*/.test(line)) {
          issues.push({ line: lineNum, severity: 'warning', message: 'int 乘法可能溢出，考虑用 long long' });
        }

        // endl vs \n
        if (/cout.*<<.*endl/.test(line)) {
          issues.push({ line: lineNum, severity: 'info', message: 'endl 会刷新缓冲区，大量输出时用 \\n 更快' });
        }

        // goto
        if (/\bgoto\b/.test(line)) {
          issues.push({ line: lineNum, severity: 'error', message: '使用 goto 会导致代码难以维护' });
        }

        // 无限循环
        if (/while\s*\(\s*true\s*\)/.test(line) || /while\s*\(\s*1\s*\)/.test(line)) {
          if (!lines.slice(i, i + 20).some(l => /break|return/.test(l))) {
            issues.push({ line: lineNum, severity: 'error', message: '可能的无限循环：未找到 break 或 return' });
          }
        }
      }

      // 检查整体结构
      if (!code.includes('#include')) {
        issues.push({ line: 0, severity: 'error', message: '缺少 #include 头文件' });
      }
      if (!code.includes('main')) {
        issues.push({ line: 0, severity: 'warning', message: '未找到 main 函数' });
      }

      return {
        totalLines: lines.length,
        issues: issues.length,
        details: issues,
      };
    },
  });

  // ===== 代码复杂度分析 =====
  registry.register({
    name: 'analyze_complexity',
    description: '分析 C++ 代码的时间和空间复杂度。',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'C++ 代码' },
      },
      required: ['code'],
    },
    async execute(params) {
      const code = params.code;
      const analysis = { time: {}, space: {}, patterns: [] };

      // 检测循环嵌套深度
      let maxNest = 0, currentNest = 0;
      for (const line of code.split('\n')) {
        if (/\bfor\s*\(|while\s*\(/.test(line)) currentNest++;
        if (currentNest > maxNest) maxNest = currentNest;
        if (/^\s*\}/.test(line) && currentNest > 0) currentNest--;
      }
      analysis.time.maxLoopNesting = maxNest;

      // 检测排序
      if (/sort\s*\(/.test(code)) analysis.patterns.push('调用了 sort → O(n log n)');
      if (/nth_element/.test(code)) analysis.patterns.push('调用了 nth_element → O(n)');

      // 检测数据结构
      if (/priority_queue/.test(code)) analysis.patterns.push('使用优先队列 → 插入/删除 O(log n)');
      if (/set|map/.test(code)) analysis.patterns.push('使用 set/map → 插入/查找 O(log n)');
      if (/unordered_set|unordered_map/.test(code)) analysis.patterns.push('使用哈希表 → 平均 O(1)');

      // 检测递归
      const funcNames = [];
      const funcRegex = /(\w+)\s*\([^)]*\)\s*\{/g;
      let match;
      while ((match = funcRegex.exec(code)) !== null) {
        funcNames.push(match[1]);
      }
      for (const name of funcNames) {
        if (name !== 'main' && code.includes(name + '(')) {
          const funcBody = code.slice(code.indexOf(name));
          if (funcBody.split(name).length > 2) {
            analysis.patterns.push(`函数 ${name} 是递归的`);
          }
        }
      }

      // 检测数组大小（推断空间）
      const arrayMatch = code.match(/\w+\s+\w+\[\s*(\d+)\s*\]/g);
      if (arrayMatch) {
        for (const arr of arrayMatch) {
          const size = arr.match(/\[\s*(\d+)\s*\]/);
          if (size) {
            analysis.space[`数组 ${arr.match(/\s(\w+)\[/)[1]}`] = `${size[1]} 个元素`;
          }
        }
      }

      // 总结
      analysis.time.estimate = maxNest >= 3 ? 'O(n³) 或更高' :
        maxNest === 2 ? 'O(n²)' :
        maxNest === 1 ? 'O(n) 或 O(n log n)' : 'O(1)';

      return analysis;
    },
  });

  // ===== C++ 编译运行（沙箱） =====
  registry.register({
    name: 'cpp_run',
    description: '编译并运行 C++ 代码。有超时限制（5秒）和输出截断。',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'C++ 源代码' },
        input: { type: 'string', description: '标准输入内容' },
        timeLimit: { type: 'number', description: '时间限制（毫秒，默认 5000）' },
      },
      required: ['code'],
    },
    async execute(params) {
      const tmpDir = os.tmpdir();
      const tmpFile = path.join(tmpDir, `agent_cpp_${Date.now()}.cpp`);
      const exeFile = path.join(tmpDir, `agent_cpp_${Date.now()}.exe`);

      fs.writeFileSync(tmpFile, params.code, 'utf-8');
      const timeLimit = params.timeLimit || 5000;

      return new Promise((resolve) => {
        // 编译
        exec(`g++ -O2 -std=c++17 -o "${exeFile}" "${tmpFile}"`, { timeout: 10000 }, (err, stdout, stderr) => {
          // 清理源文件
          try { fs.unlinkSync(tmpFile); } catch {}

          if (err) {
            try { fs.unlinkSync(exeFile); } catch {}
            return resolve({
              status: 'compile_error',
              error: stderr || err.message,
            });
          }

          // 运行
          const runProcess = exec(`"${exeFile}"`, {
            timeout: timeLimit,
            input: params.input || '',
            maxBuffer: 1024 * 1024, // 1MB
          }, (runErr, runStdout, runStderr) => {
            try { fs.unlinkSync(exeFile); } catch {}

            if (runErr) {
              if (runErr.killed) {
                return resolve({ status: 'time_limit', time: timeLimit });
              }
              return resolve({
                status: 'runtime_error',
                error: runStderr || runErr.message,
                stdout: runStdout?.slice(0, 2000),
              });
            }

            return resolve({
              status: 'ok',
              stdout: runStdout?.slice(0, 5000),
              stderr: runStderr?.slice(0, 1000),
            });
          });
        });
      });
    },
  });

  // ===== 生成代码差异 =====
  registry.register({
    name: 'diff_code',
    description: '对比两段代码的差异，返回修改摘要。',
    parameters: {
      type: 'object',
      properties: {
        original: { type: 'string', description: '原始代码' },
        modified: { type: 'string', description: '修改后的代码' },
      },
      required: ['original', 'modified'],
    },
    async execute(params) {
      const oldLines = params.original.split('\n');
      const newLines = params.modified.split('\n');
      const changes = [];

      const maxLen = Math.max(oldLines.length, newLines.length);
      let added = 0, removed = 0, modified = 0;

      for (let i = 0; i < maxLen; i++) {
        const oldLine = oldLines[i];
        const newLine = newLines[i];

        if (oldLine === undefined) {
          added++;
          changes.push({ line: i + 1, type: 'added', content: newLine });
        } else if (newLine === undefined) {
          removed++;
          changes.push({ line: i + 1, type: 'removed', content: oldLine });
        } else if (oldLine !== newLine) {
          modified++;
          changes.push({ line: i + 1, type: 'modified', old: oldLine, new: newLine });
        }
      }

      return {
        summary: { added, removed, modified, totalChanges: added + removed + modified },
        changes: changes.slice(0, 100),
      };
    },
  });
}

module.exports = { registerCodeTools };
