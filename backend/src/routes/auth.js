/**
 * Auth Routes — POST /api/auth/login | /logout
 */

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { pool } = require('../db/pool');

const JWT_SECRET  = process.env.JWT_SECRET  || 'dentadmin_jwt_secret_2026';
const JWT_EXPIRES = process.env.JWT_EXPIRES  || '30d';

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password, clinicId } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username va parol kiritilmadi' });
    }

    // Foydalanuvchini topish
    let query, params;
    if (clinicId) {
      query  = `SELECT * FROM users
                WHERE username = $1
                  AND (clinic_id = $2 OR role = 'super_admin')
                  AND active = TRUE`;
      params = [username, clinicId];
    } else {
      query  = `SELECT * FROM users WHERE username = $1 AND active = TRUE`;
      params = [username];
    }

    const { rows } = await pool.query(query, params);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    }

    // Parol tekshiruvi
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Parol noto\'g\'ri' });
    }

    // JWT yaratish
    const payload = {
      userId:   user.id,
      username: user.username,
      fullName: user.full_name,
      role:     user.role,
      clinicId: user.clinic_id,
      linkedId: user.linked_id,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({ ok: true, token, user: payload });
  } catch (err) {
    console.error('Login xatosi:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  // Stateless JWT — client token ni o'chirsa yetarli
  res.json({ ok: true });
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', require('../middleware/auth').requireAuth(), (req, res) => {
  res.json({ ok: true, user: req.user });
});

module.exports = router;
