-- DentAdmin: PostgreSQL Schema
-- Idempotent (qayta ishlatsa ham xato bermaydi)

-- ── Klinikalar ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinics (
  id         VARCHAR(60)  PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  address    TEXT,
  phone      VARCHAR(50),
  color      VARCHAR(20) DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Foydalanuvchilar ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(60)  PRIMARY KEY,
  clinic_id     VARCHAR(60)  REFERENCES clinics(id) ON DELETE CASCADE,
  full_name     VARCHAR(255) NOT NULL,
  username      VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  role          VARCHAR(50)  NOT NULL,  -- super_admin | admin | receptionist | doctor | nurse
  linked_id     VARCHAR(60),            -- doktor/hamshira ID bilan bog'lash
  telegram_id   VARCHAR(100),
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(username)
);

-- ── Vrachlar ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id            VARCHAR(60)  PRIMARY KEY,
  clinic_id     VARCHAR(60)  NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  percent       NUMERIC(6,2) DEFAULT 35,
  formula       TEXT         DEFAULT '(tushum - texnik) * percent / 100 + implant_count * implant_value',
  implant_mode  VARCHAR(20)  DEFAULT 'fixed',   -- fixed | percent
  implant_value BIGINT       DEFAULT 300000,
  color         VARCHAR(20)  DEFAULT '#6366f1',
  active        BOOLEAN DEFAULT TRUE,
  deleted       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Hamshiralar ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nurses (
  id          VARCHAR(60)  PRIMARY KEY,
  clinic_id   VARCHAR(60)  NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  base_salary BIGINT       DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  deleted     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Kunlik hisobotlar (JSONB — hozirgi localStorage strukturiga mos) ─────────
CREATE TABLE IF NOT EXISTS daily_reports (
  id         SERIAL      PRIMARY KEY,
  clinic_id  VARCHAR(60) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  data       JSONB       NOT NULL DEFAULT '{}',
  closed     BOOLEAN     DEFAULT FALSE,
  closed_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, date)
);

-- Indeks — oylik/yillik so'rovlar uchun tez
CREATE INDEX IF NOT EXISTS idx_reports_clinic_date ON daily_reports(clinic_id, date);

-- ── Sozlamalar (JSONB) ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  clinic_id  VARCHAR(60) PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Klinika konfiguratsiyasi ─────────────────────────────────────────────────
-- key: payment_types | expense_cats | custom_fields
CREATE TABLE IF NOT EXISTS clinic_config (
  clinic_id  VARCHAR(60) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  key        VARCHAR(100) NOT NULL,
  value      JSONB        NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (clinic_id, key)
);
