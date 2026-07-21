const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth, requireTeacher, requireAdmin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role, class_name: user.class_name, is_admin: Boolean(user.is_admin) },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, class_name: user.class_name, is_admin: Boolean(user.is_admin) } });
});

// 修改密码
router.post('/change-password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请输入旧密码和新密码' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(401).json({ error: '旧密码错误' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ message: '密码修改成功' });
});

// === 老师账号管理（仅 admin） ===

// 创建老师
router.post('/teachers', auth, requireAdmin, (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: '用户名、密码、姓名不能为空' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: '用户名已存在' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password_hash, name, role, is_admin, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(username, hash, name, 'teacher', 0, req.user.id);
  res.json({ id: Number(result.lastInsertRowid), username, name });
});

// 获取老师列表
router.get('/teachers', auth, requireAdmin, (req, res) => {
  const teachers = db.prepare('SELECT id, username, name, created_at FROM users WHERE role = ? ORDER BY created_at').all('teacher');
  res.json(teachers);
});

// 删除老师（admin 不能删自己）
router.delete('/teachers/:id', auth, requireAdmin, (req, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: '不能删除自己的账号' });
  }
  const teacher = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(id, 'teacher');
  if (!teacher) return res.status(404).json({ error: '老师不存在' });
  // 同时删除该老师创建的学生及其记录
  const students = db.prepare('SELECT id FROM users WHERE created_by = ? AND role = ?').all(id, 'student');
  for (const s of students) {
    db.prepare('DELETE FROM practice_records WHERE user_id = ?').run(s.id);
  }
  db.prepare('DELETE FROM users WHERE created_by = ? AND role = ?').run(id, 'student');
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ message: '已删除该老师及其名下学生' });
});

// 重置老师密码
router.post('/teachers/:id/reset-password', auth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const password = newPassword || '123456';
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('UPDATE users SET password_hash = ? WHERE id = ? AND role = ?').run(hash, id, 'teacher');
  if (Number(result.changes) === 0) return res.status(404).json({ error: '老师不存在' });
  res.json({ message: '密码已重置' });
});

// === 学生账号管理（老师） ===

// 创建学生（自动关联 created_by）
router.post('/students', auth, requireTeacher, (req, res) => {
  const { username, password, name, class_name } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: '用户名、密码、姓名不能为空' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: '用户名已存在' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password_hash, name, class_name, role, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(username, hash, name, class_name || '', 'student', req.user.id);
  res.json({ id: Number(result.lastInsertRowid), username, name, class_name: class_name || '' });
});

// 批量创建学生
router.post('/students/batch', auth, requireTeacher, (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: '请提供学生列表' });
  }
  const insert = db.prepare('INSERT OR IGNORE INTO users (username, password_hash, name, class_name, role, created_by) VALUES (?, ?, ?, ?, ?, ?)');
  let created = 0;
  const errors = [];
  for (const s of students) {
    if (!s.username || !s.name) {
      errors.push({ username: s.username || '(空)', error: '用户名或姓名为空' });
      continue;
    }
    const password = s.password || '123456';
    const hash = bcrypt.hashSync(password, 10);
    const result = insert.run(s.username, hash, s.name, s.class_name || '', 'student', req.user.id);
    if (Number(result.changes) > 0) created++;
    else errors.push({ username: s.username, error: '用户名已存在' });
  }
  res.json({ created, errors });
});

// 获取学生列表（数据隔离：只看自己创建的）
router.get('/students', auth, requireTeacher, (req, res) => {
  let students;
  if (req.user.is_admin) {
    // admin 可以看所有学生
    students = db.prepare('SELECT id, username, name, class_name, created_by, created_at FROM users WHERE role = ? ORDER BY class_name, name').all('student');
  } else {
    students = db.prepare('SELECT id, username, name, class_name, created_by, created_at FROM users WHERE role = ? AND created_by = ? ORDER BY class_name, name').all('student', req.user.id);
  }
  res.json(students);
});

// 重置学生密码
router.post('/students/:id/reset-password', auth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const password = newPassword || '123456';
  const hash = bcrypt.hashSync(password, 10);
  // 非 admin 只能操作自己创建的学生
  let sql = 'UPDATE users SET password_hash = ? WHERE id = ? AND role = ?';
  const params = [hash, id, 'student'];
  if (!req.user.is_admin) {
    sql += ' AND created_by = ?';
    params.push(req.user.id);
  }
  const result = db.prepare(sql).run(...params);
  if (Number(result.changes) === 0) return res.status(404).json({ error: '学生不存在或无权限' });
  res.json({ message: '密码已重置' });
});

// 删除学生
router.delete('/students/:id', auth, requireTeacher, (req, res) => {
  const { id } = req.params;
  let sql = 'DELETE FROM users WHERE id = ? AND role = ?';
  const params = [id, 'student'];
  if (!req.user.is_admin) {
    sql += ' AND created_by = ?';
    params.push(req.user.id);
  }
  const result = db.prepare(sql).run(...params);
  if (Number(result.changes) === 0) return res.status(404).json({ error: '学生不存在或无权限' });
  db.prepare('DELETE FROM practice_records WHERE user_id = ?').run(id);
  res.json({ message: '已删除' });
});

// 搜索老师（按姓名或用户名模糊匹配，任何老师可用，用于移交学生时查找接收人）
router.get('/teachers/search', auth, requireTeacher, (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  const teachers = db.prepare(
    "SELECT id, username, name FROM users WHERE role = 'teacher' AND (name LIKE ? OR username LIKE ?) LIMIT 20"
  ).all(`%${q}%`, `%${q}%`);
  res.json(teachers);
});

// 移交学生给其他老师
router.post('/students/:id/transfer', auth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { targetUsername } = req.body;
  if (!targetUsername) {
    return res.status(400).json({ error: '请输入接收老师的用户名' });
  }
  const target = db.prepare('SELECT id, username, name FROM users WHERE username = ? AND role = ?').get(targetUsername.trim(), 'teacher');
  if (!target) {
    return res.status(404).json({ error: '接收老师账号不存在' });
  }
  if (target.id === req.user.id) {
    return res.status(400).json({ error: '不能移交给自己' });
  }
  // 权限检查：非 admin 只能移交自己名下的学生
  let sql = 'SELECT id, name FROM users WHERE id = ? AND role = ?';
  const params = [id, 'student'];
  if (!req.user.is_admin) {
    sql += ' AND created_by = ?';
    params.push(req.user.id);
  }
  const student = db.prepare(sql).get(...params);
  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权限' });
  }
  db.prepare('UPDATE users SET created_by = ? WHERE id = ?').run(target.id, id);
  res.json({ message: `学生 ${student.name} 已移交给 ${target.name}（${target.username}）` });
});

module.exports = router;
