/**
 * Seeds test accounts and sample products.
 * Run after importing database/schema.sql:
 *   cd server && npm install && npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('./config/db');

const newId = () => crypto.randomUUID();

async function ensureSchema() {
  // Existing databases (that were seeded before this table existed) won't get
  // the withdrawals table from schema.sql — schema.sql only runs when the
  // Docker MySQL volume is first created. Create it here, idempotently, so
  // every `npm run seed` brings the DB up to date regardless.
  await pool.query(`CREATE TABLE IF NOT EXISTS withdrawals (
    id              CHAR(36)      NOT NULL PRIMARY KEY,
    farmer_id       CHAR(36)      NOT NULL,
    amount          DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    method          ENUM('bkash','nagad','bank') NOT NULL,
    account_details VARCHAR(255)  NOT NULL,
    status          ENUM('pending','approved','completed','rejected') NOT NULL DEFAULT 'pending',
    admin_note      VARCHAR(255)  DEFAULT NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_withdrawals_farmer FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_withdrawals_farmer (farmer_id),
    INDEX idx_withdrawals_status (status)
  ) ENGINE=InnoDB`);
}

async function seed() {
  console.log('Seeding AgriMarket database...');
  await ensureSchema();

  const [categories] = await pool.query('SELECT id, name FROM categories');
  const catId = (name) => categories.find((c) => c.name === name)?.id;

  // --- Test accounts -----------------------------------------------------
  const accounts = [
    {
      email: 'admin@agrimarket.test',
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
      role: 'admin',
      first_name: 'Rahim',
      last_name: 'Admin',
    },
    {
      email: 'admin2@agrimarket.test',
      password: process.env.SEED_ADMIN2_PASSWORD || 'Admin2@123',
      role: 'admin',
      first_name: 'Sultana',
      last_name: 'Admin',
    },
    {
      email: 'admin3@agrimarket.test',
      password: process.env.SEED_ADMIN3_PASSWORD || 'Admin3@123',
      role: 'admin',
      first_name: 'Jasim',
      last_name: 'Admin',
    },
    {
      email: 'farmer@agrimarket.test',
      password: process.env.SEED_FARMER_PASSWORD || 'Farmer@123',
      role: 'farmer',
      first_name: 'Karim',
      last_name: 'Farmer',
    },
    {
      email: 'buyer@agrimarket.test',
      password: process.env.SEED_BUYER_PASSWORD || 'Buyer@123',
      role: 'buyer',
      first_name: 'Fatema',
      last_name: 'Buyer',
    },
  ];

  const userIds = {};
  for (const acc of accounts) {
    const [[existing]] = await pool.query('SELECT id FROM users WHERE email = ?', [acc.email]);
    if (existing) {
      userIds[acc.role] = existing.id;
      console.log(`  - ${acc.role} account already exists (${acc.email})`);
      continue;
    }
    const id = newId();
    const passwordHash = await bcrypt.hash(acc.password, 10);
    await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, city, state, is_kyc_verified, kyc_status)
       VALUES (?, ?, ?, ?, ?, '+8801700000000', ?, 'Dhaka', 'Dhaka', 1, 'verified')`,
      [id, acc.email, passwordHash, acc.first_name, acc.last_name, acc.role]
    );
    userIds[acc.role] = id;
    if (acc.role === 'buyer') {
      await pool.query('INSERT INTO carts (id, user_id) VALUES (?, ?)', [newId(), id]);
    }
    console.log(`  - created ${acc.role} account: ${acc.email} / ${acc.password}`);
  }

  // --- Sample products (owned by the seeded farmer) -----------------------
  const [[productCount]] = await pool.query('SELECT COUNT(*) AS n FROM products');
  if (productCount.n === 0) {
    const products = [
      { name: 'Fresh Tomatoes', category: 'Vegetables', price: 800, unit: 'kg', stock: 120 },
      { name: 'Sweet Bananas', category: 'Fruits', price: 500, unit: 'bunch', stock: 60 },
      { name: 'Long Grain Rice', category: 'Grains', price: 25000, unit: 'bag', stock: 30 },
      { name: 'Fresh Cow Milk', category: 'Dairy', price: 1200, unit: 'litre', stock: 45 },
      { name: 'Free-range Eggs', category: 'Poultry', price: 2500, unit: 'crate', stock: 40 },
      { name: 'Yam Tubers', category: 'Tubers', price: 1500, unit: 'tuber', stock: 80 },
      { name: 'Dried Pepper', category: 'Spices', price: 1800, unit: 'kg', stock: 55 },
      { name: 'Goat Meat', category: 'Livestock', price: 4500, unit: 'kg', stock: 20 },
    ];
    for (const p of products) {
      const productId = newId();
      await pool.query(
        `INSERT INTO products (id, farmer_id, category_id, name, description, price, unit, stock, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId,
          userIds.farmer,
          catId(p.category) || null,
          p.name,
          `Farm-fresh ${p.name.toLowerCase()}, sourced directly from local farmers.`,
          p.price,
          p.unit,
          p.stock,
          Math.random() > 0.6 ? 1 : 0,
        ]
      );
      await pool.query(
        `INSERT INTO inventory_logs (id, product_id, farmer_id, change_type, quantity_change, previous_stock, new_stock, reason)
         VALUES (?, ?, ?, 'initial', ?, 0, ?, 'Initial stock (seed data)')`,
        [newId(), productId, userIds.farmer, p.stock, p.stock]
      );
    }
    console.log(`  - created ${products.length} sample products`);
  } else {
    console.log('  - products already exist, skipping product seed');
  }

  console.log('\nSeed complete. Test accounts:');
  for (const acc of accounts) console.log(`  ${acc.role}: ${acc.email} / ${acc.password}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
