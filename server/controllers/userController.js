const pool = require('../config/db');
const { newId, asyncHandler, ok, fail } = require('../utils/helpers');

const PUBLIC_FIELDS =
  'id, email, first_name, last_name, phone, role, role AS role_name, avatar_url, address, city, state, country, is_kyc_verified, kyc_status, is_active, created_at';

// GET /api/users  (admin only) — ?role=&search=
const listUsers = asyncHandler(async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.role) {
    where.push('role = ?');
    params.push(req.query.role);
  }
  if (req.query.search) {
    where.push('(email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)');
    params.push(`%${req.query.search}%`, `%${req.query.search}%`, `%${req.query.search}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM users ${whereSql} ORDER BY created_at DESC`,
    params
  );
  return ok(res, rows);
});

// GET /api/users/:id
const getUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
    return fail(res, 'You can only view your own account.', 403);
  }
  const [[user]] = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [req.params.id]);
  if (!user) return fail(res, 'User not found.', 404);
  return ok(res, user);
});

// PUT /api/users/:id  (admin only — role, is_active, kyc_status)
const updateUser = asyncHandler(async (req, res) => {
  const { role, is_active, kyc_status } = req.body;
  const fields = [];
  const params = [];
  if (role) {
    fields.push('role = ?');
    params.push(role);
  }
  if (is_active !== undefined) {
    fields.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }
  if (kyc_status) {
    fields.push('kyc_status = ?');
    params.push(kyc_status);
  }
  if (!fields.length) return fail(res, 'No fields to update.');

  params.push(req.params.id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  const [[user]] = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [req.params.id]);
  if (!user) return fail(res, 'User not found.', 404);
  return ok(res, user, { message: 'User updated.' });
});

// DELETE /api/users/:id  (admin only)
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) return fail(res, 'You cannot delete your own account.');
  await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
  return ok(res, null, { message: 'User deleted.' });
});

// --- Saved delivery addresses -------------------------------------------

// GET /api/addresses
const listAddresses = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', [
    req.user.id,
  ]);
  return ok(res, rows);
});

// POST /api/addresses
const createAddress = asyncHandler(async (req, res) => {
  const { label, full_address, city, state, is_default } = req.body;
  if (!full_address || !city || !state) return fail(res, 'full_address, city and state are required.');
  const id = newId();
  if (is_default) {
    await pool.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
  }
  await pool.query(
    'INSERT INTO addresses (id, user_id, label, full_address, city, state, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, label || 'Home', full_address, city, state, is_default ? 1 : 0]
  );
  const [[address]] = await pool.query('SELECT * FROM addresses WHERE id = ?', [id]);
  return ok(res, address, { message: 'Address saved.' }, 201);
});

// DELETE /api/addresses/:id
const deleteAddress = asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  return ok(res, null, { message: 'Address removed.' });
});

module.exports = { listUsers, getUser, updateUser, deleteUser, listAddresses, createAddress, deleteAddress };
