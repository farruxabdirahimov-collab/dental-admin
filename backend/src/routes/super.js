/**
 * Super Admin Routes — /api/super/*
 * FAQAT KO'RISH + NAZORAT (ma'lumot o'zgartirish YO'Q)
 *
 * GET  /api/super/overview      — barcha klinikalar statistikasi
 * PATCH /api/super/clinics/:id/subscription — muddat + faollik boshqaruv
 * POST  /api/super/clinics/:id/reset-password — admin parolini tiklash
 */

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const superOnly = requireAuth(['super_admin']);

function daysRemaining(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function subscriptionStatus(clinic) {
  const days = daysRemaining(clinic.expires_at);
  if (!clinic.active)                 return { status: 'inactive',  label: 'Nofaol',           color: '#6b7280', days };
  if (days === null)                  return { status: 'no_expiry', label: 'Muddatsiz',        color: '#10b981', days };
  if (days < 0)                       return { status: 'expired',   label: 'Muddati tugagan',  color: '#ef4444', days };
  if (days <= 3)                      return { status: 'critical',  label: `${days} kun qoldi`, color: '#ef4444', days };
  if (days <= 7)                      return { status: 'warning',   label: `${days} kun qoldi`, color: '#f59e0b', days };
  return                                     { status: 'active',    label: `${days} kun qoldi`, color: '#10b981', days };
}

// ── GET /api/super/overview ──────────────────────────────────────────────────
router.get('/overview', superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.id, c.name, c.address, c.phone, c.color,
        c.active, c.expires_at, c.last_activity_at, c.created_at,
        (SELECT COUNT(*) FROM doctors      WHERE clinic_id=c.id AND deleted=FALSE) AS doctor_count,
        (SELECT COUNT(*) FROM nurses       WHERE clinic_id=c.id AND deleted=FALSE) AS nurse_count,
        (SELECT COUNT(*) FROM daily_reports WHERE clinic_id=c.id)                  AS report_count,
        (SELECT COUNT(*) FROM users        WHERE clinic_id=c.id)                   AS user_count,
        (SELECT MAX(date) FROM daily_reports WHERE clinic_id=c.id)                 AS last_report_date
      FROM clinics c
      ORDER BY c.created_at
    `);

    const data = rows.map(c => ({
      id:             c.id,
      name:           c.name,
      address:        c.address,
      phone:          c.phone,
      color:          c.color,
      active:         c.active,
      expiresAt:      c.expires_at,
      lastActivityAt: c.last_activity_at,
      lastReportDate: c.last_report_date,
      createdAt:      c.created_at,
      doctorCount:    parseInt(c.doctor_count),
      nurseCount:     parseInt(c.nurse_count),
      reportCount:    parseInt(c.report_count),
      userCount:      parseInt(c.user_count),
      subscription:   subscriptionStatus(c),
    }));

    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/super/clinics/:id/users ─────────────────────────────────────────
// Super admin foydalanuvchilar ro'yxatini (parolsiz) ko'radi
router.get('/clinics/:id/users', superOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, full_name, role, telegram_id, created_at
       FROM users WHERE clinic_id=$1 ORDER BY role, created_at`,
      [req.params.id]
    );
    res.json(rows.map(r => ({
      id: r.id, username: r.username, fullName: r.full_name,
      role: r.role, telegramId: r.telegram_id, createdAt: r.created_at
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/super/clinics/:id/subscription ────────────────────────────────
// Muddat va faollikni boshqarish
router.patch('/clinics/:id/subscription', superOnly, async (req, res) => {
  try {
    const { active, expiresAt } = req.body;
    const fields = [];
    const vals   = [req.params.id];

    if (active !== undefined) {
      fields.push(`active=$${vals.length + 1}`);
      vals.push(active);
    }
    if (expiresAt !== undefined) {
      fields.push(`expires_at=$${vals.length + 1}`);
      vals.push(expiresAt ? new Date(expiresAt) : null);
    }

    if (!fields.length) return res.status(400).json({ error: 'Hech narsa o\'zgartirilmadi' });

    const { rows } = await pool.query(
      `UPDATE clinics SET ${fields.join(',')} WHERE id=$1 RETURNING id, name, active, expires_at`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Klinika topilmadi' });

    res.json({
      ok: true,
      clinic: rows[0],
      subscription: subscriptionStatus(rows[0])
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/super/clinics/:id/reset-password ───────────────────────────────
// Klinika admin parolini tiklash (foydalanuvchi bilmaydi)
router.post('/clinics/:id/reset-password', superOnly, async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'userId va kamida 6 ta belgidan iborat newPassword kerak' });
    }

    // Foydalanuvchi shu klinikaga tegishli ekanini tekshirish
    const { rows: uRows } = await pool.query(
      'SELECT id, username, role FROM users WHERE id=$1 AND clinic_id=$2',
      [userId, req.params.id]
    );
    if (!uRows[0]) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, userId]);

    res.json({ ok: true, username: uRows[0].username, role: uRows[0].role });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
