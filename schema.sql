-- ============================================================
-- SLC Clinic — Supabase Schema v2
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → Paste → Run
-- ============================================================

-- 1. คอร์ส/แพ็กเกจ
CREATE TABLE IF NOT EXISTS packages (
  id           TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cat          TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  total        INTEGER NOT NULL DEFAULT 1 CHECK (total > 0),
  used         INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
  price        INTEGER CHECK (price >= 0),
  per_visit    TEXT,
  note         TEXT,
  purchased_at TEXT,
  expiry       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. นัดหมาย
CREATE TABLE IF NOT EXISTS appointments (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id  TEXT REFERENCES packages(id) ON DELETE SET NULL,
  date        TEXT NOT NULL,
  time        TEXT NOT NULL,
  staff       TEXT,
  room        TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','confirmed','cancelled','completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes (ค้นหาเร็วขึ้น)
CREATE INDEX IF NOT EXISTS idx_packages_user     ON packages(user_id);
CREATE INDEX IF NOT EXISTS idx_appts_user        ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appts_package     ON appointments(package_id);
CREATE INDEX IF NOT EXISTS idx_appts_date        ON appointments(date);

-- 4. Row Level Security
ALTER TABLE packages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- ลบ policy เก่า (ถ้ามี) ก่อน create ใหม่
DROP POLICY IF EXISTS "users_own_packages"     ON packages;
DROP POLICY IF EXISTS "users_own_appointments" ON appointments;

CREATE POLICY "users_own_packages" ON packages
  FOR ALL USING      (auth.uid() = user_id)
  WITH CHECK         (auth.uid() = user_id);

CREATE POLICY "users_own_appointments" ON appointments
  FOR ALL USING      (auth.uid() = user_id)
  WITH CHECK         (auth.uid() = user_id);
