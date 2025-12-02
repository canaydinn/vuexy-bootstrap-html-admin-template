// api/src/routes/assets.route.js
const express = require('express');
const router = express.Router();

const assetsController = require('../controllers/assets.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Envanter listesi (okuma izni olan herkes)
router.get(
  '/',
  auth,
  // Örneğin: admin(1), taşınır kayıt(2), taşınır kontrol(3), birim sorumlusu(4), kullanıcı(5)
  // requireRole içeride tek değer veya dizi alacak şekilde yazıldıysa buna göre uyarlarsınız.
  assetsController.listAssets
);

// Tek envanter kaydı
router.get(
  '/:id',
  auth,
  assetsController.getAssetById
);

// Yeni envanter ekleme (örneğin admin + taşınır kayıt)
router.post(
  '/',
  auth,
  requireRole([1, 2]), // 1: admin, 2: taşınır kayıt yetkilisi
  assetsController.createAsset
);

// Envanter güncelleme
router.put(
  '/:id',
  auth,
  requireRole([1, 2, 3]), // kontrol yetkilisi de güncelleyebilsin istiyorsanız
  assetsController.updateAsset
);

// Envanter silme
router.delete(
  '/:id',
  auth,
  requireRole([1]), // sadece sistem/belediye admini
  assetsController.deleteAsset
);

module.exports = router;
