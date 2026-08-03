const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-feedback-'));
process.env.DATA_DIR = testDataDir;

const db = require('./db');
const { loadQuestionBank } = require('./training/questionBank');
const {
  buildDailyPracticeSummary,
  formatPracticeMaterial,
} = require('./routes/feedback');

async function main() {
  const teacher = db.prepare(`
    INSERT INTO users (username, password_hash, name, role, is_admin)
    VALUES ('feedback_teacher', 'hash', 'Feedback Teacher', 'teacher', 1)
  `).run();
  const teacherId = Number(teacher.lastInsertRowid);
  const student = db.prepare(`
    INSERT INTO users (username, password_hash, name, role, created_by)
    VALUES ('feedback_student', 'hash', 'Feedback Student', 'student', ?)
  `).run(teacherId);
  const studentId = Number(student.lastInsertRowid);

  db.prepare(`
    INSERT INTO practice_records
      (user_id, level, year, question_type, total_score, max_score, answers_json, created_at)
    VALUES (?, 'GESP-3', 2026, 'choice', 2, 3, ?, '2026-08-03 10:00:00')
  `).run(studentId, JSON.stringify({
    session: '2026-08',
    questions: [
      { id: 'q1', number: 1, correct: true, score: 1, user_answer_label: 'A', correct_answer_label: 'A' },
      { id: 'q2', number: 2, correct: false, score: 0, user_answer_label: 'B', correct_answer_label: 'C' },
      { id: 'q3', number: 3, correct: true, score: 1, user_answer_label: 'D', correct_answer_label: 'D' },
    ],
  }));

  const bank = await loadQuestionBank();
  const trainingQuestion = bank.get('2019-choice-1');
  assert.ok(trainingQuestion, 'question bank should include the training test question');
  const course = db.prepare(`
    INSERT INTO training_courses (teacher_id, title, content_json, variant)
    VALUES (?, 'Feedback course', '{}', 'advanced')
  `).run(teacherId);
  const assignment = db.prepare(`
    INSERT INTO training_day_assignments (course_id, teacher_id, day_number, student_id)
    VALUES (?, ?, 1, ?)
  `).run(Number(course.lastInsertRowid), teacherId, studentId);
  db.prepare(`
    INSERT INTO training_question_submissions
      (assignment_id, question_id, answers_json, score, max_score, submitted_at)
    VALUES (?, '2019-choice-1', ?, ?, ?, '2026-08-03 14:00:00')
  `).run(
    Number(assignment.lastInsertRowid),
    JSON.stringify({ '2019-choice-1': [trainingQuestion.parts[0].answers[0]] }),
    trainingQuestion.parts[0].score,
    trainingQuestion.parts[0].score
  );

  const summary = await buildDailyPracticeSummary(studentId, '2026-08-03');
  assert.equal(summary.hasRecords, true);
  assert.equal(summary.totalRecords, 2);
  assert.equal(summary.totalQuestions, 4);
  assert.equal(summary.correctQuestions, 3);
  assert.equal(summary.accuracyPercent, 75);
  assert.equal(summary.wrongQuestions.length, 1);
  assert.match(formatPracticeMaterial(summary), /第2小问错误/);
  assert.match(formatPracticeMaterial(summary), /学生答案：B/);

  const emptySummary = await buildDailyPracticeSummary(studentId, '2026-08-04');
  assert.equal(emptySummary.hasRecords, false);
  assert.equal(emptySummary.totalQuestions, 0);
  assert.match(emptySummary.message, /半天/);
  assert.match(formatPracticeMaterial(emptySummary), /不要据此推断/);

  console.log('feedback summary tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
