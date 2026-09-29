const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.put('/profile', authenticate, ctrl.updateProfile);
router.put('/password', authenticate, ctrl.changePassword);
router.post('/forgot-password', ctrl.forgotPassword);
router.put('/reset-password', ctrl.resetPassword);

module.exports = router;
