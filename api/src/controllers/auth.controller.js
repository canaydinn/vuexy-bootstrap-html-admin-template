// api/src/controllers/auth.controller.js
const knex = require('../config/knex');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Kullanıcı adı ve şifre zorunludur' });
    }

    const user = await knex('users')
      .where({ username })
      .first();

    if (!user) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ message: 'Kullanıcı pasif durumda' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Hatalı şifre' });
    }

    // Çok belediyeli yapı için municipality_id de token'a dahil
    const payload = {
      id: user.id,
      role_id: user.role_id,
      municipality_id: user.municipality_id,
      username: user.username,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '12h',
    });

    // Geliştirme ortamı için cookie ayarları
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // prod'da true yapılmalı (HTTPS)
      sameSite: 'lax',
    });

    return res.json({
      message: 'Giriş başarılı',
      user: {
        id: user.id,
        username: user.username,
        role_id: user.role_id,
        municipality_id: user.municipality_id,
      },
    });
  } catch (err) {
    console.error('auth.login hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  // auth middleware'de req.user set ediliyor
  if (!req.user) {
    return res.status(401).json({ message: 'Oturum bulunamadı' });
  }

  return res.json({
    user: req.user,
  });
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Çıkış yapıldı' });
};
