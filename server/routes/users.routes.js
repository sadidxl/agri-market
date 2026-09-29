const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.get('/', authenticate, requireRole('admin'), ctrl.listUsers);
router.get('/:id', authenticate, ctrl.getUser);
router.put('/:id', authenticate, requireRole('admin'), ctrl.updateUser);
router.delete('/:id', authenticate, requireRole('admin'), ctrl.deleteUser);

module.exports = router;
