// api/routes/superadmin.routes.js
const express = require('express');
const router = express.Router();
const superadminController = require('../controllers/superadmin.controller');
const authMiddleware = require('../middleware/auth');
const authorizeRole = require('../middleware/authorizeRole');

router.use(authMiddleware, authorizeRole('superadmin'));

router.get('/municipalities', superadminController.listMunicipalities);
router.patch('/municipalities/:id/status', superadminController.updateMunicipalityStatus);

module.exports = router;
