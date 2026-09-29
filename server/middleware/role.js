const { fail } = require('../utils/helpers');

/**
 * requireRole('admin') or requireRole('admin', 'farmer')
 * Must run after `authenticate`. Enforced server-side only — the
 * frontend's notion of role is never trusted.
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return fail(res, 'Authentication required.', 401);
  if (!roles.includes(req.user.role)) {
    return fail(res, 'You do not have permission to perform this action.', 403);
  }
  next();
};

module.exports = { requireRole };
