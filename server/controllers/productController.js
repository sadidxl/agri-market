const pool = require('../config/db');
const { newId, asyncHandler, ok, fail } = require('../utils/helpers');

const SORT_MAP = {
  newest: 'p.created_at DESC',
  price_low: 'p.price ASC',
  price_high: 'p.price DESC',
  rating: 'avg_rating DESC',
  relevance: 'p.created_at DESC',
};

// GET /api/products  (public — only active+approved products, unless farmer_id/status is used by the owner)
const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 12, 100);
  const offset = (page - 1) * limit;

  const isOwnerRequest = req.query.farmer_id && req.user && req.user.id === req.query.farmer_id;
  const isAdminRequest = req.user?.role === 'admin';
  const where = isOwnerRequest || isAdminRequest ? [] : ['p.is_active = 1', 'p.is_approved = 1'];
  const params = [];

  if (req.query.search) {
    where.push('(p.name LIKE ? OR p.description LIKE ?)');
    params.push(`%${req.query.search}%`, `%${req.query.search}%`);
  }
  if (req.query.category) {
    where.push('p.category_id = ?');
    params.push(req.query.category);
  }
  if (req.query.min_price) {
    where.push('p.price >= ?');
    params.push(Number(req.query.min_price));
  }
  if (req.query.max_price) {
    where.push('p.price <= ?');
    params.push(Number(req.query.max_price));
  }
  if (req.query.farmer_id) {
    where.push('p.farmer_id = ?');
    params.push(req.query.farmer_id);
  }
  if (req.query.status === 'pending') {
    where.push('p.is_approved = 0 AND p.is_active = 1');
  }

  const sort = SORT_MAP[req.query.sort] || SORT_MAP.newest;
  const whereSql = where.length ? where.join(' AND ') : '1=1';

  const [rows] = await pool.query(
    `SELECT p.*, c.name AS category_name,
            u.first_name AS farmer_first_name, u.last_name AS farmer_last_name,
            CONCAT(u.first_name, ' ', u.last_name) AS farm_name,
            p.stock AS stock_quantity, p.unit AS unit_abbr, p.image_url AS primary_image,
            COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
            COUNT(DISTINCT r.id) AS review_count
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN users u ON u.id = p.farmer_id
     LEFT JOIN reviews r ON r.product_id = p.id AND r.is_approved = 1
     WHERE ${whereSql}
     GROUP BY p.id
     ORDER BY ${sort}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(DISTINCT p.id) AS total FROM products p WHERE ${whereSql}`,
    params
  );

  return ok(res, rows, {
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  });
});

// GET /api/products/:id
const getProduct = asyncHandler(async (req, res) => {
  const [[product]] = await pool.query(
    `SELECT p.*, c.name AS category_name,
            u.first_name AS farmer_first_name, u.last_name AS farmer_last_name,
            CONCAT(u.first_name, ' ', u.last_name) AS farm_name,
            p.stock AS stock_quantity, p.unit AS unit_abbr, p.image_url AS primary_image,
            COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
            COUNT(DISTINCT r.id) AS review_count
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN users u ON u.id = p.farmer_id
     LEFT JOIN reviews r ON r.product_id = p.id AND r.is_approved = 1
     WHERE p.id = ?
     GROUP BY p.id`,
    [req.params.id]
  );
  if (!product) return fail(res, 'Product not found.', 404);

  let [images] = await pool.query('SELECT * FROM product_images WHERE product_id = ?', [req.params.id]);
  // Fall back to the product's single image_url when no gallery rows exist,
  // since several frontend pages read product.images[0].image_url.
  if (!images.length && product.image_url) {
    images = [{ id: null, product_id: product.id, image_url: product.image_url, is_primary: true }];
  }
  const [reviews] = await pool.query(
    `SELECT r.*, u.first_name, u.last_name FROM reviews r
     JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ? AND r.is_approved = 1
     ORDER BY r.created_at DESC LIMIT 10`,
    [req.params.id]
  );

  // True rating distribution across ALL approved reviews (not just the
  // 10 recent ones shown on the page) so the client can render honest bars.
  const [ratingRows] = await pool.query(
    `SELECT rating, COUNT(*) AS count FROM reviews
     WHERE product_id = ? AND is_approved = 1
     GROUP BY rating`,
    [req.params.id]
  );
  const totalRatings = ratingRows.reduce((sum, r) => sum + Number(r.count), 0);
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => {
    const row = ratingRows.find((r) => Number(r.rating) === stars);
    const count = row ? Number(row.count) : 0;
    return {
      stars,
      count,
      percentage: totalRatings ? Math.round((count / totalRatings) * 100) : 0,
    };
  });

  return ok(res, { ...product, images, recent_reviews: reviews, rating_distribution: ratingDistribution });
});

