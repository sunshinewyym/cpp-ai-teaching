const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-leaderboard-'));
process.env.DATA_DIR = testDataDir;

const app = require('./app');
const db = require('./db');
const {
  minimumDurationSeconds,
  isLeaderboardDurationValid,
} = require('./leaderboardRules');

async function main() {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function request(url, { method = 'GET', token = '', body } = {}) {
    const response = await fetch(`${baseUrl}${url}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { response, data: await response.json() };
  }

  try {
    assert.equal(minimumDurationSeconds('choice', 15), 240);
    assert.equal(minimumDurationSeconds('judgment', 10), 120);
    assert.equal(minimumDurationSeconds('reading', 5), 225);
    assert.equal(isLeaderboardDurationValid('choice', 15, 180), false);
    assert.equal(isLeaderboardDurationValid('choice', 15, 240), true);

    const admin = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'admin123' },
    });
    const teacher = await request('/api/auth/teachers', {
      method: 'POST',
      token: admin.data.token,
      body: { username: 'rank_teacher', password: '123456', name: '排行榜教师' },
    });
    await request(`/api/training-courses/assign/${teacher.data.id}`, {
      method: 'POST',
      token: admin.data.token,
      body: {},
    });
    const teacherLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'rank_teacher', password: '123456' },
    });

    const studentA = await request('/api/auth/students', {
      method: 'POST',
      token: teacherLogin.data.token,
      body: { username: 'rank_a', password: '123456', name: '学生甲', class_name: '一班' },
    });
    const studentB = await request('/api/auth/students', {
      method: 'POST',
      token: teacherLogin.data.token,
      body: { username: 'rank_b', password: '123456', name: '学生乙', class_name: '二班' },
    });
    const loginA = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'rank_a', password: '123456' },
    });

    const course = db.prepare('SELECT * FROM training_courses WHERE teacher_id = ?').get(teacher.data.id);
    const content = JSON.parse(course.content_json);
    if (!content.days[0].questions.choice.includes('2025-choice-1')) {
      content.days[0].questions.choice.push('2025-choice-1');
      db.prepare('UPDATE training_courses SET content_json = ? WHERE id = ?')
        .run(JSON.stringify(content), course.id);
    }
    const assignment = db.prepare(`
      INSERT INTO training_day_assignments (course_id, teacher_id, day_number, student_id)
      VALUES (?, ?, 1, ?)
    `).run(course.id, teacher.data.id, studentA.data.id);
    db.prepare(`
      INSERT INTO training_question_submissions
        (assignment_id, question_id, answers_json, score, max_score, submitted_at)
      VALUES (?, '2025-choice-1', ?, 1, 1, '2026-07-20 09:00:00')
    `).run(Number(assignment.lastInsertRowid), JSON.stringify({ '2025-choice-1': ['A'] }));

    const questionsA = Array.from({ length: 10 }, (_, index) => ({
      id: `2025-choice-${index + 1}`,
      number: index + 1,
      correct: index >= 1 && index <= 7,
    }));
    db.prepare(`
      INSERT INTO practice_records
        (user_id, level, year, question_type, total_score, max_score, answers_json, created_at)
      VALUES (?, 'CSP-J', 2025, 'choice', 14, 20, ?, '2026-07-20 10:00:00')
    `).run(studentA.data.id, JSON.stringify({ questions: questionsA }));
    db.prepare(`
      INSERT INTO practice_records
        (user_id, level, year, question_type, total_score, max_score, answers_json, created_at)
      VALUES (?, 'CSP-J', 2025, 'choice', 2, 6, ?, '2026-07-20 11:00:00')
    `).run(studentA.data.id, JSON.stringify({
      questions: [
        { id: '2025-choice-1', number: 1, correct: true },
        { id: '2025-choice-2', number: 2, correct: false },
        { id: '2025-choice-11', number: 11, correct: true },
      ],
    }));
    db.prepare(`
      INSERT INTO practice_records
        (user_id, level, year, question_type, total_score, max_score, answers_json, created_at)
      VALUES (?, 'CSP-J', 2025, 'choice', 20, 20, ?, '2026-07-20 10:00:00')
    `).run(studentB.data.id, JSON.stringify({
      questions: Array.from({ length: 10 }, (_, index) => ({
        id: `2025-choice-${index + 1}`,
        number: index + 1,
        correct: true,
      })),
    }));
    db.prepare(`
      INSERT INTO practice_records
        (user_id, level, year, question_type, total_score, max_score, answers_json, duration_seconds, created_at)
      VALUES (?, 'CSP-J', 2025, 'choice', 2, 2, ?, 8, '2026-07-20 11:30:00')
    `).run(studentA.data.id, JSON.stringify({
      questions: [{ id: '2025-choice-12', number: 12, correct: true }],
    }));
    db.prepare(`
      INSERT INTO training_question_submissions
        (assignment_id, question_id, answers_json, score, max_score, duration_seconds, submitted_at)
      VALUES (?, '2025-choice-13', ?, 1, 1, 3, '2026-07-20 11:40:00')
    `).run(Number(assignment.lastInsertRowid), JSON.stringify({ '2025-choice-13': ['A'] }));

    db.prepare(`
      INSERT INTO practice_records
        (user_id, level, year, question_type, total_score, max_score, answers_json, duration_seconds, created_at)
      VALUES (?, 'GESP-2', 2026, 'judgment', 2, 4, ?, 30, '2026-07-20 11:50:00')
    `).run(studentA.data.id, JSON.stringify({
      session: '2026-06',
      questions: [
        { id: 'gesp-cpp2-2026-06-judgment-1', number: 1, correct: true },
        { id: 'gesp-cpp2-2026-06-judgment-2', number: 2, correct: false },
      ],
    }));

    const teacherBoard = await request('/api/leaderboard?level=J&period=all', {
      token: teacherLogin.data.token,
    });
    assert.equal(teacherBoard.response.status, 200);
    const teacherA = teacherBoard.data.rows.find(item => item.id === studentA.data.id);
    const teacherB = teacherBoard.data.rows.find(item => item.id === studentB.data.id);
    assert.deepEqual(
      [teacherA.solvedCount, teacherA.correctCount, teacherA.practiceRank, teacherA.accuracyRank],
      [13, 11, 1, 2]
    );
    assert.deepEqual(
      [teacherB.solvedCount, teacherB.correctCount, teacherB.practiceRank, teacherB.accuracyRank],
      [10, 10, 2, 1]
    );

    const studentBoardBeforeRelease = await request('/api/leaderboard?level=J&period=all', {
      token: loginA.data.token,
    });
    const hiddenA = studentBoardBeforeRelease.data.rows.find(item => item.id === studentA.data.id);
    assert.deepEqual(
      [hiddenA.solvedCount, hiddenA.accuracyAnswered, hiddenA.correctCount],
      [13, 11, 9]
    );
    assert.equal(hiddenA.name, '学生甲');

    db.prepare(`
      INSERT INTO training_question_releases
        (course_id, day_number, question_id, released_by, released_at)
      VALUES (?, 1, '2025-choice-1', ?, '2026-07-20 12:00:00')
    `).run(course.id, teacher.data.id);
    const studentBoardAfterRelease = await request('/api/leaderboard?level=J&period=all', {
      token: loginA.data.token,
    });
    const visibleA = studentBoardAfterRelease.data.rows.find(item => item.id === studentA.data.id);
    assert.deepEqual(
      [visibleA.accuracyAnswered, visibleA.correctCount],
      [12, 10]
    );

    const classBoard = await request(
      `/api/leaderboard?level=J&period=all&class_name=${encodeURIComponent('一班')}`,
      { token: teacherLogin.data.token }
    );
    assert.equal(classBoard.data.rows.length, 1);
    assert.deepEqual(classBoard.data.classes, ['一班', '二班']);

    const assignmentB = db.prepare(`
      INSERT INTO training_day_assignments (course_id, teacher_id, day_number, student_id)
      VALUES (?, ?, 1, ?)
    `).run(course.id, teacher.data.id, studentB.data.id);
    const insertCspSMirror = (questionId, questionType, partCount, submittedAt) => {
      const parts = Array.from({ length: partCount }, (_, index) => ({
        id: partCount === 1 ? questionId : `${questionId}-${index + 1}`,
        number: partCount === 1
          ? Number(questionId.split('-').pop())
          : `${questionId.split('-').pop()}.${index + 1}`,
      }));
      const answers = Object.fromEntries(parts.map(part => [part.id, ['A']]));
      const submission = db.prepare(`
        INSERT INTO training_question_submissions
          (assignment_id, question_id, answers_json, score, max_score, submitted_at)
        VALUES (?, ?, ?, 0, ?, ?)
      `).run(
        Number(assignmentB.lastInsertRowid),
        questionId,
        JSON.stringify(answers),
        partCount,
        submittedAt
      );
      db.prepare(`
        INSERT INTO practice_records
          (user_id, level, year, question_type, total_score, max_score, answers_json, created_at, training_submission_id)
        VALUES (?, 'CSP-S', 2019, ?, 0, ?, ?, ?, ?)
      `).run(
        studentB.data.id,
        questionType,
        partCount,
        JSON.stringify({ questions: parts.map(part => ({ ...part, correct: false })) }),
        submittedAt,
        Number(submission.lastInsertRowid)
      );
    };
    insertCspSMirror('csp-s-2019-choice-3', 'choice', 1, '2026-07-20 08:00:00');
    insertCspSMirror('csp-s-2019-reading-1', 'reading', 6, '2026-07-20 08:01:00');
    insertCspSMirror('csp-s-2019-completion-2', 'completion', 5, '2026-07-20 08:02:00');

    const sBoard = await request('/api/leaderboard?level=S&period=all', {
      token: teacherLogin.data.token,
    });
    const sStudentA = sBoard.data.rows.find(item => item.id === studentA.data.id);
    const sStudentB = sBoard.data.rows.find(item => item.id === studentB.data.id);
    assert.equal(sStudentA.solvedCount, 0);
    assert.equal(sStudentB.solvedCount, 12);

    const gespBoard = await request('/api/leaderboard?level=GESP-2&period=all', {
      token: teacherLogin.data.token,
    });
    const gespA = gespBoard.data.rows.find(item => item.id === studentA.data.id);
    assert.deepEqual(
      [gespA.solvedCount, gespA.correctCount, gespA.accuracyAnswered],
      [2, 1, 2]
    );

    console.log('leaderboard verified: CSP/GESP grouping, deduplication, first attempt, rapid-answer inclusion, release visibility and class scope passed');
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
