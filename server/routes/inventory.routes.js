const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { getInventoryHistory } = require('../controllers/inventoryController');

router.get('/history', authenticate, requireRole('farmer'), getInventoryHistory);

module.exports = router;