// POST /api/products  (farmer, admin)
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, unit, stock, category_id, image_url, location } = req.body;
  if (!name || !price) return fail(res, 'Product name and price are required.');
  if (Number(price) <= 0) return fail(res, 'Price must be greater than 0.');

  const id = newId();
  const farmerId = req.user.role === 'admin' && req.body.farmer_id ? req.body.farmer_id : req.user.id;

  await pool.query(
    `INSERT INTO products (id, farmer_id, category_id, name, description, price, unit, stock, image_url, location)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      farmerId,
      category_id || null,
      name,
      description || '',
      price,
      unit || 'kg',
      stock || 0,
      image_url || null,
      location || null,
    ]
  );

  if (Number(stock) > 0) {
    await pool.query(
      `INSERT INTO inventory_logs (id, product_id, farmer_id, change_type, quantity_change, previous_stock, new_stock, reason)
       VALUES (?, ?, ?, 'initial', ?, 0, ?, 'Product created')`,
      [newId(), id, farmerId, Number(stock), Number(stock)]
    );
  }

  const [[product]] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  return ok(res, product, { message: 'Product created successfully.' }, 201);
});

// PUT /api/products/:id  (owning farmer, or admin)
const updateProduct = asyncHandler(async (req, res) => {
  const [[product]] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return fail(res, 'Product not found.', 404);
  if (req.user.role !== 'admin' && product.farmer_id !== req.user.id) {
    return fail(res, 'You can only edit your own products.', 403);
  }

  const fields = ['name', 'description', 'price', 'unit', 'stock', 'category_id', 'image_url', 'location', 'is_active', 'is_featured'];
  const updates = [];
  const params = [];
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }
  if (req.user.role === 'admin' && req.body.is_approved !== undefined) {
    updates.push('is_approved = ?');
    params.push(req.body.is_approved);
  }
  if (!updates.length) return fail(res, 'No fields to update.');

  params.push(req.params.id);
  await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);

  // Manual stock changes (not sales/restocks from the order flow) get their
  // own audit trail entry so farmers can see who/when changed what.
  if (req.body.stock !== undefined && Number(req.body.stock) !== product.stock) {
    const newStock = Number(req.body.stock);
    await pool.query(
      `INSERT INTO inventory_logs (id, product_id, farmer_id, change_type, quantity_change, previous_stock, new_stock, reason)
       VALUES (?, ?, ?, 'adjustment', ?, ?, ?, ?)`,
      [
        newId(),
        req.params.id,
        product.farmer_id,
        newStock - product.stock,
        product.stock,
        newStock,
        req.body.adjustment_reason || (req.user.role === 'admin' ? 'Adjusted by admin' : 'Manually adjusted by farmer'),
      ]
    );
  }

  const [[updated]] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  return ok(res, updated, { message: 'Product updated successfully.' });
});

// DELETE /api/products/:id  (owning farmer, or admin)
const deleteProduct = asyncHandler(async (req, res) => {
  const [[product]] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return fail(res, 'Product not found.', 404);
  if (req.user.role !== 'admin' && product.farmer_id !== req.user.id) {
    return fail(res, 'You can only delete your own products.', 403);
  }
  await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
  return ok(res, null, { message: 'Product deleted successfully.' });
});

// GET /api/products/:id/stock?quantity=
const checkStock = asyncHandler(async (req, res) => {
  const [[product]] = await pool.query('SELECT stock FROM products WHERE id = ?', [req.params.id]);
  if (!product) return fail(res, 'Product not found.', 404);
  const quantity = Number(req.query.quantity) || 1;
  return res.json({ success: true, available: product.stock >= quantity, stock: product.stock });
});

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct, checkStock };