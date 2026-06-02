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

-- 4. บทบาทพนักงาน (staff)
CREATE TABLE IF NOT EXISTS staff_roles (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff','admin')),
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_read_own" ON staff_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "staff_write_own" ON staff_roles FOR ALL USING (auth.uid() = user_id);

-- staff สามารถอ่านนัดหมาย + packages ทุกคน (เพื่อ QR scan check-in)
CREATE POLICY "staff_read_all_appts" ON appointments
  FOR SELECT USING (EXISTS (SELECT 1 FROM staff_roles WHERE user_id = auth.uid()));
CREATE POLICY "staff_update_appts" ON appointments
  FOR UPDATE USING (EXISTS (SELECT 1 FROM staff_roles WHERE user_id = auth.uid()));

-- 5. โปรไฟล์ผู้ป่วย
CREATE TABLE IF NOT EXISTS profiles (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hn           TEXT,
  full_name    TEXT NOT NULL,
  initials     TEXT,
  tier         TEXT NOT NULL DEFAULT 'MEMBER'
                CHECK (tier IN ('MEMBER','SILVER','GOLD','PLATINUM')),
  phone        TEXT,
  member_since TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_profile"   ON profiles;
DROP POLICY IF EXISTS "staff_read_profiles" ON profiles;
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff_read_profiles" ON profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM staff_roles WHERE user_id = auth.uid()));

-- staff อ่าน packages ทุกคน (เพื่อ dashboard)
DROP POLICY IF EXISTS "staff_read_packages"   ON packages;
DROP POLICY IF EXISTS "staff_update_packages" ON packages;
CREATE POLICY "staff_read_packages"   ON packages
  FOR SELECT USING (EXISTS (SELECT 1 FROM staff_roles WHERE user_id = auth.uid()));
CREATE POLICY "staff_update_packages" ON packages
  FOR UPDATE USING (EXISTS (SELECT 1 FROM staff_roles WHERE user_id = auth.uid()));
