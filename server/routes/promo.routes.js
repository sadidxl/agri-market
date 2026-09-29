const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const ctrl = require('../controllers/promoController');

router.post('/validate', authenticate, ctrl.validatePromoCode);
router.get('/', authenticate, requireRole('admin'), ctrl.listPromoCodes);
router.post('/', authenticate, requireRole('admin'), ctrl.createPromoCode);
router.put('/:id', authenticate, requireRole('admin'), ctrl.updatePromoCode);
router.delete('/:id', authenticate, requireRole('admin'), ctrl.deletePromoCode);

module.exports = router;
