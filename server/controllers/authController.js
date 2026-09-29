const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { newId, asyncHandler, ok, fail } = require('../utils/helpers');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['buyer', 'farmer', 'admin'];

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const toPublicUser = (u) => ({
  id: u.id,
  first_name: u.first_name,
  last_name: u.last_name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  role_name: u.role,
  avatar_url: u.avatar_url,
  address: u.address,
  city: u.city,
  state: u.state,
  country: u.country,
  is_active: !!u.is_active,
  is_kyc_verified: !!u.is_kyc_verified,
  kyc_status: u.kyc_status,
});

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { first_name, last_name, email, phone, password, role } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return fail(res, 'First name, last name, email and password are required.');
  }
  if (!EMAIL_RE.test(email)) return fail(res, 'Please enter a valid email address.');
  if (password.length < 6) return fail(res, 'Password must be at least 6 characters.');

  const safeRole = ROLES.includes(role) && role !== 'admin' ? role : 'buyer';

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) return fail(res, 'An account with this email already exists.', 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const id = newId();

  await pool.query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, email, passwordHash, first_name, last_name, phone || null, safeRole]
  );

  if (safeRole === 'buyer') {
    await pool.query('INSERT INTO carts (id, user_id) VALUES (?, ?)', [newId(), id]);
  }

  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  const token = signToken(user);

  return ok(res, { token, user: toPublicUser(user) }, { message: 'Account created successfully.' }, 201);
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 'Email and password are required.');

  const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) return fail(res, 'Invalid email or password.', 401);
  if (!user.is_active) return fail(res, 'This account has been deactivated.', 403);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return fail(res, 'Invalid email or password.', 401);

  const token = signToken(user);
  return ok(res, { token, user: toPublicUser(user) }, { message: 'Login successful.' });
});

// POST /api/auth/logout
// JWTs are stateless, so logout is really a client-side action (drop the
// token). This endpoint exists so the frontend's existing logout() call
// has something to hit, and to leave room for a token-blocklist later.
const logout = asyncHandler(async (req, res) => {
  return ok(res, null, { message: 'Logged out successfully.' });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) return fail(res, 'User not found.', 404);
  return ok(res, toPublicUser(user));
});

// PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { first_name, last_name, phone, address, city, state, country, avatar_url } = req.body;
  await pool.query(
    `UPDATE users SET
       first_name = COALESCE(?, first_name),
       last_name  = COALESCE(?, last_name),
       phone      = COALESCE(?, phone),
       address    = COALESCE(?, address),
       city       = COALESCE(?, city),
       state      = COALESCE(?, state),
       country    = COALESCE(?, country),
       avatar_url = COALESCE(?, avatar_url)
     WHERE id = ?`,
    [first_name, last_name, phone, address, city, state, country, avatar_url, req.user.id]
  );
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  return ok(res, toPublicUser(user), { message: 'Profile updated.' });
});

// PUT /api/auth/password
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return fail(res, 'Current and new password are required.');
  if (new_password.length < 6) return fail(res, 'New password must be at least 6 characters.');

  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) return fail(res, 'Current password is incorrect.', 401);

  const passwordHash = await bcrypt.hash(new_password, 10);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);
  return ok(res, null, { message: 'Password changed successfully.' });
});

// POST /api/auth/forgot-password  { email }
// No SMTP/email service is configured for this local dev project, so —
// instead of silently pretending to email a link — we generate the reset
// token and return it directly in the response. In a production
// deployment you would email this link instead of returning it.
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return fail(res, 'Email is required.');

  const [[user]] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  // Always respond success (even if the email doesn't exist) so this
  // endpoint can't be used to enumerate registered accounts.
  if (!user) {
    return ok(res, null, { message: 'If that email is registered, a reset link has been generated.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await pool.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [
    token,
    expires,
    user.id,
  ]);

  return ok(res, { reset_token: token }, {
    message:
      'Reset link generated. (No email service is configured in this local project — use the returned reset_token with PUT /api/auth/reset-password.)',
  });
});

// PUT /api/auth/reset-password  { token, new_password }
const resetPassword = asyncHandler(async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) return fail(res, 'Token and new password are required.');
  if (new_password.length < 6) return fail(res, 'New password must be at least 6 characters.');

  const [[user]] = await pool.query(
    'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
    [token]
  );
  if (!user) return fail(res, 'This reset link is invalid or has expired.', 400);

  const passwordHash = await bcrypt.hash(new_password, 10);
  await pool.query(
    'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
    [passwordHash, user.id]
  );
  return ok(res, null, { message: 'Password reset successfully. You can now log in.' });
});

module.exports = {
  register,
  login,
  logout,
  me,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
