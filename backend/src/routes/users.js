/**
 * Users Routes — /api/clinics/:clinicId/users
 */

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { pool } = require('../db/pool');
const { requireAuth, requireClinicAccess } = require('../middleware/auth');

const authAdmin = [requireAuth(['admin', 'super_admin']), requireClinicAccess];
const auth      = [requireAuth(), requireClinicAccess];

function mapUser(row) {
  return {
    id:         row.id,
    clinicId:   row.clinic_id,
    fullName:   row.full_name,
    username:   row.username,
    role:       row.role,
    linkedId:   row.linked_id,
    telegramId: row.telegram_id,
    active:     row.active,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
    // password_hash qaytarilmaydi!
  };
}

// GET /api/clinics/:clinicId/users
router.get('/:clinicId/users', ...auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE clinic_id=$1 OR (role='super_admin' AND $1='') ORDER BY created_at`,
      [req.params.clinicId]
    );
    res.json(rows.map(mapUser));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/clinics/:clinicId/users
router.post('/:clinicId/users', ...authAdmin, async (req, res) => {
  try {
    const { id, fullName, username, password, role, linkedId, telegramId } = req.body;
    if (!password) return res.status(400).json({ error: 'Parol kiritilmadi' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(`
      INSERT INTO users (id, clinic_id, full_name, username, password_hash, role, linked_id, telegram_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [id, req.params.clinicId, fullName, username||null, hash, role, linkedId||null, telegramId||null]);
    res.json(mapUser(rows[0]));
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Bu username allaqachon band' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clinics/:clinicId/users/:userId
router.put('/:clinicId/users/:userId', ...authAdmin, async (req, res) => {
  try {
    const { fullName, username, password, role, linkedId, telegramId, active } = req.body;

    let passwordClause = '';
    const params = [req.params.userId, req.params.clinicId, fullName, username||null, role, linkedId||null, telegramId||null, active];

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      passwordClause = ', password_hash=$9';
      params.push(hash);
    }

    const { rows } = await pool.query(`
      UPDATE users
      SET full_name=$3, username=$4, role=$5, linked_id=$6,
          telegram_id=$7, active=$8, updated_at=NOW() ${passwordClause}
      WHERE id=$1 AND clinic_id=$2 RETURNING *
    `, params);

    if (!rows[0]) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    res.json(mapUser(rows[0]));
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Bu username band' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clinics/:clinicId/users/:userId
router.delete('/:clinicId/users/:userId', ...authAdmin, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM users WHERE id=$1 AND clinic_id=$2',
      [req.params.userId, req.params.clinicId]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
