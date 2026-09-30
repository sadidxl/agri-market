const router = require('express').Router();
const ctrl = require('../controllers/productController');
const reviewCtrl = require('../controllers/reviewController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.get('/', optionalAuth, ctrl.listProducts);
router.get('/:id', optionalAuth, ctrl.getProduct);
router.get('/:id/stock', ctrl.checkStock);
router.get('/:productId/reviews', reviewCtrl.listProductReviews);

router.post('/', authenticate, requireRole('farmer', 'admin'), ctrl.createProduct);
router.put('/:id', authenticate, requireRole('farmer', 'admin'), ctrl.updateProduct);
router.delete('/:id', authenticate, requireRole('farmer', 'admin'), ctrl.deleteProduct);
router.post('/:productId/reviews', authenticate, requireRole('buyer'), reviewCtrl.createReview);

module.exports = router;
