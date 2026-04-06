/**
 * PostgreSQL Connection Pool
 */

const { Pool } = require('pg');
const fs   = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('🔴 PostgreSQL pool xatosi:', err.message);
});

/**
 * Schema yaratish + demo data yuklash
 */
async function initDb() {
  const schemaSql = fs.readFileSync(
    path.join(__dirname, 'schema.sql'), 'utf8'
  );
  await pool.query(schemaSql);
  console.log('✅ Database schema tayyor');

  // ── Migratsiyalar (idempotent) ─────────────────────────────────────────────
  await pool.query(`
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS monthly_goal    BIGINT DEFAULT 0;
    ALTER TABLE users   ADD COLUMN IF NOT EXISTS telegram_id     TEXT;
    ALTER TABLE clinics ADD COLUMN IF NOT EXISTS active          BOOLEAN DEFAULT TRUE;
    ALTER TABLE clinics ADD COLUMN IF NOT EXISTS expires_at      TIMESTAMP;
    ALTER TABLE clinics ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;
  `);

  // Demo data — faqat klinikalar bo'sh bo'lsa
  const { rows } = await pool.query('SELECT COUNT(*) AS cnt FROM clinics');
  if (parseInt(rows[0].cnt) === 0) {
    const { seedDemo } = require('../seed');
    await seedDemo(pool);
  }
}

module.exports = { pool, initDb };
