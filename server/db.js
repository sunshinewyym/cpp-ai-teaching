const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'app.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode=WAL');
db.exec('PRAGMA foreign_keys=ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    class_name TEXT DEFAULT '',
    role TEXT CHECK(role IN ('student','teacher')) DEFAULT 'student',
    is_admin INTEGER DEFAULT 0,
    created_by INTEGER DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS practice_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    level TEXT NOT NULL,
    year INTEGER NOT NULL,
    question_type TEXT NOT NULL,
    total_score REAL NOT NULL,
    max_score REAL NOT NULL,
    answers_json TEXT NOT NULL,
    duration_seconds INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS training_courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_json TEXT NOT NULL,
    variant TEXT NOT NULL DEFAULT 'advanced',
    active INTEGER NOT NULL DEFAULT 1,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS training_day_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(course_id, day_number, student_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS training_question_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES training_day_assignments(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    answers_json TEXT NOT NULL,
    score REAL NOT NULL,
    max_score REAL NOT NULL,
    duration_seconds INTEGER,
    submitted_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(assignment_id, question_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS training_question_attempts (
    assignment_id INTEGER NOT NULL REFERENCES training_day_assignments(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    started_at TEXT DEFAULT (datetime('now','localtime')),
    PRIMARY KEY (assignment_id, question_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS training_programming_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES training_day_assignments(id) ON DELETE CASCADE,
    program_id TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 1,
    note TEXT DEFAULT '',
    marked_by INTEGER REFERENCES users(id),
    marked_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(assignment_id, program_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS training_question_releases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    question_id TEXT NOT NULL,
    released_by INTEGER NOT NULL REFERENCES users(id),
    released_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(course_id, day_number, question_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS feedback_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL REFERENCES users(id),
    student_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT DEFAULT '',
    topic TEXT DEFAULT '',
    problem_ids TEXT DEFAULT '',
    performance TEXT DEFAULT '',
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )
`);

// 迁移：如果旧表缺少新字段，自动添加（必须在建索引之前）
const columns = db.prepare("PRAGMA table_info(users)").all();
const colNames = columns.map(c => c.name);
if (!colNames.includes('is_admin')) {
  db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
  console.log('[DB] 迁移: 添加 is_admin 字段');
}
if (!colNames.includes('created_by')) {
  db.exec('ALTER TABLE users ADD COLUMN created_by INTEGER DEFAULT NULL');
  console.log('[DB] 迁移: 添加 created_by 字段');
}
if (!colNames.includes('feedback_style')) {
  db.exec("ALTER TABLE users ADD COLUMN feedback_style TEXT DEFAULT ''");
  console.log('[DB] 迁移: 添加 feedback_style 字段');
}

const submissionColumns = db.prepare("PRAGMA table_info(training_question_submissions)").all();
if (!submissionColumns.some(column => column.name === 'duration_seconds')) {
  db.exec('ALTER TABLE training_question_submissions ADD COLUMN duration_seconds INTEGER');
  console.log('[DB] 迁移: 添加集训题答题用时字段');
}

const practiceColumns = db.prepare("PRAGMA table_info(practice_records)").all();
if (!practiceColumns.some(column => column.name === 'training_submission_id')) {
  db.exec('ALTER TABLE practice_records ADD COLUMN training_submission_id INTEGER');
  console.log('[DB] 迁移: 添加集训练习记录关联字段');
}

const trainingCourseColumns = db.prepare("PRAGMA table_info(training_courses)").all();
if (!trainingCourseColumns.some(column => column.name === 'variant')) {
  db.exec("ALTER TABLE training_courses ADD COLUMN variant TEXT NOT NULL DEFAULT 'advanced'");
  console.log('[DB] 迁移: 添加集训课程 variant 字段');
}
if (!trainingCourseColumns.some(column => column.name === 'assignment_questions_json')) {
  db.exec("ALTER TABLE training_courses ADD COLUMN assignment_questions_json TEXT NOT NULL DEFAULT '{}'");
  console.log('[DB] 迁移: 添加本日布置题目配置字段');
}

// 迁移：Day 2 编程题改用 CSP-J 复赛洛谷题；只更新旧默认题单且保留已有作答。
const day2ProgrammingTarget = {
  basic: [],
  advanced: [],
  luoguBasic: ['P7071', 'P7909'],
  luoguAdvanced: ['P7072', 'P8814'],
};
const day2ProgrammingOld = {
  advanced: [
    { basic: ['P1020', 'P1027', 'P1028'], advanced: ['P1109', 'P1390', 'P1418'], luoguBasic: ['P5710', 'P5723'], luoguAdvanced: ['P1149', 'P1865'] },
  ],
  progress: [
    { basic: ['P1288', 'P1293'], advanced: ['P1359', 'P1547'], luoguBasic: [], luoguAdvanced: [] },
    { basic: ['P1288', 'P1293'], advanced: ['P1359', 'P1547'], luoguBasic: ['P5710', 'P5723'], luoguAdvanced: ['P1149', 'P1865'] },
  ],
};
const sameProgrammingList = (left, right) => JSON.stringify(left || []) === JSON.stringify(right);
const day2Courses = db.prepare('SELECT id, variant, content_json FROM training_courses WHERE active = 1').all();
const updateDay2Course = db.prepare(
  "UPDATE training_courses SET content_json = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
);
for (const course of day2Courses) {
  const content = JSON.parse(course.content_json);
  const day = (content.days || []).find(item => Number(item.day) === 2);
  const programming = day?.programming || {};
  const variant = course.variant === 'progress' ? 'progress' : 'advanced';
  const isOldDefault = day2ProgrammingOld[variant].some(old =>
    sameProgrammingList(programming.basic, old.basic)
    && sameProgrammingList(programming.advanced, old.advanced)
    && sameProgrammingList(programming.luoguBasic, old.luoguBasic)
    && sameProgrammingList(programming.luoguAdvanced, old.luoguAdvanced)
  );
  if (!day || !isOldDefault) continue;
  const submitted = db.prepare(`
    SELECT COUNT(*) AS count
    FROM training_question_submissions s
    JOIN training_day_assignments a ON a.id = s.assignment_id
    WHERE a.course_id = ? AND a.day_number = 2
  `).get(course.id).count;
  const marked = db.prepare(`
    SELECT COUNT(*) AS count
    FROM training_programming_completions c
    JOIN training_day_assignments a ON a.id = c.assignment_id
    WHERE a.course_id = ? AND a.day_number = 2 AND c.completed = 1
  `).get(course.id).count;
  if (Number(submitted) || Number(marked)) continue;
  day.programming = JSON.parse(JSON.stringify(day2ProgrammingTarget));
  updateDay2Course.run(JSON.stringify(content), course.id);
  console.log(`[DB] 迁移: 更新课程 ${course.id} 的 Day 2 编程题`);
}

// 确保 admin 账号拥有管理员权限（兼容旧数据）
db.exec("UPDATE users SET is_admin = 1 WHERE username = 'admin' AND role = 'teacher' AND is_admin = 0");

db.exec('CREATE INDEX IF NOT EXISTS idx_records_user ON practice_records(user_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_records_created ON practice_records(created_at)');
db.exec('CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by)');
db.exec('CREATE INDEX IF NOT EXISTS idx_feedback_student ON feedback_records(student_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_feedback_teacher ON feedback_records(teacher_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_training_courses_active ON training_courses(active)');
db.exec('CREATE INDEX IF NOT EXISTS idx_training_assignments_student ON training_day_assignments(student_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_training_assignments_course_day ON training_day_assignments(course_id, day_number)');
db.exec('CREATE INDEX IF NOT EXISTS idx_training_submissions_assignment ON training_question_submissions(assignment_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_training_releases_course_day ON training_question_releases(course_id, day_number)');
db.exec('CREATE INDEX IF NOT EXISTS idx_training_programming_completion_assignment ON training_programming_completions(assignment_id)');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_records_training_submission ON practice_records(training_submission_id) WHERE training_submission_id IS NOT NULL');

// 如果没有老师账号，创建默认 admin
const bcrypt = require('bcryptjs');
const teacherCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE role = ?').get('teacher');
if (teacherCount.cnt === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password_hash, name, role, is_admin) VALUES (?, ?, ?, ?, ?)').run('admin', hash, '管理员', 'teacher', 1);
  console.log('[DB] 已创建默认管理员账号: admin / admin123');
}

module.exports = db;
