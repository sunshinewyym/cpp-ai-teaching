const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-training-course-'));
process.env.DATA_DIR = testDataDir;

const app = require('../app');
const db = require('../db');

async function main() {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(url, { method = 'GET', token = '', body } = {}) {
    const response = await fetch(`${baseUrl}${url}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    return { response, data };
  }

  try {
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'admin123' },
    });
    assert.equal(adminLogin.response.status, 200);

    const created = await request('/api/auth/teachers', {
      method: 'POST',
      token: adminLogin.data.token,
      body: { username: 'course_teacher', password: '123456', name: '课程老师' },
    });
    assert.equal(created.response.status, 200);

    const assigned = await request(`/api/training-courses/assign/${created.data.id}`, {
      method: 'POST',
      token: adminLogin.data.token,
      body: { variant: 'progress' },
    });
    assert.equal(assigned.response.status, 200);
    assert.equal(assigned.data.variant, 'progress');

    const teacherLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'course_teacher', password: '123456' },
    });
    const teacherToken = teacherLogin.data.token;

    const accessBefore = await request('/api/training-courses/access', { token: teacherToken });
    assert.equal(accessBefore.data.hasAccess, true);

    const course = await request('/api/training-courses/me', { token: teacherToken });
    assert.equal(course.data.days.length, 10);
    assert.equal(course.data.variant, 'progress');

    const switchedToAdvanced = await request(`/api/training-courses/assign/${created.data.id}`, {
      method: 'POST',
      token: adminLogin.data.token,
      body: { variant: 'advanced' },
    });
    assert.equal(switchedToAdvanced.response.status, 200);
    course.data.title = '教师修改后的集训课程';

    const saved = await request('/api/training-courses/me', {
      method: 'PUT',
      token: teacherToken,
      body: course.data,
    });
    assert.equal(saved.response.status, 200);
    assert.equal(saved.data.title, '教师修改后的集训课程');

    const studentA = await request('/api/auth/students', {
      method: 'POST',
      token: teacherToken,
      body: { username: 'course_student_a', password: '123456', name: '学生甲', class_name: '集训一班' },
    });
    const studentB = await request('/api/auth/students', {
      method: 'POST',
      token: teacherToken,
      body: { username: 'course_student_b', password: '123456', name: '学生乙', class_name: '集训一班' },
    });
    assert.equal(studentA.response.status, 200);
    assert.equal(studentB.response.status, 200);

    const day = saved.data.days[0];
    const questionId = day.questions.choice[0];
    const published = await request(`/api/training-courses/days/${day.day}/assignments`, {
      method: 'POST',
      token: teacherToken,
      body: { studentIds: [studentA.data.id, studentB.data.id] },
    });
    assert.equal(published.response.status, 200);
    assert.equal(published.data.students.length, 2);
    assert.equal(published.data.questions.find(item => item.questionId === questionId).total, 2);

    const loginStudent = username => request('/api/auth/login', {
      method: 'POST',
      body: { username, password: '123456' },
    });
    const studentALogin = await loginStudent('course_student_a');
    const studentBLogin = await loginStudent('course_student_b');
    const studentAccess = await request('/api/training-courses/student/access', {
      token: studentALogin.data.token,
    });
    assert.equal(studentAccess.data.hasAccess, true);

    const answer = { [questionId]: ['C'] };
    const started = await request(
      `/api/training-courses/student/courses/${saved.data.id}/days/${day.day}/questions/${questionId}/start`,
      { method: 'POST', token: studentALogin.data.token }
    );
    assert.equal(started.response.status, 200);
    db.exec("UPDATE training_question_attempts SET started_at = datetime('now','localtime','-30 seconds')");
    const firstSubmit = await request(
      `/api/training-courses/student/courses/${saved.data.id}/days/${day.day}/questions/${questionId}/submit`,
      { method: 'POST', token: studentALogin.data.token, body: { answers: answer } }
    );
    assert.equal(firstSubmit.response.status, 200);
    assert.equal(firstSubmit.data.leaderboardEligible, true);

    const revisedSubmit = await request(
      `/api/training-courses/student/courses/${saved.data.id}/days/${day.day}/questions/${questionId}/submit`,
      { method: 'POST', token: studentALogin.data.token, body: { answers: { [questionId]: ['D'] } } }
    );
    assert.equal(revisedSubmit.response.status, 200);
    assert.equal(revisedSubmit.data.recordId, firstSubmit.data.recordId);
    const storedSubmission = db.prepare(`
      SELECT answers_json, score FROM training_question_submissions
      WHERE assignment_id = (SELECT id FROM training_day_assignments WHERE course_id = ? AND day_number = ? AND student_id = ?)
        AND question_id = ?
    `).get(saved.data.id, day.day, studentA.data.id, questionId);
    assert.deepEqual(JSON.parse(storedSubmission.answers_json)[questionId], ['D']);
    assert.equal(storedSubmission.score, 0);
    const storedRecord = db.prepare(
      'SELECT training_submission_id, answers_json FROM practice_records WHERE id = ?'
    ).get(Number(revisedSubmit.data.recordId));
    assert.ok(storedRecord.training_submission_id);
    assert.equal(JSON.parse(storedRecord.answers_json).questions[0].correct, false);
    assert.equal(
      db.prepare('SELECT COUNT(*) AS count FROM practice_records WHERE user_id = ?')
        .get(studentA.data.id).count,
      1
    );

    const earlyRelease = await request(
      `/api/training-courses/days/${day.day}/questions/${questionId}/release`,
      { method: 'POST', token: teacherToken, body: {} }
    );
    assert.equal(earlyRelease.response.status, 409);

    const secondSubmit = await request(
      `/api/training-courses/student/courses/${saved.data.id}/days/${day.day}/questions/${questionId}/submit`,
      { method: 'POST', token: studentBLogin.data.token, body: { answers: { [questionId]: ['D'] } } }
    );
    assert.equal(secondSubmit.response.status, 200);
    assert.equal(secondSubmit.data.leaderboardEligible, false);

    // Simulate a submission created before the practice-record sync was added.
    db.prepare('DELETE FROM practice_records WHERE user_id = ?').run(studentA.data.id);
    const studentAHistory = await request('/api/practice/my-history', { token: studentALogin.data.token });
    const studentBHistory = await request('/api/practice/my-history', { token: studentBLogin.data.token });
    assert.equal(studentAHistory.data.length, 1);
    assert.match(studentAHistory.data[0].level, /^(?:CSP-[JS]|GESP-[2-8])$/);
    assert.equal(studentAHistory.data[0].question_type, 'choice');
    assert.equal(studentAHistory.data[0].answers.questions[0].correct, false);
    assert.equal(studentBHistory.data.length, 1);
    assert.equal(studentBHistory.data[0].answers.questions[0].correct, false);

    const assignmentDetails = await request(
      `/api/training-courses/days/${day.day}/assignments`,
      { token: teacherToken }
    );
    const questionDetails = assignmentDetails.data.questions.find(item => item.questionId === questionId).details;
    assert.equal(questionDetails.length, 2);
    assert.ok(questionDetails.every(item => item.submitted));
    assert.equal(questionDetails.filter(item => item.correct).length, 0);
    assert.equal(questionDetails.filter(item => item.correct === false).length, 2);
    assert.ok(questionDetails.some(item => item.answers[questionId]?.[0] === 'D'));

    const released = await request(
      `/api/training-courses/days/${day.day}/questions/${questionId}/release`,
      { method: 'POST', token: teacherToken, body: {} }
    );
    assert.equal(released.response.status, 200);

    const afterReleaseSubmit = await request(
      `/api/training-courses/student/courses/${saved.data.id}/days/${day.day}/questions/${questionId}/submit`,
      { method: 'POST', token: studentALogin.data.token, body: { answers: answer } }
    );
    assert.equal(afterReleaseSubmit.response.status, 409);

    const studentCourse = await request('/api/training-courses/student', {
      token: studentALogin.data.token,
    });
    const questionState = studentCourse.data.courses[0].days[0].states[questionId];
    assert.equal(questionState.submitted, true);
    assert.equal(questionState.released, true);
    assert.equal(typeof questionState.score, 'number');

    const removedAnswered = structuredClone(saved.data);
    removedAnswered.days[0].questions.choice = removedAnswered.days[0].questions.choice
      .filter(id => id !== questionId);
    const rejectedRemoval = await request('/api/training-courses/me', {
      method: 'PUT',
      token: teacherToken,
      body: removedAnswered,
    });
    assert.equal(rejectedRemoval.response.status, 409);

    const courseWithNewQuestion = structuredClone(saved.data);
    courseWithNewQuestion.days[0].questions.choice.push('2025-choice-1');
    const addedQuestion = await request('/api/training-courses/me', {
      method: 'PUT',
      token: teacherToken,
      body: courseWithNewQuestion,
    });
    assert.equal(addedQuestion.response.status, 200);
    const progressAfterAdd = await request(
      `/api/training-courses/days/${day.day}/assignments`,
      { token: teacherToken }
    );
    assert.equal(
      progressAfterAdd.data.questions.find(item => item.questionId === '2025-choice-1').submitted,
      0
    );

    const refreshedSameVariant = await request(`/api/training-courses/assign/${created.data.id}`, {
      method: 'POST',
      token: adminLogin.data.token,
      body: { variant: 'advanced' },
    });
    assert.equal(refreshedSameVariant.response.status, 200);
    const refreshedCourse = await request('/api/training-courses/me', { token: teacherToken });
    assert.ok(refreshedCourse.data.days[0].questions.choice.includes(questionId));
    assert.equal(refreshedCourse.data.days[0].questions.choice.includes('2025-choice-1'), false);

    const revoked = await request(`/api/training-courses/assign/${created.data.id}`, {
      method: 'DELETE',
      token: adminLogin.data.token,
    });
    assert.equal(revoked.response.status, 200);

    const accessAfter = await request('/api/training-courses/access', { token: teacherToken });
    assert.equal(accessAfter.data.hasAccess, false);

    await request(`/api/training-courses/assign/${created.data.id}`, {
      method: 'POST',
      token: adminLogin.data.token,
      body: {},
    });
    const restored = await request('/api/training-courses/me', { token: teacherToken });
    assert.equal(restored.data.variant, 'advanced');
    assert.equal(restored.data.days.length, 10);

    console.log('training course API verified: course access, daily assignment, question submit/release and protected updates passed');
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
