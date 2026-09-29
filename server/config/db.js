const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agrimarket',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
});

// Retry with backoff instead of giving up after one attempt. In Docker,
// the app container can start a moment before the database is actually
// reachable — a single failed check used to mean every request failed
// with a cryptic error until the whole server was restarted.
async function waitForDatabase(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await pool.getConnection();
      console.log('MySQL connected');
      conn.release();
      return true;
    } catch (err) {
      console.error(`MySQL connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        console.error(
          'Giving up after multiple attempts. Check that MySQL is running and ' +
          'DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in server/.env are correct.'
        );
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

waitForDatabase();

module.exports = pool;
