/**
 * Nurses Routes — /api/clinics/:clinicId/nurses
 */

const router = require('express').Router();
const { pool } = require('../db/pool');
const { requireAuth, requireClinicAccess } = require('../middleware/auth');

const auth = [requireAuth(), requireClinicAccess];

function mapNurse(row) {
  return {
    id:         row.id,
    name:       row.name,
    baseSalary: parseInt(row.base_salary),
    active:     row.active,
    createdAt:  row.created_at,
  };
}

// GET /api/clinics/:clinicId/nurses
router.get('/:clinicId/nurses', ...auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM nurses WHERE clinic_id=$1 AND deleted=FALSE ORDER BY created_at',
      [req.params.clinicId]
    );
    res.json(rows.map(mapNurse));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/clinics/:clinicId/nurses
router.post('/:clinicId/nurses', ...auth, async (req, res) => {
  try {
    const { id, name, baseSalary } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO nurses (id, clinic_id, name, base_salary)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [id, req.params.clinicId, name, baseSalary||0]);
    res.json(mapNurse(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/clinics/:clinicId/nurses/:nurseId
router.put('/:clinicId/nurses/:nurseId', ...auth, async (req, res) => {
  try {
    const { name, baseSalary, active } = req.body;
    const { rows } = await pool.query(`
      UPDATE nurses SET name=$3, base_salary=$4, active=$5
      WHERE id=$1 AND clinic_id=$2 RETURNING *
    `, [req.params.nurseId, req.params.clinicId, name, baseSalary, active]);
    if (!rows[0]) return res.status(404).json({ error: 'Hamshira topilmadi' });
    res.json(mapNurse(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/clinics/:clinicId/nurses/:nurseId (soft)
router.delete('/:clinicId/nurses/:nurseId', ...auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE nurses SET deleted=TRUE WHERE id=$1 AND clinic_id=$2',
      [req.params.nurseId, req.params.clinicId]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
