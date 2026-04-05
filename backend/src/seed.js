/**
 * DentAdmin — Demo Ma'lumotlar
 * Birinchi ishga tushirishda avtomatik yuklanadi
 */

const bcrypt = require('bcryptjs');

const DEFAULT_FORMULA = '(tushum - texnik) * percent / 100 + implant_count * implant_value';

async function seedDemo(pool) {
  console.log('🌱 Demo ma\'lumotlar yuklanmoqda...');

  const hash = (p) => bcrypt.hashSync(p, 10);

  // ── Klinika ──────────────────────────────────────────────────────────────
  await pool.query(`
    INSERT INTO clinics (id, name, address, phone, color) VALUES
    ('clinic_main', 'FDC Stomatologiya', 'Toshkent, Yunusobod tumani', '+998 90 123-45-67', '#6366f1')
    ON CONFLICT DO NOTHING
  `);

  // ── Foydalanuvchilar ─────────────────────────────────────────────────────
  const users = [
    ['user_super',  null,           'Super Admin',          'admin',  hash('admin123'),   'super_admin'],
    ['user_rahbar', 'clinic_main',  'Farrukh Abdirakhimov', 'rahbar', hash('rahbar123'),  'admin'],
    ['user_recep',  'clinic_main',  'Qabulxona Xodimi',     'kassir', hash('kassir123'),  'receptionist'],
  ];
  for (const [id, cid, fn, un, ph, role] of users) {
    await pool.query(`
      INSERT INTO users (id, clinic_id, full_name, username, password_hash, role)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING
    `, [id, cid, fn, un, ph, role]);
  }

  // ── Vrachlar ─────────────────────────────────────────────────────────────
  const doctors = [
    ['dr_shaxruz',  'clinic_main', 'Dr. Shaxruz',         35, '#6366f1'],
    ['dr_otanazar', 'clinic_main', 'Dr. Otanazar',        35, '#8b5cf6'],
    ['dr_abror',    'clinic_main', 'Dr. Abrorbek Saliyev',35, '#06b6d4'],
    ['dr_jahongir', 'clinic_main', 'Dr. Jahongir',        35, '#10b981'],
    ['dr_oybek_u',  'clinic_main', 'Dr. Oybek Usanovich', 30, '#f59e0b'],
    ['dr_bexzod',   'clinic_main', 'Dr. Bexzod',          30, '#ef4444'],
    ['dr_jasur',    'clinic_main', 'Dr. Jasur',           30, '#ec4899'],
    ['dr_oybek_q',  'clinic_main', 'Dr. Oybek Qazaqov',  30, '#84cc16'],
  ];
  for (const [id, cid, name, pct, color] of doctors) {
    await pool.query(`
      INSERT INTO doctors (id, clinic_id, name, percent, formula, implant_mode, implant_value, color)
      VALUES ($1,$2,$3,$4,$5,'fixed',300000,$6) ON CONFLICT DO NOTHING
    `, [id, cid, name, pct, DEFAULT_FORMULA, color]);
  }

  // ── Hamshiralar ──────────────────────────────────────────────────────────
  const nurses = [
    ['nurse_1', 'clinic_main', 'Yusupova Niyozjon',  2300000],
    ['nurse_2', 'clinic_main', 'R. Farangiz',         1290000],
    ['nurse_3', 'clinic_main', 'Xakimova Sevara',     1500000],
    ['nurse_4', 'clinic_main', 'Bekchanova Sarvinoz', 2500000],
  ];
  for (const [id, cid, name, salary] of nurses) {
    await pool.query(`
      INSERT INTO nurses (id, clinic_id, name, base_salary)
      VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING
    `, [id, cid, name, salary]);
  }

  // ── Sozlamalar ───────────────────────────────────────────────────────────
  await pool.query(`
    INSERT INTO settings (clinic_id, data) VALUES ('clinic_main', $1)
    ON CONFLICT DO NOTHING
  `, [JSON.stringify({
    dollarRate: 12700, arenda: 4450000, kommunal: 1290000, shaxruzXarajat: 0
  })]);

  // ── Default to'lov turlari ───────────────────────────────────────────────
  const defaultPaymentTypes = [
    { id: 'naqd',          name: 'Naqd pul',      icon: '💵', active: true,  builtin: true  },
    { id: 'terminal',      name: 'Terminal',       icon: '💳', active: true,  builtin: true  },
    { id: 'qr',            name: 'QR-kod',         icon: '📱', active: true,  builtin: true  },
    { id: 'inkassa',       name: 'Inkassa',        icon: '🏦', active: true,  builtin: true  },
    { id: 'prechesleniya', name: 'Prechesleniya',  icon: '🔄', active: true,  builtin: true  },
    { id: 'p2p',           name: 'P2P / Payme',    icon: '📲', active: true,  builtin: false },
  ];
  await pool.query(`
    INSERT INTO clinic_config (clinic_id, key, value) VALUES ('clinic_main','payment_types',$1)
    ON CONFLICT DO NOTHING
  `, [JSON.stringify(defaultPaymentTypes)]);

  // ── Default xarajat kategoriyalari ───────────────────────────────────────
  const defaultExpenseCats = [
    { id: 'arenda',   name: 'Arenda',         active: true },
    { id: 'kommunal', name: 'Kommunal',        active: true },
    { id: 'texnik',   name: 'Texnik material', active: true },
    { id: 'maosh',    name: 'Xodim maoshi',    active: true },
    { id: 'boshqa',   name: 'Boshqa',          active: true },
  ];
  await pool.query(`
    INSERT INTO clinic_config (clinic_id, key, value) VALUES ('clinic_main','expense_cats',$1)
    ON CONFLICT DO NOTHING
  `, [JSON.stringify(defaultExpenseCats)]);

  await pool.query(`
    INSERT INTO clinic_config (clinic_id, key, value) VALUES ('clinic_main','custom_fields','[]')
    ON CONFLICT DO NOTHING
  `);

  console.log('✅ Demo ma\'lumotlar yuklandi');
}

module.exports = { seedDemo };
