const jwt = require('jsonwebtoken');
const config = require('../config/env');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, config.jwtSecret);
  } catch {
    // Optional auth — continue without user
  }

  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: '로그인이 필요합니다' });
  }
  next();
}

module.exports = { authMiddleware, requireAuth };
