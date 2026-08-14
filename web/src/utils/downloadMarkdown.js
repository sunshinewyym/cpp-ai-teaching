function markdownCell(value) {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|');
}

export function markdownTable(headers, rows) {
  const headerCells = headers.map(markdownCell);
  const lines = [
    `| ${headerCells.join(' | ')} |`,
    `| ${headerCells.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.map(markdownCell).join(' | ')} |`),
  ];
  return lines.join('\n');
}

export function downloadMarkdown(filename, title, headers, rows) {
  const table = markdownTable(headers, rows);
  const body = title ? `# ${title}\n\n${table}\n` : `${table}\n`;
  const blob = new Blob([`\uFEFF${body}`], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = String(filename).replace(/[\\/:*?"<>|]/g, '_');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
