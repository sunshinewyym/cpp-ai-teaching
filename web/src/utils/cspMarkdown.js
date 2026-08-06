import { marked } from 'marked';

// Convert prose punctuation while preserving inline and fenced code exactly.
export function normalizeQuestionPunctuation(value) {
  return String(value || '').split('```').map((part, index) => {
    if (index % 2) return part;
    return part.split(/(`[^`\n]*`)/g)
      .map((segment, segmentIndex) => segmentIndex % 2 ? segment : segment.replace(/,/g, '，'))
      .join('');
  }).join('```');
}

function stripPdfNoise(text) {
  return String(text || '')
    .replace(/CCF\s+CSP-[JS]\s*\d{4}[^\n]*第\s*\d+\s*页[，,]\s*共\s*\d+\s*页/gi, '')
    .replace(/CCF\s+CSP-[JS]\s*\d{4}[^\n]*/gi, '')
    .replace(/第\s*\d+\s*页[，,]\s*共\s*\d+\s*页/g, '');
}

function normalizeDelimitedRun(value, delimiter = ',') {
  const parts = String(value || '').split(delimiter).map(item => item.trim());
  for (let size = 1; size <= Math.floor(parts.length / 3); size++) {
    if (parts.length % size === 0) {
      const unit = parts.slice(0, size);
      if (unit.join(delimiter).repeat(parts.length / size) === parts.join(delimiter)) return unit.join(', ');
    }
  }
  return value;
}

function normalizeExtractedText(value) {
  let text = String(value || '');
  text = text.replace(/(?:\d+\s*,\s*){4,}\d+/g, token => normalizeDelimitedRun(token));
  text = text.replace(/\b([A-Za-z]\([^()\n]{1,16}\))\1{2,}\b/g, '$1');
  text = text.replace(/\bf\(f\(x\)\)=10f\(f\(x\)\)=10f\(f\(x\)\)=10/g, 'f(f(x))=10');
  text = text.replace(/\\d?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '<span class="math-fraction"><span>$1</span><span>$2</span></span>');
  const complexityRepeat = /(?:O|Θ|\\Theta)\([^()\n]*\)(?:\s*)(?:O|Θ|\\Theta)\([^()\n]*\)(?:\s*)(?:O|Θ|\\Theta)\([^()\n]*\)/g;
  text = text.replace(complexityRepeat, token => {
    const parts = token.match(/(?:O|Θ|\\Theta)\([^()\n]*\)/g) || [];
    return parts.sort((x, y) => (y.includes('\\') ? 1 : 0) - (x.includes('\\') ? 1 : 0) || y.length - x.length)[0] || token;
  });
  return text.replace(/([A-Za-z]\s*=\s*(?:Θ|\\Theta)\([^()\n]*\))(?:\s*)\1(?:\s*)\1/g, '$1');
}

export function cleanCspMathText(value) {
  let text = String(value || '')
    .replace(/\\texttt\s*\{([^{}]*)\}/g, '`$1`')
    .replace(/\\text\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\mathrm\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\leqslant/g, '≤').replace(/\\geqslant/g, '≥')
    .replace(/\\leq/g, '≤').replace(/\\geq/g, '≥')
    .replace(/\\times/g, '×').replace(/\\cdot/g, '·').replace(/\\sum/g, '∑')
    .replace(/\\in/g, '∈').replace(/\\cdots/g, '⋯').replace(/\\dots/g, '…')
    .replace(/\\sim/g, '∼').replace(/\\to/g, '→').replace(/\\rightarrow/g, '→').replace(/⁡/g, '')
    .replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  const code = [];
  text = text.replace(/`([^`\n]*)`/g, (_, content) => {
    const token = `@@CSPCODE${code.length}@@`;
    code.push(content);
    return token;
  });
  text = normalizeExtractedText(text).replace(/\$/g, '').replace(/（\s*[)）]/g, '（ ）').replace(/\(\s*[)）]/g, '（ ）')
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '<span class="math-fraction"><span>$1</span><span>$2</span></span>')
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, '<span class="math-radical">√<span>$1</span></span>')
    .replace(/\\sqrt\s+([A-Za-z0-9]+)/g, '<span class="math-radical">√<span>$1</span></span>')
    .replace(/\\log/g, 'log').replace(/\\Theta/g, 'Θ').replace(/\\alpha/g, 'α').replace(/\\left\\lfloor/g, '⌊').replace(/\\lfloor/g, '⌊').replace(/\\left\\rfloor/g, '⌋').replace(/\\rfloor/g, '⌋').replace(/\\cdot/g, '·').replace(/\\times/g, '×').replace(/\\neq/g, '≠')
    .replace(/([A-Za-z0-9)\]])_\{([^{}]+)\}/g, '$1<sub>$2</sub>')
    .replace(/([0-9A-Z])_([0-9]+)/g, '$1<sub>$2</sub>')
    .replace(/([A-Za-z0-9)\]])\^\{([^{}]+)\}/g, '$1<sup>$2</sup>')
    .replace(/([A-Za-z0-9)\]])\^\(([^()]+)\)/g, '$1<sup>$2</sup>')
    .replace(/([A-Za-z0-9)\]])\^([A-Za-z0-9]+)/g, '$1<sup>$2</sup>');
  text = normalizeQuestionPunctuation(text);
  return text.replace(/@@CSPCODE(\d+)@@/g, (_, index) => `\`${code[Number(index)]}\``);
}

export function cleanCspText(value) {
  return cleanCspMathText(stripPdfNoise(String(value || ''))).trim();
}

export function cleanCspPlainText(value) {
  return cleanCspMathText(value).replace(/<\/?(?:sub|sup)>/g, '');
}

export function cleanCspMarkdown(value) {
  return String(value || '').split('```').map((part, index) => index % 2 ? part : cleanCspMathText(part)).join('```');
}

// A C++ bitwise-not expression such as `~0ull` can be mistaken for the
// opening delimiter of Markdown strikethrough when another tilde appears
// later in the same paragraph. Escape tildes only in prose; code spans and
// fenced code must remain byte-for-byte unchanged.
function protectMarkdownTildes(value) {
  const text = String(value || '');
  let result = '';
  let index = 0;
  while (index < text.length) {
    if (text.startsWith('```', index)) {
      const end = text.indexOf('```', index + 3);
      if (end < 0) {
        result += text.slice(index);
        break;
      }
      const closeEnd = end + 3;
      result += text.slice(index, closeEnd);
      index = closeEnd;
      continue;
    }
    if (text[index] === '`') {
      let ticks = 1;
      while (text[index + ticks] === '`') ticks += 1;
      const marker = '`'.repeat(ticks);
      const end = text.indexOf(marker, index + ticks);
      if (end < 0) {
        result += text.slice(index);
        break;
      }
      const closeEnd = end + ticks;
      result += text.slice(index, closeEnd);
      index = closeEnd;
      continue;
    }
    result += text[index] === '~' ? '&#126;' : text[index];
    index += 1;
  }
  return result;
}

export function renderCspMarkdown(value) {
  return marked.parse(protectMarkdownTildes(cleanCspMarkdown(value)));
}

export function renderCspInline(value) {
  return marked.parseInline(protectMarkdownTildes(cleanCspMathText(value)));
}
