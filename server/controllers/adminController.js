const pool = require('../config/db');
const { asyncHandler, ok, fail } = require('../utils/helpers');

// GET /api/admin/dashboard — real counts/sums pulled straight from MySQL
const getDashboard = asyncHandler(async (req, res) => {
  // Optional ?period=7|30|90 — narrows the "recent" windows, top products,
  // top farmers, status & payment breakdowns. Defaults to last 30 days.
  const period = [7, 30, 90].includes(Number(req.query.period)) ? Number(req.query.period) : 30;

  const [[userCounts]] = await pool.query(
    `SELECT
       COUNT(*) AS total_users,
       SUM(role = 'buyer') AS total_buyers,
       SUM(role = 'farmer') AS total_farmers,
       SUM(role = 'admin') AS total_admins
     FROM users`
  );

  const [[productCounts]] = await pool.query(
    `SELECT COUNT(*) AS total_products,
            SUM(is_approved = 0) AS pending_approval,
            SUM(stock = 0) AS out_of_stock,
            SUM(is_featured = 1) AS featured_products
     FROM products`
  );

  const [[farmerStats]] = await pool.query(
    `SELECT SUM(role = 'farmer' AND is_kyc_verified = 1) AS verified_farmers,
            SUM(role = 'farmer' AND kyc_status = 'pending') AS pending_farmers
     FROM users`
  );

  const [[orderCounts]] = await pool.query(
    `SELECT COUNT(*) AS total_orders,
            SUM(status = 'pending') AS pending_orders,
            SUM(status = 'delivered') AS delivered_orders,
            SUM(status = 'cancelled') AS cancelled_orders,
            COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total_amount ELSE 0 END), 0) AS total_revenue
     FROM orders`
  );

  const [revenueByMonth] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COALESCE(SUM(total_amount), 0) AS revenue
     FROM orders
     WHERE status <> 'cancelled' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY month ORDER BY month`
  );

  const [recentOrders] = await pool.query(
    `SELECT o.id, o.order_number, o.status, o.total_amount, o.created_at, u.first_name, u.last_name
     FROM orders o LEFT JOIN users u ON u.id = o.buyer_id
     ORDER BY o.created_at DESC LIMIT 10`
  );

  const [lowStockProducts] = await pool.query(
    `SELECT p.id, p.name, p.stock, p.unit, CONCAT(u.first_name, ' ', u.last_name) AS farmer_name
     FROM products p LEFT JOIN users u ON u.id = p.farmer_id
     WHERE p.stock <= 10 ORDER BY p.stock ASC LIMIT 10`
  );

  const [[recentWindow]] = await pool.query(
    `SELECT COUNT(*) AS recent_orders,
            COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total_amount ELSE 0 END), 0) AS recent_revenue
     FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [period]
  );
  const [[newUsersRow]] = await pool.query(
    `SELECT COUNT(*) AS new_users FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [period]
  );

  const [ordersByStatus] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM orders
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY status`,
    [period]
  );
  const [paymentStats] = await pool.query(
    `SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
     FROM payments WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY payment_method`,
    [period]
  );
  const [topProducts] = await pool.query(
    `SELECT p.id, p.name, CONCAT(u.first_name, ' ', u.last_name) AS farm_name,
            SUM(oi.quantity) AS total_sold, SUM(oi.total_price) AS total_revenue
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN users u ON u.id = p.farmer_id
     WHERE oi.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY p.id, p.name, u.first_name, u.last_name
     ORDER BY total_sold DESC LIMIT 5`,
    [period]
  );
  const [topFarmers] = await pool.query(
    `SELECT u.id, CONCAT(u.first_name, ' ', u.last_name) AS farm_name,
            u.first_name, u.last_name,
            COUNT(DISTINCT oi.order_id) AS order_count,
            SUM(oi.total_price) AS total_revenue
     FROM order_items oi
     LEFT JOIN users u ON u.id = oi.farmer_id
     WHERE oi.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY u.id, u.first_name, u.last_name
     ORDER BY total_revenue DESC LIMIT 5`,
    [period]
  );
  const [categoryStats] = await pool.query(
    `SELECT c.name AS category, COUNT(DISTINCT p.id) AS product_count,
            COALESCE(SUM(oi.total_price), 0) AS revenue
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     LEFT JOIN order_items oi ON oi.product_id = p.id
     GROUP BY c.id ORDER BY revenue DESC`
  );

  return ok(res, {
    users: userCounts,
    products: productCounts,
    orders: orderCounts,
    revenue_by_month: revenueByMonth,
    recent_orders: recentOrders,
    low_stock_products: lowStockProducts,
    overview: {
      total_users: userCounts.total_users,
      new_users: newUsersRow.new_users,
      total_farmers: userCounts.total_farmers,
      verified_farmers: farmerStats.verified_farmers || 0,
      pending_farmers: farmerStats.pending_farmers || 0,
      total_buyers: userCounts.total_buyers,
      active_products: productCounts.total_products - (productCounts.pending_approval || 0),
      pending_products: productCounts.pending_approval || 0,
      out_of_stock: productCounts.out_of_stock || 0,
      featured_products: productCounts.featured_products || 0,
      total_orders: orderCounts.total_orders,
      pending_orders: orderCounts.pending_orders || 0,
      recent_orders: recentWindow.recent_orders,
      total_revenue: Number(orderCounts.total_revenue) || 0,
      recent_revenue: Number(recentWindow.recent_revenue) || 0,
    },
    orders_by_status: ordersByStatus,
    payment_stats: paymentStats,
    top_products: topProducts,
    top_farmers: topFarmers,
    category_stats: categoryStats,
  });
});

