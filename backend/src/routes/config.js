/**
 * Config Routes — /api/clinics/:clinicId/config/:key
 * key: payment_types | expense_cats | custom_fields
 */

const router = require('express').Router();
const { pool } = require('../db/pool');
const { requireAuth, requireClinicAccess } = require('../middleware/auth');

const auth      = [requireAuth(), requireClinicAccess];
const authAdmin = [requireAuth(['admin', 'super_admin']), requireClinicAccess];

// Default qiymatlar
const DEFAULTS = {
  payment_types: [
    { id: 'naqd',          name: 'Naqd pul',     icon: '💵', active: true,  builtin: true  },
    { id: 'terminal',      name: 'Terminal',      icon: '💳', active: true,  builtin: true  },
    { id: 'qr',            name: 'QR-kod',        icon: '📱', active: true,  builtin: true  },
    { id: 'inkassa',       name: 'Inkassa',       icon: '🏦', active: true,  builtin: true  },
    { id: 'prechesleniya', name: 'Prechesleniya', icon: '🔄', active: true,  builtin: true  },
    { id: 'p2p',           name: 'P2P / Payme',   icon: '📲', active: true,  builtin: false },
  ],
  expense_cats: [
    { id: 'arenda',   name: 'Arenda',         active: true },
    { id: 'kommunal', name: 'Kommunal',        active: true },
    { id: 'texnik',   name: 'Texnik material', active: true },
    { id: 'maosh',    name: 'Xodim maoshi',    active: true },
    { id: 'boshqa',   name: 'Boshqa',          active: true },
  ],
  custom_fields: [],
};

// GET /api/clinics/:clinicId/config/:key
router.get('/:clinicId/config/:key', ...auth, async (req, res) => {
  try {
    const { clinicId, key } = req.params;
    const { rows } = await pool.query(
      'SELECT value FROM clinic_config WHERE clinic_id=$1 AND key=$2',
      [clinicId, key]
    );
    res.json(rows[0]?.value ?? DEFAULTS[key] ?? []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/clinics/:clinicId/config/:key  (to'liq almashtirish)
router.put('/:clinicId/config/:key', ...authAdmin, async (req, res) => {
  try {
    const { clinicId, key } = req.params;
    await pool.query(`
      INSERT INTO clinic_config (clinic_id, key, value)
      VALUES ($1,$2,$3)
      ON CONFLICT (clinic_id, key) DO UPDATE
        SET value=$3, updated_at=NOW()
    `, [clinicId, key, JSON.stringify(req.body)]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
