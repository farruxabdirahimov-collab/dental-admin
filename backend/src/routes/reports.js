/**
 * Reports Routes — /api/clinics/:clinicId/reports/*
 * Kunlik, oylik, yillik hisobotlar
 * data JSONB — hozirgi localStorage strukturiga aynan mos
 */

const router = require('express').Router();
const { pool } = require('../db/pool');
const { requireAuth, requireClinicAccess } = require('../middleware/auth');

const auth = [requireAuth(), requireClinicAccess];

/** DB row → frontend ob'yekt */
function mapReport(row) {
  return {
    ...row.data,
    date:      typeof row.date === 'string' ? row.date : row.date.toISOString().split('T')[0],
    _closed:   row.closed,
    _closedAt: row.closed_at,
  };
}

// ── GET /api/clinics/:id/reports/daily?date=YYYY-MM-DD ───────────────────────
router.get('/:clinicId/reports/daily', ...auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date parametri kerak (YYYY-MM-DD)' });

    const { rows } = await pool.query(
      'SELECT * FROM daily_reports WHERE clinic_id=$1 AND date=$2',
      [req.params.clinicId, date]
    );
    if (!rows[0]) return res.json(null);
    res.json(mapReport(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/clinics/:id/reports/daily  (upsert) ────────────────────────────
router.put('/:clinicId/reports/daily', ...auth, async (req, res) => {
  try {
    const report = req.body;
    const { date, _closed, _closedAt, ...data } = report;
    if (!date) return res.status(400).json({ error: 'date maydoni kerak' });

    await pool.query(`
      INSERT INTO daily_reports (clinic_id, date, data, closed, closed_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (clinic_id, date) DO UPDATE
        SET data=$3, closed=$4, closed_at=$5, updated_at=NOW()
    `, [req.params.clinicId, date, JSON.stringify(data), _closed||false, _closedAt||null]);

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/clinics/:id/reports/monthly?year=&month= ────────────────────────
router.get('/:clinicId/reports/monthly', ...auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ error: 'year va month kerak' });

    const { rows } = await pool.query(`
      SELECT * FROM daily_reports
      WHERE clinic_id=$1
        AND EXTRACT(YEAR  FROM date)::int = $2
        AND EXTRACT(MONTH FROM date)::int = $3
      ORDER BY date
    `, [req.params.clinicId, parseInt(year), parseInt(month)]);

    res.json(rows.map(mapReport));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/clinics/:id/reports/yearly?year= ────────────────────────────────
router.get('/:clinicId/reports/yearly', ...auth, async (req, res) => {
  try {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: 'year parametri kerak' });

    const { rows } = await pool.query(`
      SELECT * FROM daily_reports
      WHERE clinic_id=$1
        AND EXTRACT(YEAR FROM date)::int = $2
      ORDER BY date
    `, [req.params.clinicId, parseInt(year)]);

    res.json(rows.map(mapReport));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/clinics/:id/reports?limit=30 — so'nggi N ta hisobot ─────────────
router.get('/:clinicId/reports', ...auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 90, 365);
    const { rows } = await pool.query(`
      SELECT * FROM daily_reports
      WHERE clinic_id=$1
      ORDER BY date DESC
      LIMIT $2
    `, [req.params.clinicId, limit]);
    res.json(rows.map(mapReport).reverse());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/clinics/:id/reports/daily?date= ──────────────────────────────
router.delete('/:clinicId/reports/daily', ...auth, async (req, res) => {
  try {
    const { date } = req.query;
    await pool.query(
      'DELETE FROM daily_reports WHERE clinic_id=$1 AND date=$2',
      [req.params.clinicId, date]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