// GET /api/farmer/dashboard — real stats scoped to the logged-in farmer
const getFarmerDashboard = asyncHandler(async (req, res) => {
  const farmerId = req.user.id;

  const [[productCounts]] = await pool.query(
    `SELECT COUNT(*) AS total_products, SUM(stock = 0) AS out_of_stock, SUM(is_approved = 0) AS pending_approval
     FROM products WHERE farmer_id = ?`,
    [farmerId]
  );

  const [[orderCounts]] = await pool.query(
    `SELECT COUNT(DISTINCT oi.order_id) AS total_orders,
            COALESCE(SUM(oi.total_price), 0) AS total_revenue
     FROM order_items oi WHERE oi.farmer_id = ?`,
    [farmerId]
  );

  const [[pendingOrders]] = await pool.query(
    `SELECT COUNT(DISTINCT o.id) AS pending_orders
     FROM orders o JOIN order_items oi ON oi.order_id = o.id
     WHERE oi.farmer_id = ? AND o.status = 'pending'`,
    [farmerId]
  );

  const [[ratingRow]] = await pool.query(
    `SELECT COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating
     FROM reviews r JOIN products p ON p.id = r.product_id
     WHERE p.farmer_id = ? AND r.is_approved = 1`,
    [farmerId]
  );

  const [recentOrders] = await pool.query(
    `SELECT DISTINCT o.id, o.order_number, o.status, o.total_amount, o.created_at,
            CONCAT(u.first_name, ' ', u.last_name) AS customer_name
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN users u ON u.id = o.buyer_id
     WHERE oi.farmer_id = ? ORDER BY o.created_at DESC LIMIT 5`,
    [farmerId]
  );

  const [topProducts] = await pool.query(
    `SELECT p.id, p.name, SUM(oi.quantity) AS units_sold, SUM(oi.total_price) AS revenue
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.farmer_id = ? GROUP BY p.id ORDER BY units_sold DESC LIMIT 5`,
    [farmerId]
  );

  const [lowStockProducts] = await pool.query(
    `SELECT id, name, stock, unit,
            CASE WHEN stock = 0 THEN 'out' WHEN stock <= 10 THEN 'low' ELSE 'ok' END AS status
     FROM products WHERE farmer_id = ? AND stock <= 10 ORDER BY stock ASC LIMIT 6`,
    [farmerId]
  );

  return ok(res, {
    products: productCounts,
    orders: { ...orderCounts, pending_orders: pendingOrders.pending_orders },
    avg_rating: ratingRow.avg_rating,
    recent_orders: recentOrders,
    top_products: topProducts,
    low_stock_products: lowStockProducts,
  });
});

// GET /api/buyer/dashboard — real stats scoped to the logged-in buyer
const getBuyerDashboard = asyncHandler(async (req, res) => {
  const buyerId = req.user.id;

  const [[cart]] = await pool.query(
    `SELECT COALESCE(SUM(ci.quantity), 0) AS cartItems
     FROM carts c LEFT JOIN cart_items ci ON ci.cart_id = c.id
     WHERE c.user_id = ?`,
    [buyerId]
  );
  const [[wishlist]] = await pool.query('SELECT COUNT(*) AS wishlistItems FROM wishlists WHERE user_id = ?', [
    buyerId,
  ]);
  const [[orders]] = await pool.query(
    `SELECT COUNT(*) AS totalOrders,
            SUM(status IN ('pending', 'confirmed', 'processing', 'shipped')) AS pendingDelivery
     FROM orders WHERE buyer_id = ?`,
    [buyerId]
  );
  const [recentOrders] = await pool.query(
    `SELECT id, order_number, status, created_at FROM orders WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 5`,
    [buyerId]
  );

  const recentActivities = recentOrders.map((o) => ({
    id: o.id,
    type: 'order',
    message: `Order ${o.order_number} is ${o.status}`,
    time: o.created_at,
  }));

  return ok(res, {
    cartItems: Number(cart.cartItems) || 0,
    wishlistItems: Number(wishlist.wishlistItems) || 0,
    totalOrders: Number(orders.totalOrders) || 0,
    pendingDelivery: Number(orders.pendingDelivery) || 0,
    recentActivities,
  });
});

// GET /api/admin/payments — all payments with order + buyer context
const listPayments = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT pay.*, o.order_number, o.buyer_id, CONCAT(u.first_name, ' ', u.last_name) AS buyer_name
     FROM payments pay
     JOIN orders o ON o.id = pay.order_id
     LEFT JOIN users u ON u.id = o.buyer_id
     ORDER BY pay.created_at DESC`
  );
  return ok(res, rows);
});

// PUT /api/admin/payments/:id  { status }
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'processing', 'completed', 'failed', 'refunded'];
  if (!valid.includes(status)) return fail(res, `Status must be one of: ${valid.join(', ')}`);
  const [[existing]] = await pool.query('SELECT id FROM payments WHERE id = ?', [req.params.id]);
  if (!existing) return fail(res, 'Payment not found.', 404);
  await pool.query('UPDATE payments SET status = ? WHERE id = ?', [status, req.params.id]);
  const [[payment]] = await pool.query('SELECT * FROM payments WHERE id = ?', [req.params.id]);
  return ok(res, payment, { message: 'Payment status updated.' });
});

module.exports = { getDashboard, getFarmerDashboard, getBuyerDashboard, listPayments, updatePaymentStatus };
