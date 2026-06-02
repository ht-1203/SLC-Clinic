/* ============================================================
   SLC Clinic — Supabase integration v2
   ============================================================ */

const SUPA_URL = 'https://pcatoorajreiofsvpdhj.supabase.co';
const SUPA_KEY = 'sb_publishable_T5FCHnar9rlkDLdSFZSFCg_tzg8gFrM';

const _supa = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

let _user = null;
let _seedAttempts = 0;

/* ---- ตรวจ session (ไม่ network call ถ้า session cache ยังอยู่) ---- */
async function supaCheckSession() {
  const { data: { session } } = await _supa.auth.getSession();
  if (session?.user) { _user = session.user; return true; }
  return false;
}

/* ---- auth: anonymous sign-in ---- */
async function supaInit() {
  if (_user) return _user; // มี user แล้ว ไม่ต้อง call ซ้ำ
  const { data: { session } } = await _supa.auth.getSession();
  if (session?.user) { _user = session.user; return _user; }
  const { data, error } = await _supa.auth.signInAnonymously();
  if (error) throw new Error('Auth failed: ' + error.message);
  _user = data.user;
  return _user;
}

/* ---- Patient login: HN + เลขบัตรประชาชน ---- */
async function signInPatient(hn, idCard) {
  if (!hn?.trim()) throw new Error('กรุณากรอกเลข HN');
  if (!idCard || idCard.replace(/\D/g,'').length !== 13) throw new Error('เลขบัตรประชาชนต้องมี 13 หลัก');
  const digits = idCard.replace(/\D/g,'');
  const email = `hn.${hn.trim().toLowerCase()}@slc-clinic.internal`;
  const pass = digits.slice(0,4) + digits.slice(-4); // 8 chars from ID card
  let { data, error } = await _supa.auth.signInWithPassword({ email, password: pass });
  if (error) {
    // First time: sign up
    const r = await _supa.auth.signUp({ email, password: pass });
    if (r.error) throw new Error('HN หรือเลขบัตรประชาชนไม่ถูกต้อง');
    data = r.data;
  }
  _user = data.user;
  // Save patient HN in profile metadata
  await _supa.from('packages').select('id').eq('user_id', _user.id).limit(1);
  return _user;
}

/* ---- Staff login: email + password ---- */
async function signInStaff(email, password) {
  const { data, error } = await _supa.auth.signInWithPassword({ email, password });
  if (error) throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  _user = data.user;
  return _user;
}

/* ---- Sign up staff (admin use) ---- */
async function signUpStaff(email, password, fullName) {
  const { data, error } = await _supa.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (data.user) {
    await _supa.from('staff_roles').upsert({ user_id: data.user.id, full_name: fullName, role: 'staff' });
  }
  return data.user;
}

/* ---- Check if current user is staff ---- */
async function isStaff() {
  if (!_user) return false;
  const { data } = await _supa.from('staff_roles').select('role').eq('user_id', _user.id).single();
  return !!data;
}

function supaSignOut() { return _supa.auth.signOut(); }
function supaIsAnonymous() { return _user?.is_anonymous === true; }

/* ---- Email OTP (fallback) ---- */
async function supaSignInEmail(email) {
  const { error } = await _supa.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw new Error(error.message);
}
async function supaVerifyOTP(email, token) {
  const { data, error } = await _supa.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw new Error(error.message);
  _user = data.user;
  return _user;
}

/* ---- load user data ---- */
async function supaLoad() {
  if (!_user) return;

  const [pkgRes, apptRes] = await Promise.all([
    _supa.from('packages').select('*').eq('user_id', _user.id).order('created_at'),
    _supa.from('appointments').select('*').eq('user_id', _user.id).order('date'),
  ]);

  if (pkgRes.error) throw new Error('Load packages: ' + pkgRes.error.message);
  if (apptRes.error) throw new Error('Load appointments: ' + apptRes.error.message);

  const pkgs = pkgRes.data;
  const appts = apptRes.data;

  // New user → seed demo data (max 2 attempts)
  if (!pkgs || pkgs.length === 0) {
    if (_seedAttempts >= 2) throw new Error('Seed failed after retries');
    _seedAttempts++;
    await supaSeed();
    _seedAttempts = 0;
    return supaLoad();
  }

  // Map Supabase → app model
  COURSES.splice(0, COURSES.length, ...pkgs.map(p => ({
    id: p.id, cat: p.cat, name: p.name, desc: p.description,
    total: p.total, used: p.used, price: p.price,
    perVisit: p.per_visit, note: p.note,
    purchasedAt: p.purchased_at, expiry: p.expiry,
  })));

  APPOINTMENTS.splice(0, APPOINTMENTS.length, ...(appts || []).map(a => ({
    id: a.id, courseId: a.package_id,
    date: a.date, time: a.time,
    staff: a.staff, room: a.room, status: a.status,
  })));

  // Sync TREATMENTS owned flag with real data
  TREATMENTS.forEach(t => {
    const c = COURSES.find(c => c.id === t.id);
    t.owned = !!(c && remaining(c) > 0);
  });
}

/* ---- seed demo data for new user ---- */
async function supaSeed() {
  const uid = _user.id;
  const { error: e1 } = await _supa.from('packages').insert(
    COURSES.map(c => ({
      id: c.id, user_id: uid, cat: c.cat, name: c.name,
      description: c.desc || null, total: c.total, used: c.used,
      price: c.price || null, per_visit: c.perVisit || null,
      note: c.note || null, purchased_at: c.purchasedAt || null,
      expiry: c.expiry || null,
    }))
  );
  if (e1) throw new Error('Seed packages: ' + e1.message);

  if (APPOINTMENTS.length > 0) {
    const { error: e2 } = await _supa.from('appointments').insert(
      APPOINTMENTS.map(a => ({
        id: a.id, user_id: uid, package_id: a.courseId,
        date: a.date, time: a.time,
        staff: a.staff || null, room: a.room || null,
        status: a.status || 'pending',
      }))
    );
    if (e2) throw new Error('Seed appointments: ' + e2.message);
  }
}

/* ---- CRUD with error reporting ---- */
async function supaSaveCourse(c) {
  if (!_user) return;
  const { error } = await _supa.from('packages').upsert({
    id: c.id, user_id: _user.id, cat: c.cat, name: c.name,
    description: c.desc || null, total: c.total, used: c.used,
    price: c.price || null, per_visit: c.perVisit || null,
    note: c.note || null, purchased_at: c.purchasedAt || null,
    expiry: c.expiry || null,
  });
  if (error) throw new Error(error.message);
}

async function supaSaveAppt(a) {
  if (!_user) return;
  const { error } = await _supa.from('appointments').upsert({
    id: a.id, user_id: _user.id, package_id: a.courseId,
    date: a.date, time: a.time,
    staff: a.staff || null, room: a.room || null,
    status: a.status || 'pending',
  });
  if (error) throw new Error(error.message);
}

async function supaDeleteAppt(id) {
  if (!_user) return;
  const { error } = await _supa.from('appointments')
    .delete().eq('id', id).eq('user_id', _user.id);
  if (error) throw new Error(error.message);
}

async function supaResetData() {
  if (!_user) return;
  const [r1, r2] = await Promise.all([
    _supa.from('packages').delete().eq('user_id', _user.id),
    _supa.from('appointments').delete().eq('user_id', _user.id),
  ]);
  if (r1.error) throw new Error(r1.error.message);
  if (r2.error) throw new Error(r2.error.message);
}
