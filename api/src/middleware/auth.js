// api/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

module.exports = (req, res, next) => {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers['authorization'];

  let token = cookieToken;

  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '');
  }

  if (!token) {
    return res.status(401).json({ message: 'Oturum bulunamadı' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role_id, municipality_id, ... }
    next();
  } catch (err) {
    console.error('auth middleware hatası:', err);
    return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş oturum' });
  }
};
