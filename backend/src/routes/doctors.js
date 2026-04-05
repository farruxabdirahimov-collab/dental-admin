/**
 * Doctors Routes — /api/clinics/:clinicId/doctors
 */

const router = require('express').Router();
const { pool } = require('../db/pool');
const { requireAuth, requireClinicAccess } = require('../middleware/auth');

const auth = [requireAuth(), requireClinicAccess];

function mapDoctor(row) {
  return {
    id:           row.id,
    name:         row.name,
    percent:      parseFloat(row.percent),
    formula:      row.formula,
    implantMode:  row.implant_mode,
    implantValue: parseInt(row.implant_value),
    color:        row.color,
    active:       row.active,
    createdAt:    row.created_at,
  };
}

// GET /api/clinics/:clinicId/doctors
router.get('/:clinicId/doctors', ...auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM doctors WHERE clinic_id=$1 AND deleted=FALSE ORDER BY created_at',
      [req.params.clinicId]
    );
    res.json(rows.map(mapDoctor));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/clinics/:clinicId/doctors
router.post('/:clinicId/doctors', ...auth, async (req, res) => {
  try {
    const { id, name, percent, formula, implantMode, implantValue, color } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO doctors (id, clinic_id, name, percent, formula, implant_mode, implant_value, color)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [id, req.params.clinicId, name, percent||35, formula, implantMode||'fixed', implantValue||300000, color||'#6366f1']);
    res.json(mapDoctor(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/clinics/:clinicId/doctors/:docId
router.put('/:clinicId/doctors/:docId', ...auth, async (req, res) => {
  try {
    const { name, percent, formula, implantMode, implantValue, color, active } = req.body;
    const { rows } = await pool.query(`
      UPDATE doctors
      SET name=$3, percent=$4, formula=$5, implant_mode=$6, implant_value=$7, color=$8, active=$9
      WHERE id=$1 AND clinic_id=$2 RETURNING *
    `, [req.params.docId, req.params.clinicId, name, percent, formula, implantMode, implantValue, color, active]);
    if (!rows[0]) return res.status(404).json({ error: 'Vrach topilmadi' });
    res.json(mapDoctor(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/clinics/:clinicId/doctors/:docId (soft delete)
router.delete('/:clinicId/doctors/:docId', ...auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE doctors SET deleted=TRUE WHERE id=$1 AND clinic_id=$2',
      [req.params.docId, req.params.clinicId]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
