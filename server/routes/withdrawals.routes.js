const router = require('express').Router();
const ctrl = require('../controllers/withdrawalController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Farmer wallet
router.get('/farmer/wallet', authenticate, requireRole('farmer'), ctrl.getFarmerWallet);
router.post('/farmer/wallet/withdraw', authenticate, requireRole('farmer'), ctrl.requestWithdrawal);

// Admin withdrawal management
router.get('/admin/withdrawals', authenticate, requireRole('admin'), ctrl.listAdminWithdrawals);
router.put('/admin/withdrawals/:id', authenticate, requireRole('admin'), ctrl.updateWithdrawalStatus);

module.exports = router;