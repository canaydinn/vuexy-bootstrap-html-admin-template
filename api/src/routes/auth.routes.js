// api/src/routes/auth.routes.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

// Giriş
router.post('/login', authController.login);

// Oturum bilgisi
router.get('/me', auth, authController.me);

// Çıkış
router.post('/logout', auth, authController.logout);

module.exports = router;
