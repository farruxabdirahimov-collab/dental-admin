/**
 * Settings Routes — /api/clinics/:clinicId/settings
 */

const router = require('express').Router();
const { pool } = require('../db/pool');
const { requireAuth, requireClinicAccess } = require('../middleware/auth');

const auth = [requireAuth(), requireClinicAccess];

// GET /api/clinics/:clinicId/settings
router.get('/:clinicId/settings', ...auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT data FROM settings WHERE clinic_id=$1',
      [req.params.clinicId]
    );
    res.json(rows[0]?.data || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/clinics/:clinicId/settings  (upsert — merge)
router.put('/:clinicId/settings', requireAuth(['admin', 'super_admin']), requireClinicAccess, async (req, res) => {
  try {
    const updates = req.body;
    await pool.query(`
      INSERT INTO settings (clinic_id, data)
      VALUES ($1, $2)
      ON CONFLICT (clinic_id) DO UPDATE
        SET data = settings.data || $2::jsonb, updated_at = NOW()
    `, [req.params.clinicId, JSON.stringify(updates)]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
