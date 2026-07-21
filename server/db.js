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

// 确保 admin 账号拥有管理员权限（兼容旧数据）
db.exec("UPDATE users SET is_admin = 1 WHERE username = 'admin' AND role = 'teacher' AND is_admin = 0");

db.exec('CREATE INDEX IF NOT EXISTS idx_records_user ON practice_records(user_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_records_created ON practice_records(created_at)');
db.exec('CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by)');
db.exec('CREATE INDEX IF NOT EXISTS idx_feedback_student ON feedback_records(student_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_feedback_teacher ON feedback_records(teacher_id)');

// 如果没有老师账号，创建默认 admin
const bcrypt = require('bcryptjs');
const teacherCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE role = ?').get('teacher');
if (teacherCount.cnt === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password_hash, name, role, is_admin) VALUES (?, ?, ?, ?, ?)').run('admin', hash, '管理员', 'teacher', 1);
  console.log('[DB] 已创建默认管理员账号: admin / admin123');
}

module.exports = db;
