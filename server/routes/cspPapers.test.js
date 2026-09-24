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
const { loadQuestionBank } = require('../training/questionBank');

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

    const available = await request('/api/csp-papers/available', teacher);
    assert.ok(available.some(p => p.paperKey === 'CSP-J-2026' && p.maxScore === 100));
    assert.ok(!available.some(p => p.paperKey === 'CSP-S-2026'));
    const { items: catalog } = await request('/api/homework/catalog?level=CSP-J&year=2026', teacher);
    assert.equal(catalog.length, 20);
    assert.ok(catalog.every(q => q.tags.length && q.year === 2026));
    const fresh = await request('/api/csp-papers/assignments', teacher, 'POST', {
      paperType: 'CSP', paperKey: 'CSP-J-2026', studentIds: [student.id],
    }, 201);
    assert.equal(fresh.maxScore, 100);
    assert.equal(fresh.questionIds.length, 20);
    const { token: learner } = await request('/api/auth/login', '', 'POST', { username: 'csp_paper_test', password: 'test123456' });
    const bank = await loadQuestionBank();
    const answersFor = id => Object.fromEntries(bank.get(id).parts.map(p => [p.id, p.answers]));
    const studentUrl = `/api/csp-papers/student/assignments/${fresh.id}`;
    for (const id of fresh.questionIds) {
      const submitted = await request(`${studentUrl}/questions/${id}/submit`, learner, 'POST', { answers: answersFor(id) });
      assert.equal(submitted.score, undefined, '解析未开放时不能泄露得分');
    }
    let detail = await request(studentUrl, learner);
    assert.equal(detail.submittedCount, 20);
    assert.ok(detail.completedAt);
    assert.ok(Object.values(detail.submissions).every(s => s.score === undefined && s.parts === undefined));

    // The corrected image key is B/D/C/A/D, not the broken Markdown's shifted options.
    const lastId = '2026-completion-2';
    const wrongAnswers = { ...answersFor(lastId), '2026-completion-2-5': ['A'] };
    await request(`${studentUrl}/questions/${lastId}/submit`, learner, 'POST', { answers: wrongAnswers });
    await request(`/api/csp-papers/assignments/${fresh.id}/release`, teacher, 'POST', {});
    detail = await request(studentUrl, learner);
    assert.equal(detail.submissions[lastId].score, 12);
    assert.deepEqual(detail.submissions[lastId].parts.map(p => p.correctAnswers), [['B'],['D'],['C'],['A'],['D']]);
    const scores = Object.entries(detail.submissions).reduce((result, [id, submission]) => {
      const kind = id.split('-')[1];
      result[kind] = (result[kind] || 0) + submission.score;
      return result;
    }, {});
    assert.deepEqual(scores, { choice: 30, reading: 40, completion: 27 });
    const list = await request('/api/csp-papers/student/assignments', learner);
    assert.equal(list.find(p => p.id === fresh.id).score, 97);
    assert.equal(list.find(p => p.id === fresh.id).maxScore, 100);
    console.log('PASS: CSP-J 2026 catalog/homework, 20 questions, hidden results before release, corrected answer grading and 30/40/30 section scores.');
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
