const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-papers-test-'));
process.env.DATA_DIR = testDataDir;
const { DatabaseSync } = require('node:sqlite');
const fixture = new DatabaseSync(path.join(testDataDir, 'app.db'));
fixture.exec("CREATE TABLE app_migrations (name TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now','localtime')))");
fixture.prepare('INSERT INTO app_migrations (name) VALUES (?)').run('fix-csp-j-2024-completion-1-4-answer-c');
fixture.close();

const app = require('../app');
const db = require('../db');

async function main() {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(url, token, method = 'GET', body, status = 200) {
    const response = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    assert.equal(response.status, status, `${method} ${url}: ${JSON.stringify(data)}`);
    return data;
  }
  try {
    const { token: teacher } = await request('/api/auth/login', '', 'POST', { username: 'admin', password: 'admin123' });
    const student = await request('/api/auth/students', teacher, 'POST', {
      username: 'csp_paper_test', password: 'test123456', name: 'CSP 整卷测试学生',
    });
    const assignment = await request('/api/csp-papers/assignments', teacher, 'POST', {
      paperType: 'CSP', paperKey: 'CSP-J-2019', studentIds: [student.id],
    }, 201);
    assert.equal(assignment.paperKey, 'CSP-J-2019');
    assert.equal(assignment.questionIds.length, 20);
    assert.equal(assignment.maxScore, 100);
    console.log('PASS: CSP-J 2019 full-paper assignment accepts paperKey and creates 20 questions / 100 points.');
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
    const relative = path.relative(os.tmpdir(), testDataDir);
    if (!path.isAbsolute(relative) && relative.startsWith('csp-papers-test-') && !relative.includes(path.sep)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
