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
// Login va/yoki parol yangilash
router.post('/clinics/:id/reset-password', superOnly, async (req, res) => {
  try {
    const { userId, newPassword, newLogin } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId kerak' });
    if (!newPassword && !newLogin) return res.status(400).json({ error: 'newPassword yoki newLogin kerak' });
    if (newPassword && newPassword.length < 6) return res.status(400).json({ error: 'Parol kamida 6 ta belgi' });

    const { rows: uRows } = await pool.query(
      'SELECT id, username, role FROM users WHERE id=$1 AND clinic_id=$2',
      [userId, req.params.id]
    );
    if (!uRows[0]) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    const fields = []; const vals = [userId];

    if (newLogin && newLogin !== uRows[0].username) {
      // Login noyobligini tekshirish
      const { rows: dup } = await pool.query('SELECT id FROM users WHERE username=$1 AND id!=$2', [newLogin, userId]);
      if (dup.length) return res.status(409).json({ error: `"${newLogin}" username allaqachon mavjud` });
      fields.push(`username=$${vals.length + 1}`); vals.push(newLogin);
    }
    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, 10);
      fields.push(`password_hash=$${vals.length + 1}`); vals.push(hash);
    }

    if (!fields.length) return res.json({ ok: true, message: 'Hech narsa o\'zgartirilmadi' });

    await pool.query(`UPDATE users SET ${fields.join(',')} WHERE id=$1`, vals);
    res.json({ ok: true, username: newLogin || uRows[0].username, role: uRows[0].role });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/super/clinics/:id/stats ─────────────────────────────────────────
router.get('/clinics/:id/stats', superOnly, async (req, res) => {
  try {
    const id = req.params.id;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    // Correct end-of-month: use first day of next month
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const nextMonth = month === 12 ? `${year+1}-01-01` : `${year}-${String(month+1).padStart(2,'0')}-01`;

    const { rows: reports } = await pool.query(
      `SELECT data FROM daily_reports WHERE clinic_id=$1 AND date>=$2 AND date<$3`,
      [id, from, nextMonth]
    );

    let tushum = 0, avansTotal = 0, xarajat = 0, nonCash = 0;
    for (const r of reports) {
      const d = r.data || {};
      for (const doc of Object.values(d.doctors || {})) {
        tushum += Number(doc.tushum) || 0;
        avansTotal += Number(doc.avans) || 0;
      }
      for (const nurse of Object.values(d.nurses || {})) {
        avansTotal += Number(nurse.avans) || 0;
      }
      for (const exp of (d.expenses || [])) xarajat += Number(exp.amount) || 0;
      for (const v of Object.values(d.payments || {})) nonCash += Number(v) || 0;
    }

    const { rows: doctors } = await pool.query(
      'SELECT name, data FROM doctors WHERE clinic_id=$1 AND deleted=FALSE ORDER BY name', [id]);
    const { rows: nurses } = await pool.query(
      'SELECT name, data FROM nurses WHERE clinic_id=$1 AND deleted=FALSE ORDER BY name', [id]);

    res.json({
      thisMonth: {
        tushum, avansTotal, xarajat, nonCash,
        kassaNaqd: tushum - nonCash,
        foyda: tushum - xarajat - avansTotal,
        days: reports.length
      },
      doctors: doctors.map(d => ({ name: d.name, percent: d.data?.percent || 35 })),
      nurses:  nurses.map(n => ({ name: n.name, baseSalary: n.data?.baseSalary || 0 })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/super/compare ────────────────────────────────────────────────────
// Barcha klinikalar taqqoslash (bu oy moliyaviy ma'lumotlar)
router.get('/compare', superOnly, async (req, res) => {
  try {
    const { rows: clinics } = await pool.query(
      'SELECT id, name FROM clinics ORDER BY created_at');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const nextMonth = month === 12 ? `${year+1}-01-01` : `${year}-${String(month+1).padStart(2,'0')}-01`;

    const result = [];
    for (const clinic of clinics) {
      const { rows: reports } = await pool.query(
        `SELECT data FROM daily_reports WHERE clinic_id=$1 AND date>=$2 AND date<$3`,
        [clinic.id, from, nextMonth]
      );

      let tushum = 0, avans = 0, xarajat = 0, nonCash = 0, terminal = 0;
      for (const r of reports) {
        const d = r.data || {};
        for (const doc of Object.values(d.doctors || {})) {
          tushum += Number(doc.tushum) || 0;
          avans  += Number(doc.avans)  || 0;
        }
        for (const nurse of Object.values(d.nurses || {})) {
          avans += Number(nurse.avans) || 0;
        }
        for (const exp of (d.expenses || [])) xarajat += Number(exp.amount) || 0;
        const pmts = d.payments || {};
        for (const [k, v] of Object.entries(pmts)) {
          const amt = Number(v) || 0;
          nonCash += amt;
          if (k === 'terminal') terminal += amt;
        }
      }

      result.push({
        id: clinic.id,
        name: clinic.name,
        days: reports.length,
        tushum,
        xarajat,
        avans,
        nonCash,
        terminal,
        kassaNaqd: tushum - nonCash,
        foyda: tushum - xarajat - avans,
      });
    }

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/super/broadcast-settings ────────────────────────────────────────
// Barcha klinikalarga sozlamalarni tarqatish (masalan: salaryFormulas)
router.post('/broadcast-settings', superOnly, async (req, res) => {
  try {
    const updates = req.body; // { salaryFormulas: [...] } yoki boshqa settings
    if (!updates || !Object.keys(updates).length) {
      return res.status(400).json({ error: 'Sozlama ma\'lumoti kerak' });
    }

    const { rows: clinics } = await pool.query('SELECT id FROM clinics');

    let updated = 0;
    for (const clinic of clinics) {
      await pool.query(`
        INSERT INTO settings (clinic_id, data)
        VALUES ($1, $2)
        ON CONFLICT (clinic_id) DO UPDATE
          SET data = settings.data || $2::jsonb, updated_at = NOW()
      `, [clinic.id, JSON.stringify(updates)]);
      updated++;
    }

    res.json({ ok: true, updated, message: `${updated} ta klinikaga tarqatildi` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
