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

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const {
      username: rawUsername,
      email: rawEmail,
      password,
      full_name,
      role_id,
      municipality_id,
    } = req.body;

    const username = rawUsername?.trim();
    const email = rawEmail?.trim().toLowerCase();

    if (!username || !password || !municipality_id) {
      return res.status(400).json({
        message:
          'username, password ve municipality_id alanları kayıt için zorunludur',
      });
    }

    const municipality = await knex('municipalities')
      .where({ id: municipality_id, is_active: true })
      .first();

    if (!municipality) {
      return res
        .status(400)
        .json({ message: 'Geçerli ve aktif bir belediye bulunamadı' });
    }

    const existsQuery = knex('users').where({ username });
    if (email) {
      existsQuery.orWhere({ email });
    }

    const exists = await existsQuery.first();

    if (exists) {
      return res
        .status(400)
        .json({ message: 'Bu kullanıcı adı veya e-posta zaten kullanılıyor' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [createdUser] = await knex('users')
      .insert({
        username,
        email,
        full_name,
        role_id: role_id || 5, // default: standart kullanıcı
        municipality_id,
        password_hash,
        is_active: true,
      })
      .returning([
        'id',
        'username',
        'email',
        'full_name',
        'role_id',
        'municipality_id',
        'is_active',
      ]);

    return res.status(201).json({
      message: 'Kayıt işlemi başarılı',
      user: createdUser,
    });
  } catch (err) {
    console.error('auth.signup hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// POST /api/auth/municipality-signup
exports.municipalitySignup = async (req, res) => {
  const trx = await knex.transaction();
  try {
    const {
      code: rawCode,
      name: rawName,
      province,
      district,
      tax_number,
      address,
      contact_email,
      contact_phone,
      admin_username: rawAdminUsername,
      admin_password,
      admin_email,
      admin_full_name,
    } = req.body;

    const code = rawCode?.trim();
    const name = rawName?.trim();
    const admin_username = rawAdminUsername?.trim();
    const normalizedAdminEmail = admin_email?.trim().toLowerCase();

    if (!code || !name || !province || !district) {
      await trx.rollback();
      return res.status(400).json({
        message: 'code, name, province ve district alanları zorunludur',
      });
    }

    if (!admin_username || !admin_password) {
      await trx.rollback();
      return res.status(400).json({
        message: 'admin_username ve admin_password zorunludur',
      });
    }

    const municipalityExists = await trx('municipalities')
      .where({ code })
      .first();

    if (municipalityExists) {
      await trx.rollback();
      return res
        .status(400)
        .json({ message: 'Bu municipality code zaten kullanılıyor' });
    }

    const adminExistsQuery = trx('users').where({ username: admin_username });
    if (normalizedAdminEmail) {
      adminExistsQuery.orWhere({ email: normalizedAdminEmail });
    }

    const userExists = await adminExistsQuery.first();

    if (userExists) {
      await trx.rollback();
      return res.status(400).json({
        message: 'Bu admin kullanıcı adı veya e-posta zaten kullanılıyor',
      });
    }

    const [municipality] = await trx('municipalities')
      .insert({
        code,
        name,
        province,
        district,
        tax_number: tax_number || null,
        address: address || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        is_active: true,
      })
      .returning([
        'id',
        'code',
        'name',
        'province',
        'district',
        'tax_number',
        'address',
        'contact_email',
        'contact_phone',
        'is_active',
        'created_at',
        'updated_at',
      ]);

    const adminPasswordHash = await bcrypt.hash(admin_password, 10);

    const [adminUser] = await trx('users')
      .insert({
        username: admin_username,
        email: normalizedAdminEmail,
        full_name: admin_full_name,
        password_hash: adminPasswordHash,
        role_id: 1, // sistem/belediye yöneticisi
        municipality_id: municipality.id,
        is_active: true,
      })
      .returning([
        'id',
        'username',
        'email',
        'full_name',
        'role_id',
        'municipality_id',
        'is_active',
      ]);

    await trx.commit();

    return res.status(201).json({
      message: 'Belediye ve yönetici hesabı oluşturuldu',
      municipality,
      admin: adminUser,
    });
  } catch (err) {
    await trx.rollback();
    console.error('auth.municipalitySignup hatası:', err);
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

// POST /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { current_password, new_password } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Oturum bulunamadı' });
    }

    if (!current_password || !new_password) {
      return res
        .status(400)
        .json({ message: 'Eski ve yeni şifre alanları zorunludur' });
    }

    const user = await knex('users').where({ id: userId }).first();

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Geçerli şifre hatalı' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await knex('users').where({ id: userId }).update({
      password_hash,
      updated_at: knex.fn.now(),
    });

    return res.json({ message: 'Şifre başarıyla güncellendi' });
  } catch (err) {
    console.error('auth.changePassword hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// POST /api/auth/request-password-reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'E-posta zorunludur' });
    }

    const user = await knex('users').where({ email }).first();

    if (!user || user.is_active === false) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    const resetToken = jwt.sign(
      { id: user.id, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Normalde e-posta ile gönderilir; burada yanıt ile dönüyoruz
    return res.json({
      message: 'Parola sıfırlama bağlantısı oluşturuldu',
      reset_token: resetToken,
    });
  } catch (err) {
    console.error('auth.requestPasswordReset hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res
        .status(400)
        .json({ message: 'token ve new_password zorunludur' });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res
        .status(400)
        .json({ message: 'Geçersiz veya süresi dolmuş parola sıfırlama isteği' });
    }

    if (payload.type !== 'password_reset') {
      return res.status(400).json({ message: 'Token tipi geçersiz' });
    }

    const user = await knex('users').where({ id: payload.id }).first();

    if (!user || user.is_active === false) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await knex('users').where({ id: payload.id }).update({
      password_hash,
      updated_at: knex.fn.now(),
    });

    return res.json({ message: 'Parola güncellendi' });
  } catch (err) {
    console.error('auth.resetPassword hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// POST /api/auth/refresh
exports.refreshToken = async (req, res) => {
  try {
    const cookieToken = req.cookies?.token;
    const authHeader = req.headers['authorization'];
    let token = cookieToken;

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    }

    if (!token) {
      return res.status(401).json({ message: 'Oturum bulunamadı' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    } catch (err) {
      return res.status(401).json({ message: 'Token doğrulanamadı' });
    }

    const user = await knex('users')
      .where({ id: decoded.id })
      .select('id', 'username', 'role_id', 'municipality_id', 'is_active')
      .first();

    if (!user || user.is_active === false) {
      return res.status(401).json({ message: 'Kullanıcı pasif veya bulunamadı' });
    }

    const newPayload = {
      id: user.id,
      role_id: user.role_id,
      municipality_id: user.municipality_id,
      username: user.username,
    };

    const newToken = jwt.sign(newPayload, JWT_SECRET, { expiresIn: '12h' });

    res.cookie('token', newToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    return res.json({
      message: 'Token yenilendi',
      token: newToken,
      user: newPayload,
    });
  } catch (err) {
    console.error('auth.refreshToken hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};
