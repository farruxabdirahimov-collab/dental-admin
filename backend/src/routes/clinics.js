/**
 * Clinics Routes — /api/clinics
 * POST / yangi klinika: klinika + admin + kassir user + default sozlamalar yaratiladi
 */

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

function nanoid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function mapClinic(row) {
  return {
    id:        row.id,
    name:      row.name,
    address:   row.address,
    phone:     row.phone,
    color:     row.color,
    createdAt: row.created_at,
  };
}

// GET /api/clinics  [super_admin]
router.get('/', requireAuth(['super_admin']), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clinics ORDER BY created_at');
    res.json(rows.map(mapClinic));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/clinics  [super_admin] — klinika + admin + kassir yaratadi
router.post('/', requireAuth(['super_admin']), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, address, phone, adminUser, adminPass, color } = req.body;
    if (!name || !adminUser || !adminPass) {
      return res.status(400).json({ error: 'name, adminUser va adminPass majburiy' });
    }

    // 1. Klinikani yaratish
    const clinicId = nanoid('clinic_');
    const { rows: cRows } = await client.query(`
      INSERT INTO clinics (id, name, address, phone, color)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [clinicId, name, address||'', phone||'', color||'#6366f1']);

    // 2. Admin foydalanuvchi
    const adminHash = await bcrypt.hash(adminPass, 10);
    await client.query(`
      INSERT INTO users (id, clinic_id, username, password_hash, full_name, role)
      VALUES ($1,$2,$3,$4,$5,'admin')
    `, [nanoid('user_'), clinicId, adminUser, adminHash, `${name} Rahbari`]);

    // 3. Kassir foydalanuvchi
    const kassirHash = await bcrypt.hash(adminPass + '1', 10);
    await client.query(`
      INSERT INTO users (id, clinic_id, username, password_hash, full_name, role)
      VALUES ($1,$2,$3,$4,$5,'receptionist')
    `, [nanoid('user_'), clinicId, adminUser + '_kassir', kassirHash, `${name} Kassiri`]);

    // 4. Default sozlamalar
    const defaultSettings = {
      dollarRate: 12700, arenda: 0, kommunal: 0,
      implantValue: 300000, defaultPercent: 35
    };
    await client.query(`
      INSERT INTO settings (clinic_id, data) VALUES ($1, $2)
      ON CONFLICT (clinic_id) DO NOTHING
    `, [clinicId, JSON.stringify(defaultSettings)]);

    await client.query('COMMIT');
    res.status(201).json({
      clinic: mapClinic(cRows[0]),
      adminUsername: adminUser,
      kassirUsername: adminUser + '_kassir',
      kassirPassword: adminPass + '1',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/clinics/:clinicId
router.get('/:clinicId', requireAuth(), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clinics WHERE id=$1', [req.params.clinicId]);
    if (!rows[0]) return res.status(404).json({ error: 'Klinika topilmadi' });
    res.json(mapClinic(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/clinics/:clinicId
router.put('/:clinicId', requireAuth(['admin', 'super_admin']), async (req, res) => {
  try {
    const { name, address, phone, color } = req.body;
    const { rows } = await pool.query(`
      UPDATE clinics SET name=$2, address=$3, phone=$4, color=$5
      WHERE id=$1 RETURNING *
    `, [req.params.clinicId, name, address, phone, color]);
    if (!rows[0]) return res.status(404).json({ error: 'Klinika topilmadi' });
    res.json(mapClinic(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
