const pool = require('../config/db');
const { newId, asyncHandler, ok, fail } = require('../utils/helpers');

// Core validation logic — reused by the public "validate" endpoint AND by
// createOrder, which always re-checks server-side regardless of what the
// client claims the discount should be.
async function computeDiscount(code, subtotal, conn = pool) {
  if (!code) return { valid: false, error: 'No promo code provided.' };
  const [[promo]] = await conn.query('SELECT * FROM promo_codes WHERE code = ? AND is_active = 1', [
    String(code).toUpperCase().trim(),
  ]);
  if (!promo) return { valid: false, error: 'Invalid or inactive promo code.' };
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, error: 'This promo code has expired.' };
  }
  if (promo.max_uses !== null && promo.times_used >= promo.max_uses) {
    return { valid: false, error: 'This promo code has reached its usage limit.' };
  }
  if (Number(subtotal) < Number(promo.min_order_amount)) {
    return { valid: false, error: `This code requires a minimum order of ৳${promo.min_order_amount}.` };
  }
  let discount =
    promo.discount_type === 'percentage'
      ? (Number(subtotal) * Number(promo.discount_value)) / 100
      : Number(promo.discount_value);
  if (promo.max_discount_amount !== null) {
    discount = Math.min(discount, Number(promo.max_discount_amount));
  }
  discount = Math.min(discount, Number(subtotal)); // never discount more than the order itself
  return { valid: true, promo, discount: Math.round(discount * 100) / 100 };
}

// POST /api/promo/validate  { code, subtotal }
const validatePromoCode = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  if (subtotal === undefined) return fail(res, 'subtotal is required.');
  const result = await computeDiscount(code, subtotal);
  if (!result.valid) return fail(res, result.error);
  return ok(res, {
    code: result.promo.code,
    discount_type: result.promo.discount_type,
    discount_value: Number(result.promo.discount_value),
    discount_amount: result.discount,
    description: result.promo.description,
  });
});

// --- Admin promo management ---------------------------------------------
const listPromoCodes = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
  return ok(res, rows);
});

const createPromoCode = asyncHandler(async (req, res) => {
  const {
    code,
    description,
    discount_type,
    discount_value,
    min_order_amount,
    max_discount_amount,
    max_uses,
    expires_at,
  } = req.body;
  if (!code || !discount_type || !discount_value) {
    return fail(res, 'code, discount_type, and discount_value are required.');
  }
  if (!['percentage', 'fixed'].includes(discount_type)) {
    return fail(res, "discount_type must be 'percentage' or 'fixed'.");
  }
  const id = newId();
  try {
    await pool.query(
      `INSERT INTO promo_codes (id, code, description, discount_type, discount_value, min_order_amount, max_discount_amount, max_uses, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        String(code).toUpperCase().trim(),
        description || null,
        discount_type,
        discount_value,
        min_order_amount || 0,
        max_discount_amount || null,
        max_uses || null,
        expires_at || null,
      ]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 'A promo code with that name already exists.');
    throw err;
  }
  const [[promo]] = await pool.query('SELECT * FROM promo_codes WHERE id = ?', [id]);
  return ok(res, promo, { message: 'Promo code created.' }, 201);
});

const updatePromoCode = asyncHandler(async (req, res) => {
  const fields = [
    'description',
    'discount_type',
    'discount_value',
    'min_order_amount',
    'max_discount_amount',
    'max_uses',
    'is_active',
    'expires_at',
  ];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }
  if (!updates.length) return fail(res, 'No fields to update.');
  params.push(req.params.id);
  await pool.query(`UPDATE promo_codes SET ${updates.join(', ')} WHERE id = ?`, params);
  const [[promo]] = await pool.query('SELECT * FROM promo_codes WHERE id = ?', [req.params.id]);
  if (!promo) return fail(res, 'Promo code not found.', 404);
  return ok(res, promo, { message: 'Promo code updated.' });
});

const deletePromoCode = asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM promo_codes WHERE id = ?', [req.params.id]);
  return ok(res, null, { message: 'Promo code deleted.' });
});

module.exports = {
  computeDiscount,
  validatePromoCode,
  listPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
};
