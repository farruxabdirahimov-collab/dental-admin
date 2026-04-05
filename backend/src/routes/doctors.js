/**
 * Doctors Routes — /api/clinics/:clinicId/doctors
 * GET: barcha autentifikatsiyalangan foydalanuvchilar (kassir ham)
 * POST/PUT/DELETE: faqat admin/super_admin
 */

const router = require('express').Router();
const { pool } = require('../db/pool');
const { requireAuth, requireClinicAccess } = require('../middleware/auth');

const auth     = [requireAuth(), requireClinicAccess];
const adminAuth = [requireAuth(['admin', 'super_admin']), requireClinicAccess];

function mapDoctor(row) {
  return {
    id:           row.id,
    name:         row.name,
    percent:      parseFloat(row.percent),
    formula:      row.formula,
    implantMode:  row.implant_mode,
    implantValue: parseInt(row.implant_value),
    monthlyGoal:  parseInt(row.monthly_goal) || 0,
    color:        row.color,
    active:       row.active,
    createdAt:    row.created_at,
  };
}

// GET /api/clinics/:clinicId/doctors  — barcha foydalanuvchilar
router.get('/:clinicId/doctors', ...auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM doctors WHERE clinic_id=$1 AND deleted=FALSE ORDER BY created_at',
      [req.params.clinicId]
    );
    res.json(rows.map(mapDoctor));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/clinics/:clinicId/doctors  — faqat admin
router.post('/:clinicId/doctors', ...adminAuth, async (req, res) => {
  try {
    const { id, name, percent, formula, implantMode, implantValue, color, monthlyGoal } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO doctors (id, clinic_id, name, percent, formula, implant_mode, implant_value, color, monthly_goal)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [id, req.params.clinicId, name, percent||35, formula, implantMode||'fixed',
        implantValue||300000, color||'#6366f1', monthlyGoal||0]);
    res.json(mapDoctor(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/clinics/:clinicId/doctors/:docId  — faqat admin
router.put('/:clinicId/doctors/:docId', ...adminAuth, async (req, res) => {
  try {
    const { name, percent, formula, implantMode, implantValue, color, active, monthlyGoal } = req.body;
    const { rows } = await pool.query(`
      UPDATE doctors
      SET name=$3, percent=$4, formula=$5, implant_mode=$6,
          implant_value=$7, color=$8, active=$9, monthly_goal=$10
      WHERE id=$1 AND clinic_id=$2 RETURNING *
    `, [req.params.docId, req.params.clinicId,
        name, percent, formula, implantMode, implantValue, color,
        active !== undefined ? active : true,
        monthlyGoal||0]);
    if (!rows[0]) return res.status(404).json({ error: 'Vrach topilmadi' });
    res.json(mapDoctor(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/clinics/:clinicId/doctors/:docId  — faqat admin
router.delete('/:clinicId/doctors/:docId', ...adminAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE doctors SET deleted=TRUE WHERE id=$1 AND clinic_id=$2',
      [req.params.docId, req.params.clinicId]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
