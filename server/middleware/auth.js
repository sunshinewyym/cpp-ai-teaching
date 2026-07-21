const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'csp-teaching-secret-key-change-in-production';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

function requireTeacher(req, res, next) {
  if (req.user?.role !== 'teacher') {
    return res.status(403).json({ error: '需要老师权限' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'teacher' || !req.user?.is_admin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

module.exports = { auth, requireTeacher, requireAdmin, JWT_SECRET };
