/**
 * 文件操作工具集 — 读取、写入、列出目录、搜索
 */

const fs = require('fs');
const path = require('path');

function registerFileTools(registry, workDir) {
  // ===== 读取文件 =====
  registry.register({
    name: 'read_file',
    description: '读取一个文件的内容。返回文件文本内容和行数。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文件路径（相对于工作目录）' },
        startLine: { type: 'number', description: '起始行号（从1开始，可选）' },
        endLine: { type: 'number', description: '结束行号（可选）' },
      },
      required: ['path'],
    },
    async execute(params) {
      const filePath = path.resolve(workDir, params.path);
      if (!filePath.startsWith(path.resolve(workDir))) {
        return { error: '路径越界：不能读取工作目录之外的文件' };
      }
      if (!fs.existsSync(filePath)) {
        return { error: `文件不存在: ${params.path}` };
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const start = Math.max(1, params.startLine || 1);
      const end = Math.min(lines.length, params.endLine || lines.length);
      const selected = lines.slice(start - 1, end)
        .map((line, i) => `${start + i}\t${line}`)
        .join('\n');
      return {
        file: params.path,
        totalLines: lines.length,
        showing: `${start}-${end}`,
        content: selected,
      };
    },
  });

  // ===== 写入文件 =====
  registry.register({
    name: 'write_file',
    description: '创建或覆盖一个文件。如果父目录不存在会自动创建。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文件路径（相对于工作目录）' },
        content: { type: 'string', description: '要写入的内容' },
      },
      required: ['path', 'content'],
    },
    async execute(params) {
      const filePath = path.resolve(workDir, params.path);
      if (!filePath.startsWith(path.resolve(workDir))) {
        return { error: '路径越界：不能写入工作目录之外的文件' };
      }
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, params.content, 'utf-8');
      const lines = params.content.split('\n').length;
      return { success: true, file: params.path, lines };
    },
  });

  // ===== 编辑文件（局部替换） =====
  registry.register({
    name: 'edit_file',
    description: '在文件中进行精确的文本替换。不会覆盖整个文件。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文件路径' },
        oldText: { type: 'string', description: '要替换的原始文本（必须精确匹配）' },
        newText: { type: 'string', description: '替换后的文本' },
      },
      required: ['path', 'oldText', 'newText'],
    },
    async execute(params) {
      const filePath = path.resolve(workDir, params.path);
      if (!fs.existsSync(filePath)) {
        return { error: `文件不存在: ${params.path}` };
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      if (!content.includes(params.oldText)) {
        return { error: '未找到要替换的文本，请确认 oldText 与文件内容完全匹配（包括缩进和空格）' };
      }
      const newContent = content.replace(params.oldText, params.newText);
      fs.writeFileSync(filePath, newContent, 'utf-8');
      return { success: true, file: params.path };
    },
  });

  // ===== 列出目录 =====
  registry.register({
    name: 'list_dir',
    description: '列出目录下的文件和子目录。默认列出工作目录。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '目录路径（相对于工作目录，默认 "."）' },
        recursive: { type: 'boolean', description: '是否递归列出（默认 false）' },
        maxDepth: { type: 'number', description: '递归最大深度（默认 3）' },
      },
    },
    async execute(params) {
      const dirPath = path.resolve(workDir, params.path || '.');
      if (!fs.existsSync(dirPath)) {
        return { error: `目录不存在: ${params.path}` };
      }
      const results = [];
      const maxDepth = params.maxDepth || 3;

      function walk(dir, depth) {
        if (depth > maxDepth) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(workDir, fullPath);
          if (entry.isDirectory()) {
            results.push({ type: 'dir', path: relPath });
            if (params.recursive) walk(fullPath, depth + 1);
          } else {
            const stats = fs.statSync(fullPath);
            results.push({ type: 'file', path: relPath, size: stats.size });
          }
        }
      }

      walk(dirPath, 1);
      return { dir: params.path || '.', entries: results.slice(0, 200) };
    },
  });

  // ===== 搜索文件内容 =====
  registry.register({
    name: 'search_files',
    description: '在文件中搜索文本或正则表达式，返回匹配的文件和行。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词或正则表达式' },
        glob: { type: 'string', description: '文件过滤（如 "*.js"）' },
        path: { type: 'string', description: '搜索目录（相对于工作目录）' },
        maxResults: { type: 'number', description: '最大结果数（默认 50）' },
      },
      required: ['query'],
    },
    async execute(params) {
      const searchDir = path.resolve(workDir, params.path || '.');
      const maxResults = params.maxResults || 50;
      const regex = new RegExp(params.query, 'gi');
      const results = [];

      function search(dir) {
        if (results.length >= maxResults) return;
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
        catch { return; }

        for (const entry of entries) {
          if (results.length >= maxResults) break;
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            search(fullPath);
          } else {
            // glob filter
            if (params.glob) {
              const pattern = params.glob.replace('*', '');
              if (!entry.name.endsWith(pattern)) continue;
            }
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (regex.test(lines[i])) {
                  results.push({
                    file: path.relative(workDir, fullPath),
                    line: i + 1,
                    content: lines[i].trim().slice(0, 200),
                  });
                  regex.lastIndex = 0;
                  if (results.length >= maxResults) break;
                }
              }
            } catch (e) {
              // skip binary files
            }
          }
        }
      }

      search(searchDir);
      return { query: params.query, matches: results.length, results };
    },
  });
}

module.exports = { registerFileTools };
