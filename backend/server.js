/**
 * DentAdmin — Express Server
 * Frontend (static) + REST API — bitta Railway service
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { initDb }      = require('./src/db/pool');
const authRoutes      = require('./src/routes/auth');
const clinicRoutes    = require('./src/routes/clinics');
const doctorRoutes    = require('./src/routes/doctors');
const nurseRoutes     = require('./src/routes/nurses');
const reportRoutes    = require('./src/routes/reports');
const settingsRoutes  = require('./src/routes/settings');
const userRoutes      = require('./src/routes/users');
const configRoutes    = require('./src/routes/config');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── Frontend statik fayllar ─────────────────────────────────────────────────
// server.js backend/ ichida, root = ../
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/clinics', doctorRoutes);
app.use('/api/clinics', nurseRoutes);
app.use('/api/clinics', reportRoutes);
app.use('/api/clinics', settingsRoutes);
app.use('/api/clinics', userRoutes);
app.use('/api/clinics', configRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ── SPA Fallback (barcha boshqa so'rovlar → index.html) ─────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint topilmadi' });
  }
  res.sendFile(path.join(rootDir, 'index.html'));
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔴 Server xatosi:', err.message);
  res.status(500).json({ error: err.message || 'Server ichki xatosi' });
});

// ── Start ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await initDb();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ DentAdmin server ishlamoqda: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Server ishga tushmadi:', err.message);
    process.exit(1);
  }
}

start();
