// api/src/routes/municipalities.routes.js
const express = require('express');
const router = express.Router();

const municipalitiesController = require('../controllers/municipalities.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Tüm belediyeleri listele
router.get(
  '/',
  auth,
  requireRole(1),           // Şimdilik sistem admin / belediye admin = role_id 1
  municipalitiesController.getAll
);

// Tek belediyeyi getir
router.get(
  '/:id',
  auth,
  requireRole(1),
  municipalitiesController.getById
);

// Yeni belediye oluştur
router.post(
  '/',
  auth,
  requireRole(1),
  municipalitiesController.create
);

// Belediye güncelle
router.put(
  '/:id',
  auth,
  requireRole(1),
  municipalitiesController.update
);

// Belediye pasifleştir (soft delete)
router.patch(
  '/:id/deactivate',
  auth,
  requireRole(1),
  municipalitiesController.deactivate
);

module.exports = router;
