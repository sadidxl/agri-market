const jwt = require('jsonwebtoken');
const { fail } = require('../utils/helpers');

/**
 * Verifies the Bearer token and attaches { id, role, email } to req.user.
 * Role is always re-read from the token that WE signed server-side, so
 * the frontend can never elevate its own permissions by editing local state.
 */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return fail(res, 'Authentication required. Please log in.', 401);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role, email: payload.email };
    next();
  } catch (err) {
    return fail(res, 'Invalid or expired session. Please log in again.', 401);
  }
};

// Like authenticate, but does not fail when there's no/invalid token —
// used for endpoints (e.g. product listing) that behave differently for
// logged-in users but are still public.
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role, email: payload.email };
  } catch {
    // ignore invalid token for optional auth
  }
  next();
};

module.exports = { authenticate, optionalAuth };
