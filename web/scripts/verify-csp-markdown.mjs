import assert from 'node:assert/strict';
import { noipProgramProblems } from '../src/data/noipProgramProblems.js';
import { renderCspInline, renderCspMarkdown } from '../src/utils/cspMarkdown.js';

const question = noipProgramProblems.find(p => p.id === 'noip-2010-reading-1').questions.find(q => q.number === 6);
const rendered = renderCspInline(question.text);
assert.ok(rendered.includes('<pre><code class="language-text">5\n1 3 5 7 9\n4\n2 6 10 14\n</code></pre>'));
assert.ok(!rendered.replace(/<[^>]*>/g, '').includes('text'));
assert.ok(rendered.includes('如果输入：') && rendered.includes('输出（ ）。'));

// Both the compact question views and the full homework view must preserve data.
for (const language of ['text', 'plaintext', 'cpp', '']) {
  const sample = `如果输入：\n\n\`\`\`${language}\n5\n1,3,5\n<value> $5 ~0ull a^2\n\`\`\`\n输出（ ）。`;
  for (const render of [renderCspInline, renderCspMarkdown]) {
    const html = render(sample);
    assert.match(html, /<pre><code[^>]*>5\n1,3,5\n&lt;value&gt; \$5 ~0ull a\^2\n<\/code><\/pre>/);
    assert.ok(!html.includes('<sup>'), 'sample contents must not be normalized as math');
  }
}

let checked = 0;
for (const problem of noipProgramProblems) {
  for (const part of problem.questions) {
    const blocks = [...part.text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)];
    if (!blocks.length) continue;
    const html = renderCspInline(part.text);
    assert.equal((html.match(/<pre>/g) || []).length, blocks.length, part.id);
    const escaped = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    for (const [, contents] of blocks) assert.ok(html.includes(escaped(contents)), `${part.id}: sample rows changed`);
    checked++;
  }
}
assert.ok(checked > 0);
assert.equal(renderCspInline('变量 `text` 的值为 **5**'), '变量 <code>text</code> 的值为 <strong>5</strong>');
assert.equal(renderCspInline('text 5 1 3'), 'text 5 1 3');
assert.equal(renderCspInline(null), '');
assert.match(renderCspInline('$x^{2}$'), /x<sup>2<\/sup>/);
assert.ok(!renderCspInline('~0ull 与 ~1ull').includes('<del>'));
console.log(`CSP Markdown verified: ${checked} NOIP input prompts; language labels hidden; sample whitespace, inline code and math preserved.`);
