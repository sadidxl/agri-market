const pool = require('../config/db');
const { asyncHandler, ok, fail, newId } = require('../utils/helpers');

// Earned revenue = the farmer's share of every non-cancelled order.
const EARNINGS_SQL = `
  SELECT COALESCE(SUM(oi.total_price), 0) AS total_earned
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.farmer_id = ? AND o.status <> 'cancelled'
`;

// Balance is derived live from earnings minus money already claimed by
// withdrawals (pending / approved / completed) so rejected requests
// automatically release the funds back to the farmer.
async function farmerWalletBalance(farmerId) {
  const [[earnedRow]] = await pool.query(EARNINGS_SQL, [farmerId]);
  const totalEarned = Number(earnedRow.total_earned) || 0;

  const [[withdrawnRow]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS claimed
     FROM withdrawals
     WHERE farmer_id = ? AND status IN ('pending', 'approved', 'completed')`,
    [farmerId]
  );
  const claimed = Number(withdrawnRow.claimed) || 0;

  return { totalEarned, claimed, available: Math.max(0, totalEarned - claimed) };
}

const VALID_METHODS = ['bkash', 'nagad', 'bank'];
const VALID_STATUSES = ['pending', 'approved', 'completed', 'rejected'];

// GET /api/farmer/wallet — balance + earnings breakdown + my withdrawals
const getFarmerWallet = asyncHandler(async (req, res) => {
  const farmerId = req.user.id;
  const { totalEarned, claimed, available } = await farmerWalletBalance(farmerId);

  const [withdrawals] = await pool.query(
    `SELECT w.* FROM withdrawals w WHERE w.farmer_id = ? ORDER BY w.created_at DESC LIMIT 50`,
    [farmerId]
  );

  const [[stats]] = await pool.query(
    `SELECT
       SUM(status = 'pending') AS pending,
       SUM(status = 'approved') AS approved,
       SUM(status = 'completed') AS completed,
       SUM(status = 'rejected') AS rejected
     FROM withdrawals WHERE farmer_id = ?`,
    [farmerId]
  );

  return ok(res, {
    balance: {
      total_earned: totalEarned,
      pending_withdrawals: claimed,
      available_balance: available,
    },
    stats,
    withdrawals,
  });
});

// POST /api/farmer/wallet/withdraw { amount, method, account_details }
const requestWithdrawal = asyncHandler(async (req, res) => {
  const farmerId = req.user.id;
  const { amount, method, account_details } = req.body || {};

  const parsedAmount = parseFloat(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return fail(res, 'Withdrawal amount must be greater than 0.');
  }
  if (!VALID_METHODS.includes(method)) {
    return fail(res, `Method must be one of: ${VALID_METHODS.join(', ')}.`);
  }
  const details = String(account_details || '').trim();
  if (!details) {
    return fail(res, 'Account details are required (mobile number or bank account).');
  }

  const { available } = await farmerWalletBalance(farmerId);
  if (parsedAmount > available) {
    return fail(res, 'Requested amount exceeds your available balance.');
  }

  await pool.query(
    `INSERT INTO withdrawals (id, farmer_id, amount, method, account_details, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [newId(), farmerId, parsedAmount.toFixed(2), method, details]
  );

  const { balance } = await farmerWalletBalance(farmerId).then((w) => ({ balance: w }));
  // Re-fetch the fresh list for the UI to render immediately.
  const [withdrawals] = await pool.query(
    `SELECT w.* FROM withdrawals w WHERE w.farmer_id = ? ORDER BY w.created_at DESC LIMIT 50`,
    [farmerId]
  );

  return ok(res, { withdrawals, balance }, { message: 'Withdrawal request submitted.' });
});

// GET /api/admin/withdrawals?status=pending — all requests with farmer context
const listAdminWithdrawals = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = status && VALID_STATUSES.includes(status) ? 'WHERE w.status = ?' : '';
  const params = status && VALID_STATUSES.includes(status) ? [status] : [];

  const [rows] = await pool.query(
    `SELECT w.*, CONCAT(u.first_name, ' ', u.last_name) AS farmer_name, u.email AS farmer_email, u.phone AS farmer_phone
     FROM withdrawals w
     LEFT JOIN users u ON u.id = w.farmer_id
     ${where}
     ORDER BY
       CASE w.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
       w.created_at DESC`,
    params
  );
  return ok(res, rows);
});

// PUT /api/admin/withdrawals/:id { status, admin_note? }
const updateWithdrawalStatus = asyncHandler(async (req, res) => {
  const { status, admin_note } = req.body || {};
  if (!VALID_STATUSES.includes(status)) {
    return fail(res, `Status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  const [[existing]] = await pool.query('SELECT * FROM withdrawals WHERE id = ?', [req.params.id]);
  if (!existing) return fail(res, 'Withdrawal request not found.', 404);
  if (existing.status === 'completed') {
    return fail(res, 'A completed withdrawal cannot be changed.');
  }
  // Rejected/final states are terminal for the farmer's money: once it is
  // released it must not be re-claimed behind the scenes.
  if (existing.status === 'rejected' && status !== 'rejected') {
    return fail(res, 'A rejected withdrawal must be submitted again by the farmer.');
  }

  await pool.query('UPDATE withdrawals SET status = ?, admin_note = ? WHERE id = ?', [
    status,
    admin_note || existing.admin_note || null,
    req.params.id,
  ]);

  const [[withdrawal]] = await pool.query('SELECT * FROM withdrawals WHERE id = ?', [req.params.id]);
  return ok(res, withdrawal, { message: 'Withdrawal status updated.' });
});

module.exports = { getFarmerWallet, requestWithdrawal, listAdminWithdrawals, updateWithdrawalStatus };