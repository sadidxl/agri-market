const pool = require('../config/db');
const { asyncHandler, ok } = require('../utils/helpers');

// GET /api/inventory/history — logged-in farmer's own stock change history
// Optional ?product_id= to scope to a single product.
const getInventoryHistory = asyncHandler(async (req, res) => {
  const params = [req.user.id];
  let sql = `SELECT l.*, p.name AS product_name, p.unit
             FROM inventory_logs l
             JOIN products p ON p.id = l.product_id
             WHERE l.farmer_id = ?`;
  if (req.query.product_id) {
    sql += ' AND l.product_id = ?';
    params.push(req.query.product_id);
  }
  sql += ' ORDER BY l.created_at DESC LIMIT 100';
  const [rows] = await pool.query(sql, params);
  return ok(res, rows);
});

module.exports = { getInventoryHistory };
