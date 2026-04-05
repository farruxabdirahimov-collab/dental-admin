/**
 * Clinics Routes — /api/clinics
 */

const router = require('express').Router();
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

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

// POST /api/clinics [super_admin]
router.post('/', requireAuth(['super_admin']), async (req, res) => {
  try {
    const { id, name, address, phone, color } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO clinics (id, name, address, phone, color)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [id, name, address, phone, color || '#6366f1']);
    res.json(mapClinic(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/clinics/:clinicId
router.get('/:clinicId', requireAuth(), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM clinics WHERE id=$1', [req.params.clinicId]
    );
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
