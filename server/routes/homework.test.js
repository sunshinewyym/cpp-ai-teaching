const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'noip-homework-test-'));
process.env.DATA_DIR = testDataDir;
// Model an already-migrated installation. This empty fixture has no historical
// CSP papers to regrade; that unrelated legacy migration assumes an older schema.
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
    const student = await request('/api/auth/students', teacher, 'POST', { username: 'noip_test', password: 'test123456', name: 'NOIP 测试学生' });
    const { token: learner } = await request('/api/auth/login', '', 'POST', { username: 'noip_test', password: 'test123456' });

    const { items: catalog } = await request('/api/homework/catalog', teacher);
    const { items: noip } = await request('/api/homework/catalog?level=NOIP', teacher);
    assert.equal(noip.length, 20);
    assert.equal(noip.filter(q => q.type === 'reading').length, 10);
    assert.equal(noip.filter(q => q.type === 'completion').length, 10);
    assert.deepEqual([...new Set(noip.map(q => q.year))].sort(), [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018]);
    assert.ok(noip.every(q => q.level === 'NOIP' && q.source === 'NOIP' && q.session === String(q.year) && q.tags.length));
    assert.deepEqual([...new Set(catalog.filter(q => q.level === 'CSP-J').map(q => q.year))].sort(), [2019, 2020, 2021, 2022, 2023, 2024, 2025]);
    for (const type of ['reading', 'completion']) {
      const { items } = await request(`/api/homework/catalog?level=NOIP&type=${type}`, teacher);
      assert.equal(items.length, 10);
      assert.ok(items.every(q => q.type === type));
    }
    const first = noip.find(q => q.type === 'reading');
    const query = new URLSearchParams({ level: 'NOIP', year: first.session, type: first.type, tag: first.tags[0] });
    const { items: filtered } = await request(`/api/homework/catalog?${query}`, teacher);
    assert.ok(filtered.some(q => q.id === first.id));
    assert.ok(filtered.every(q => q.year === first.year && q.type === first.type && q.tags.includes(first.tags[0])));
    await request('/api/homework/catalog?level=NOIP', learner, 'GET', undefined, 403);

    // Mix both NOIP types with existing banks to exercise the same assignment flow.
    const chosen = [first, noip.find(q => q.type === 'completion'), catalog.find(q => q.level === 'CSP-J' && q.type === 'choice'), catalog.find(q => q.source === 'GESP')];
    const questionIds = chosen.map(q => q.id);
    const { id } = await request('/api/homework/assignments', teacher, 'POST', {
      title: 'NOIP 混合作业测试', studentIds: [student.id], questionIds, lockPractice: true,
    }, 201);
    const studentUrl = `/api/homework/student/assignments/${id}`;
    let detail = await request(studentUrl, learner);
    assert.deepEqual(detail.questions.map(q => q.id), questionIds);
    assert.equal(detail.score, null);
    for (const q of detail.questions) {
      assert.equal(q.answer, undefined);
      assert.ok((q.questions || []).every(part => part.answers === undefined && part.explanation === undefined));
    }

    const pending = await request('/api/practice/csp-lock?level=NOIP', learner);
    assert.deepEqual(new Set(pending.questionIds), new Set(questionIds.slice(0, 2)));
    const practiceAttempt = { level: 'NOIP', year: 'NOIP', question_type: 'reading', total_score: 0, max_score: first.maxScore, answers: { questions: [{ id: detail.questions[0].questions[0].id }] } };
    for (const endpoint of ['submit', 'analyze']) {
      const blocked = await request(`/api/practice/${endpoint}`, learner, 'POST', practiceAttempt, 423);
      assert.equal(blocked.code, 'HOMEWORK_QUESTION_LOCKED');
    }

    const bank = await loadQuestionBank();
    for (const question of chosen) {
      const def = bank.get(question.id);
      const answers = Object.fromEntries(def.parts.map(part => [part.id, part.answers]));
      const questionUrl = `${studentUrl}/questions/${question.id}`;
      await request(questionUrl, learner, 'PUT', { answers });
      const draft = await request(studentUrl, learner);
      assert.deepEqual(draft.submissions[question.id].answers, answers);
      const submitted = await request(`${questionUrl}/submit`, learner, 'POST', { answers, durationSeconds: 60 });
      assert.equal(submitted.score, question.maxScore);
      assert.equal(submitted.maxScore, question.maxScore);
      assert.equal(submitted.parts, undefined);
      // Re-submission must update a record rather than duplicate it.
      await request(`${questionUrl}/submit`, learner, 'POST', { answers, durationSeconds: 65 });
      const record = db.prepare('SELECT * FROM practice_records WHERE user_id = ? AND level = ? AND question_type = ?').get(student.id, question.level, question.type);
      assert.equal(record.year, question.year);
      assert.equal(record.total_score, question.maxScore);
      assert.equal(record.duration_seconds, 65);
      assert.equal(JSON.parse(record.answers_json).source, '课后作业');
      if (question.level === 'NOIP') assert.equal(draft.questions.find(q => q.id === question.id).statement, def.statement);
    }
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM practice_records WHERE user_id = ?').get(student.id).count, chosen.length);
    const task = (await request('/api/homework/student/assignments', learner)).find(item => item.id === id);
    assert.equal(task.completed, true);
    const teacherDetail = await request(`/api/homework/assignments/${id}`, teacher);
    assert.ok(teacherDetail.stats.every(stat => stat.submitted === 1 && stat.averagePercent === 100));
    await request(`/api/homework/assignments/${id}/release`, teacher, 'POST', {});
    detail = await request(studentUrl, learner);
    assert.equal(detail.score, chosen.reduce((sum, q) => sum + q.maxScore, 0));
    assert.ok(detail.questions.slice(0, 2).every(q => q.questions.every(part => part.answers.length && part.explanation)));
    assert.deepEqual((await request('/api/practice/csp-lock?level=NOIP', learner)).questionIds, []);
    console.log('PASS: NOIP 10 reading + 10 completion; year/tag filters; mixed homework; draft/submit/grading; records; answer locks and release.');
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
    const relative = path.relative(os.tmpdir(), testDataDir);
    if (!path.isAbsolute(relative) && relative.startsWith('noip-homework-test-') && !relative.includes(path.sep)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
