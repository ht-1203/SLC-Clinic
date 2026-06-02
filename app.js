/* ============================================================
   SLC Clinic — App controller
   ============================================================ */

const $view   = document.getElementById('view');
const $tabbar = document.getElementById('tabbar');
const $toast  = document.getElementById('toast');

/* ============================================================
   SPLASH SCREEN
   ============================================================ */
function showSplash(onDone) {
  const el = document.getElementById('splash');
  if (!el) { onDone(); return; }
  el.style.display = 'flex';
  // Animate in
  setTimeout(() => el.classList.add('splash--ready'), 50);
  // Animate out after 2s
  setTimeout(() => {
    el.classList.add('splash--exit');
    setTimeout(() => { el.style.display = 'none'; onDone(); }, 500);
  }, 2000);
}

/* ============================================================
   PIN SCREEN
   ============================================================ */
const PIN_KEY_PATIENT = 'slc_pin_patient';
const PIN_KEY_STAFF   = 'slc_pin_staff';
const PIN_KEY  = 'slc_pin'; // legacy — will be migrated
const ROLE_KEY = 'slc_role';

/* ---- helper: mount/remove full-screen layer ---- */
function mountLayer(html, cls) {
  const el = document.createElement('div');
  el.className = cls; el.innerHTML = html;
  document.getElementById('app').appendChild(el);
  return el;
}
function removeLayer(el, cb) {
  el.classList.add('layer-exit');
  setTimeout(() => { el.remove(); cb && cb(); }, 380);
}

/* ============================================================
   1. ROLE SELECTION
   ============================================================ */
function showRoleSelect() {
  const el = mountLayer(`
    <div class="role-wrap">
      <img src="slc-logo.png" class="role-logo" alt="SLC" />
      <h2 class="role-title">ยินดีต้อนรับ</h2>
      <p class="role-sub">กรุณาเลือกประเภทผู้ใช้งาน</p>
      <div class="role-cards">
        <button class="role-card" data-role="patient">
          <span class="role-card__icon">${icon('user')}</span>
          <span class="role-card__text">
            <span class="role-card__label">ผู้รับบริการ</span>
            <span class="role-card__hint">ลูกค้าคลินิก</span>
          </span>
          <span class="role-card__arrow">${icon('chevright','ic--sm')}</span>
        </button>
        <button class="role-card" data-role="staff">
          <span class="role-card__icon">${icon('shield')}</span>
          <span class="role-card__text">
            <span class="role-card__label">พนักงาน</span>
            <span class="role-card__hint">เจ้าหน้าที่ / แพทย์</span>
          </span>
          <span class="role-card__arrow">${icon('chevright','ic--sm')}</span>
        </button>
      </div>
    </div>`, 'role-screen');

  el.querySelectorAll('[data-role]').forEach(btn => {
    btn.onclick = () => {
      const role = btn.dataset.role;
      localStorage.setItem(ROLE_KEY, role);
      const pinKey = role === 'patient' ? PIN_KEY_PATIENT : PIN_KEY_STAFF;
      const hasPin = !!localStorage.getItem(pinKey);
      removeLayer(el, () => {
        if (hasPin) {
          // เคย login ไว้แล้ว → ใส่ PIN ได้เลย
          showPIN(startApp, pinKey);
        } else {
          // ครั้งแรก → กรอก credentials ก่อน
          showCredentials(role);
        }
      });
    };
  });
}

/* ============================================================
   2. CREDENTIALS
   ============================================================ */
function showCredentials(role) {
  const isPatient = role === 'patient';
  const el = mountLayer(`
    <div class="cred-wrap">
      <button class="cred-back" id="credBack">${icon('chevleft')} ย้อนกลับ</button>
      <img src="slc-logo.png" class="cred-logo" alt="SLC" />
      <h2 class="cred-title">${isPatient ? 'เข้าสู่ระบบผู้รับบริการ' : 'เข้าสู่ระบบพนักงาน'}</h2>

      ${isPatient ? `
        <div class="cred-field">
          <label>เลข HN (Hospital Number)</label>
          <div class="cred-input-wrap">
            ${icon('card','ic--sm')}
            <input id="credA" type="text" inputmode="numeric" placeholder="เช่น 100245" autocomplete="off" />
          </div>
        </div>
        <div class="cred-field">
          <label>เลขบัตรประชาชน 13 หลัก</label>
          <div class="cred-input-wrap">
            ${icon('shield','ic--sm')}
            <input id="credB" type="text" inputmode="numeric" placeholder="X-XXXX-XXXXX-XX-X" maxlength="17" autocomplete="off" />
          </div>
        </div>` : `
        <div class="cred-field">
          <label>รหัสพนักงาน</label>
          <div class="cred-input-wrap">
            ${icon('card','ic--sm')}
            <input id="credA" type="text" placeholder="เช่น EMP001" autocomplete="username" />
          </div>
        </div>
        <div class="cred-field">
          <label>รหัสผ่าน</label>
          <div class="cred-input-wrap">
            ${icon('shield','ic--sm')}
            <input id="credB" type="password" placeholder="••••••••" autocomplete="current-password" />
          </div>
        </div>`}

      <button class="btn btn--brand" id="credSubmit">ถัดไป</button>
      <p class="cred-note" id="credErr"></p>
    </div>`, 'cred-screen');

  // Format Thai ID
  if (isPatient) {
    el.querySelector('#credB').oninput = function() {
      const d = this.value.replace(/\D/g,'').slice(0,13);
      const p = [d.slice(0,1),d.slice(1,5),d.slice(5,10),d.slice(10,12),d.slice(12,13)];
      this.value = p.filter(Boolean).join('-');
    };
  }

  el.querySelector('#credBack').onclick = () => removeLayer(el, showRoleSelect);

  el.querySelector('#credSubmit').onclick = async () => {
    const a = el.querySelector('#credA').value.trim();
    const b = el.querySelector('#credB').value.trim();
    const err = el.querySelector('#credErr');
    const btn = el.querySelector('#credSubmit');

    if (!a || !b) { err.textContent = 'กรุณากรอกข้อมูลให้ครบ'; return; }
    if (isPatient && b.replace(/\D/g,'').length !== 13) {
      err.textContent = 'เลขบัตรประชาชนต้องมี 13 หลัก'; return;
    }

    btn.disabled = true; btn.textContent = 'กำลังตรวจสอบ...'; err.textContent = '';
    try {
      if (isPatient) {
        await signInPatient(a, b);
        await supaLoad();
      } else {
        await signInStaff(a + '@slc-clinic.internal', b);
        await supaLoad();
      }
      const pk = isPatient ? PIN_KEY_PATIENT : PIN_KEY_STAFF;
      removeLayer(el, () => showPIN(startApp, pk));
    } catch(e) {
      err.textContent = e.message || 'ข้อมูลไม่ถูกต้อง';
      btn.disabled = false; btn.textContent = 'ถัดไป';
    }
  };
}

/* ============================================================
   3. PIN
   ============================================================ */
function showPIN(onSuccess, pinKey) {
  pinKey = pinKey || PIN_KEY_PATIENT;
  const stored = localStorage.getItem(pinKey);
  const isSetup = !stored;
  const el = mountLayer(`
    <div class="pin-top">
      <img src="slc-logo.png" class="pin-logo" alt="SLC" />
      <p class="pin-hint" id="pinHint">${isSetup ? 'ตั้งรหัส PIN 4 หลัก' : 'กรอกรหัส PIN'}</p>
      <div class="pin-dots">
        <div class="pin-dot"></div><div class="pin-dot"></div>
        <div class="pin-dot"></div><div class="pin-dot"></div>
      </div>
    </div>
    <div class="pin-pad">
      ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k =>
        `<button class="pin-key${k===''?' pin-key--empty':''}" data-k="${k}">${k}</button>`
      ).join('')}
    </div>`, 'pin-screen');

  let entry = '', confirm2 = '', step = isSetup ? 'set' : 'enter';

  const dots = () => el.querySelectorAll('.pin-dot');
  const hint = () => el.querySelector('#pinHint');
  const fill = n => dots().forEach((d,i) => d.classList.toggle('pin-dot--filled', i < n));

  function shake(msg) {
    el.querySelector('.pin-dots').classList.add('pin-shake');
    setTimeout(() => el.querySelector('.pin-dots').classList.remove('pin-shake'), 500);
    hint().textContent = msg; entry = ''; fill(0);
  }

  function press(k) {
    if (k === '⌫') { entry = entry.slice(0,-1); fill(entry.length); return; }
    if (entry.length >= 4) return;
    entry += k; fill(entry.length);
    if (entry.length < 4) return;
    setTimeout(() => {
      if (step === 'enter') {
        if (entry === stored) { removeLayer(el, onSuccess); }
        else shake('รหัสไม่ถูกต้อง ลองใหม่');
      } else if (step === 'set') {
        confirm2 = entry; entry = ''; step = 'confirm';
        hint().textContent = 'ยืนยัน PIN อีกครั้ง'; fill(0);
      } else {
        if (entry === confirm2) { localStorage.setItem(pinKey, entry); removeLayer(el, onSuccess); }
        else { confirm2 = ''; step = 'set'; shake('PIN ไม่ตรงกัน ตั้งใหม่'); }
      }
    }, 120);
  }

  el.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { if (b.dataset.k !== '') press(b.dataset.k); }; });
}

/* ---- logout helper ---- */
function doLogout() {
  const role = localStorage.getItem(ROLE_KEY);
  localStorage.removeItem(role === 'staff' ? PIN_KEY_STAFF : PIN_KEY_PATIENT);
  localStorage.removeItem(PIN_KEY); // legacy
  localStorage.removeItem(ROLE_KEY);
  supaSignOut().catch(()=>{});
  showRoleSelect();
}

/* ---------- helpers ---------- */
const fmtBaht = n => '฿' + n.toLocaleString('th-TH');
const remaining = c => c.total - c.used;
const pct = c => Math.round((remaining(c) / c.total) * 100);
const catOf = key => CATEGORY[key];
const courseById = id => COURSES.find(c => c.id === id);

function zellerDow(y, m, d) {
  if (m < 3) { m += 12; y -= 1; }
  const k = y % 100, j = Math.floor(y / 100);
  const h = (d + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) + 5 * j) % 7;
  return (h + 6) % 7;
}
function parseDate(iso) { const [y, m, d] = iso.split('-').map(Number); return { y, m, d, dow: zellerDow(y, m, d) }; }
function fmtApptDate(iso) { const { m, d } = parseDate(iso); return { d: String(d), m: THAI_MONTHS[m - 1] }; }
const THAI_DOW_FULL = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
function fmtFull(iso) { const { y, m, d, dow } = parseDate(iso); return `${THAI_DOW_FULL[dow]} ${d} ${THAI_MONTHS[m - 1]} ${y + 543}`; }

let _toastT;
function toast(msg) {
  $toast.textContent = msg; $toast.classList.add('is-show');
  clearTimeout(_toastT); _toastT = setTimeout(() => $toast.classList.remove('is-show'), 2200);
}

/* ---------- persistence (Supabase + localStorage fallback) ---------- */
let _saving = false; // race-condition guard
const db = {
  _ls() {
    try {
      localStorage.setItem('slc_courses', JSON.stringify(COURSES));
      localStorage.setItem('slc_appointments', JSON.stringify(APPOINTMENTS));
    } catch(e) {}
  },
  saveCourse(c) {
    this._ls();
    supaSaveCourse(c).catch(e => toast('บันทึกไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ'));
  },
  saveAppt(a) {
    this._ls();
    supaSaveAppt(a).catch(e => toast('บันทึกไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ'));
  },
  deleteAppt(id) {
    this._ls();
    supaDeleteAppt(id).catch(e => toast('ลบไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ'));
  },
  async reset() {
    await supaResetData().catch(console.warn);
    localStorage.removeItem('slc_courses');
    localStorage.removeItem('slc_appointments');
    location.reload();
  }
};

function defaultRoomStaff(cat) {
  return {
    laser:  { staff: 'พญ. ปาริชาต',   room: 'Laser 2' },
    botox:  { staff: 'พญ. ปาริชาต',   room: 'Treatment 1' },
    filler: { staff: 'พญ. ปาริชาต',   room: 'Treatment 1' },
    iv:     { staff: 'พยาบาล สุนิสา', room: 'IV Lounge' },
    facial: { staff: 'พยาบาล สุนิสา', room: 'Treatment 2' },
    body:   { staff: 'พยาบาล สุนิสา', room: 'Treatment 2' },
  }[cat] || { staff: 'แพทย์ประจำ', room: 'Treatment 1' };
}

/* ---------- router ---------- */
const State = { tab: 'home', view: 'home', opts: {}, booking: null };

function go(view, opts = {}) { State.view = view; State.opts = opts; render(); $view.scrollTop = 0; }
function setTab(tab) { State.tab = tab; go(tab); }

function render() {
  const fn = VIEWS[State.view] || VIEWS.home;
  $view.innerHTML = fn(State.opts || {});
  renderTabbar();
  bindView();
}

/* ============================================================
   FLOATING NAV + SCAN
   ============================================================ */
function renderTabbar() {
  const tabs = [
    { id: 'home',    icon: 'home' },
    { id: 'courses', icon: 'package' },
    { id: 'appts',   icon: 'calendar' },
  ];
  $tabbar.innerHTML = `
    <div class="navpill">
      ${tabs.map(t => `<div class="tab${State.tab === t.id ? ' is-active' : ''}" data-tab="${t.id}">${icon(t.icon)}</div>`).join('')}
    </div>
    <div class="scanbtn" data-act="scan">${icon('scan')}<span>SCAN</span></div>`;
  $tabbar.querySelectorAll('[data-tab]').forEach(el => el.onclick = () => setTab(el.dataset.tab));
  $tabbar.querySelector('[data-act="scan"]').onclick = () => showQRScanner();
}

function showQRCheckinModal(appt) {
  // Lazy load QRCode.js เฉพาะตอนใช้งานจริง
  if (!window.QRCode) {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
    s.onload = () => showQRCheckinModal(appt);
    document.head.appendChild(s);
    return;
  }
  const screen = document.querySelector('.device__screen');
  if (screen.querySelector('.qr-overlay')) return;
  const c = courseById(appt.courseId);
  const ov = document.createElement('div');
  ov.className = 'qr-overlay';
  ov.innerHTML = `
    <div class="qr-sheet">
      <div class="qr-sheet-header">
        <button class="qr-close-x" id="qr-close">&times;</button>
      </div>
      <p class="qr-caption">แสดงให้เจ้าหน้าที่สแกน</p>
      <canvas id="qr-canvas"></canvas>
      <div class="qr-info">
        <div class="qr-name">${USER.fullName}</div>
        <div class="qr-id">${USER.id}${c ? ' · ' + c.name : ''}</div>
        <div class="qr-tier">${USER.tier}</div>
      </div>
    </div>`;
  screen.appendChild(ov);
  QRCode.toCanvas(document.getElementById('qr-canvas'), `${USER.id}:${appt.id}`, {
    width: 200, margin: 2,
    color: { dark: '#1A3040', light: '#ffffff' },
  });
  const close = () => ov.remove();
  document.getElementById('qr-close').onclick = close;
  ov.onclick = e => { if (e.target === ov) close(); };
}

function showSearchResults(term) {
  let ov = $view.querySelector('.search-overlay');
  if (!term.trim()) { if (ov) ov.remove(); return; }
  const q = term.toLowerCase();
  const results = COURSES.filter(c =>
    c.name.toLowerCase().includes(q) ||
    catOf(c.cat).label.includes(q) ||
    (c.desc || '').toLowerCase().includes(q)
  );
  if (!ov) { ov = document.createElement('div'); ov.className = 'search-overlay'; $view.appendChild(ov); }
  ov.innerHTML = results.length
    ? results.map(c => `<div class="si" data-course="${c.id}">
        <div class="si__name">${c.name}</div>
        <div class="si__meta">${catOf(c.cat).label} · เหลือ ${remaining(c)} ครั้ง</div>
      </div>`).join('')
    : `<div class="si si--empty">ไม่พบผลการค้นหา</div>`;
  ov.querySelectorAll('[data-course]').forEach(el =>
    el.onclick = () => go('courseDetail', { id: el.dataset.course })
  );
}

/* ============================================================
   AUTH SCREEN
   ============================================================ */
function renderAuth() {
  $view.innerHTML = `
  <div class="auth-page">

    <!-- Hero header -->
    <div class="auth-hero">
      <div class="auth-hero__bg"></div>
      <div class="auth-hero__content">
        <img src="slc-logo.png" width="100" height="100" alt="SLC" class="logo-img logo-img--hero" />
        <h1 class="auth-hero__brand">SLC Clinics &amp; Hospital</h1>
        <p class="auth-hero__tag">ระบบจองหัตถการ & ติดตามคอร์สความงาม</p>
      </div>
    </div>

    <!-- Login card -->
    <div class="auth-body">

      <!-- Tab switch -->
      <div class="auth-tabs">
        <button class="auth-tab is-active" data-tab="patient">${icon('user','ic--sm')} ลูกค้า</button>
        <button class="auth-tab" data-tab="staff">${icon('shield','ic--sm')} พนักงาน</button>
      </div>

      <!-- ===== Patient login ===== -->
      <div id="tabPatient">
        <div class="auth-section-title">เข้าสู่ระบบด้วยข้อมูลผู้ป่วย</div>
        <div class="auth-field">
          <label class="auth-label">เลข HN (Hospital Number)</label>
          <div class="auth-input-wrap">
            ${icon('card','ic--sm')}
            <input type="text" id="patientHN" class="auth-input" placeholder="เช่น 100245" inputmode="numeric" autocomplete="off" />
          </div>
        </div>
        <div class="auth-field">
          <label class="auth-label">เลขบัตรประชาชน 13 หลัก</label>
          <div class="auth-input-wrap">
            ${icon('shield','ic--sm')}
            <input type="text" id="patientID" class="auth-input" placeholder="X-XXXX-XXXXX-XX-X"
              maxlength="17" inputmode="numeric" autocomplete="off" />
          </div>
          <span class="auth-hint">ข้อมูลเข้ารหัสและปลอดภัย</span>
        </div>
        <button class="btn btn--brand" id="btnPatientLogin">เข้าสู่ระบบ</button>
        <div class="auth-divider"><span>หรือ</span></div>
        <button class="btn btn--ghost" id="btnDemo">ทดลองใช้งาน (Demo)</button>
        <p class="auth-note">* สำหรับลูกค้าที่เคยใช้บริการ SLC Clinics แล้วเท่านั้น</p>
      </div>

      <!-- ===== Staff login ===== -->
      <div id="tabStaff" style="display:none">
        <div class="auth-section-title">เข้าสู่ระบบสำหรับเจ้าหน้าที่</div>
        <div class="auth-field">
          <label class="auth-label">อีเมล</label>
          <div class="auth-input-wrap">
            ${icon('phone','ic--sm')}
            <input type="email" id="staffEmail" class="auth-input" placeholder="name@slc-group.com" autocomplete="email" />
          </div>
        </div>
        <div class="auth-field">
          <label class="auth-label">รหัสผ่าน</label>
          <div class="auth-input-wrap">
            ${icon('shield','ic--sm')}
            <input type="password" id="staffPass" class="auth-input" placeholder="••••••••" autocomplete="current-password" />
          </div>
        </div>
        <button class="btn btn--brand" id="btnStaffLogin">เข้าสู่ระบบ</button>
      </div>

    </div>

    <!-- Footer -->
    <div class="auth-footer">
      <p>© 2568 SLC Clinics & Hospital · <a href="#" style="color:var(--brand)">นโยบายความเป็นส่วนตัว</a></p>
    </div>
  </div>`;

  // Tab switch
  document.querySelectorAll('.auth-tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.auth-tab').forEach(x => x.classList.remove('is-active'));
    t.classList.add('is-active');
    document.getElementById('tabPatient').style.display = t.dataset.tab === 'patient' ? '' : 'none';
    document.getElementById('tabStaff').style.display   = t.dataset.tab === 'staff'   ? '' : 'none';
  });

  // Format ID card with dashes as you type
  document.getElementById('patientID').oninput = function() {
    const d = this.value.replace(/\D/g,'').slice(0,13);
    const parts = [d.slice(0,1), d.slice(1,5), d.slice(5,10), d.slice(10,12), d.slice(12,13)];
    this.value = parts.filter(Boolean).join('-');
  };

  // Patient login
  document.getElementById('btnPatientLogin').onclick = async () => {
    const hn = document.getElementById('patientHN').value.trim();
    const id = document.getElementById('patientID').value;
    const btn = document.getElementById('btnPatientLogin');
    btn.disabled = true; btn.textContent = 'กำลังตรวจสอบ...';
    try {
      await signInPatient(hn, id);
      await supaLoad();
      setTab('home');
    } catch(e) {
      toast(e.message || 'ข้อมูลไม่ถูกต้อง กรุณาลองใหม่');
    } finally {
      btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ';
    }
  };

  // Staff login
  document.getElementById('btnStaffLogin').onclick = async () => {
    const email = document.getElementById('staffEmail').value.trim();
    const pass  = document.getElementById('staffPass').value;
    const btn   = document.getElementById('btnStaffLogin');
    btn.disabled = true; btn.textContent = 'กำลังตรวจสอบ...';
    try {
      await signInStaff(email, pass);
      await supaLoad();
      const staffMode = await isStaff();
      if (staffMode) { go('staffDashboard'); }
      else { setTab('home'); }
    } catch(e) {
      toast(e.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ';
    }
  };

  // Demo mode
  document.getElementById('btnDemo').onclick = async () => {
    const btn = document.getElementById('btnDemo');
    btn.disabled = true; btn.textContent = 'กำลังโหลด...';
    try {
      await supaInit(); await supaLoad(); setTab('home');
    } catch(e) {
      toast('เกิดข้อผิดพลาด ลองใหม่');
      btn.disabled = false; btn.textContent = 'ทดลองใช้งาน (Demo)';
    }
  };
  renderTabbar();
}

/* ============================================================
   STAFF DASHBOARD + QR SCANNER
   ============================================================ */
function showQRScanner() {
  const screen = document.querySelector('.app-shell') || document.body;
  if (document.getElementById('qr-scanner-overlay')) return;
  const ov = document.createElement('div');
  ov.id = 'qr-scanner-overlay';
  ov.className = 'qr-scanner-overlay';
  ov.innerHTML = `
    <div class="qrs-header">
      <button class="qrs-close" id="qrsClose">&times;</button>
      <p class="qrs-title">สแกน QR เช็คอิน</p>
      <p class="qrs-sub">แสดงกล้องเพื่อสแกน QR ของลูกค้า</p>
    </div>
    <div id="qrs-reader" class="qrs-reader"></div>
    <div id="qrs-result" class="qrs-result"></div>`;
  screen.appendChild(ov);

  document.getElementById('qrsClose').onclick = () => {
    if (window._qrScanner) { window._qrScanner.stop().catch(()=>{}); window._qrScanner = null; }
    ov.remove();
  };

  const loadScanner = () => {
    if (!window.Html5Qrcode) {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      s.onload = startScan;
      document.head.appendChild(s);
    } else { startScan(); }
  };

  const startScan = () => {
    window._qrScanner = new Html5Qrcode('qrs-reader');
    window._qrScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (text) => {
        // QR format: "userId:appointmentId"
        window._qrScanner.stop().catch(()=>{});
        const [uid, apptId] = text.split(':');
        const el = document.getElementById('qrs-result');
        if (!el) return;
        el.innerHTML = `<div class="qrs-loading">กำลังตรวจสอบ...</div>`;
        try {
          const { data, error } = await window._supa
            .from('appointments').select('*, packages(name)')
            .eq('id', apptId).single();
          if (error || !data) throw new Error('ไม่พบนัดหมาย');
          // Mark confirmed
          await window._supa.from('appointments')
            .update({ status: 'confirmed' }).eq('id', apptId);
          el.innerHTML = `
            <div class="qrs-success">
              <div class="qrs-ok">✓</div>
              <div class="qrs-name">${data.packages?.name || 'คอร์ส'}</div>
              <div class="qrs-info">${data.date} เวลา ${data.time} น.</div>
              <div class="qrs-badge">เช็คอินสำเร็จ</div>
            </div>`;
        } catch(e) {
          el.innerHTML = `<div class="qrs-error">ไม่พบนัดหมายนี้</div>`;
        }
        setTimeout(() => { if (ov.parentNode) ov.remove(); }, 3000);
      },
      () => {}
    ).catch(e => {
      document.getElementById('qrs-result').innerHTML =
        `<p style="color:var(--rose);text-align:center;padding:16px">ไม่สามารถเปิดกล้องได้<br><small>${e.message}</small></p>`;
    });
  };

  loadScanner();
}

/* ============================================================
   STAMP GRID  (done = ประทับแล้ว/ใช้ไป, left = ว่าง/เหลือ)
   ============================================================ */
function stamps(c) {
  const cat = catOf(c.cat);
  let html = '';
  for (let i = 0; i < c.total; i++) {
    html += i < c.used
      ? `<div class="stamp stamp--done">${icon(cat.icon)}</div>`
      : `<div class="stamp stamp--left"></div>`;
  }
  return `<div class="stamps">${html}</div>`;
}

/* featured card */
function stampCard(c) {
  const cat = catOf(c.cat);
  const low = remaining(c) <= 1;
  const usedPct = Math.round((c.used / c.total) * 100);
  const ppu = fmtBaht(Math.round(c.price / c.total));
  return `<div class="stampcard" data-course="${c.id}">
    <div class="stampcard__brand">
      <svg class="slc-mark" viewBox="0 0 20 13" aria-hidden="true">
        <path d="M10 9C8 4 2 2 1 6C0 10 5 11 10 9Z" fill="currentColor"/>
        <path d="M10 9C12 4 18 2 19 6C20 10 15 11 10 9Z" fill="currentColor"/>
        <ellipse cx="10" cy="10" rx="1.2" ry="1.8" fill="currentColor"/>
      </svg>
      SLC Clinics &amp; Hospital
    </div>
    <div class="stampcard__cat">${icon(cat.icon,'ic--sm')} ${cat.label}</div>
    <div class="stampcard__title">${c.name}</div>
    <div class="stampcard__desc">${c.desc}</div>
    ${stamps(c)}
    <div class="stampcard__foot">
      <div class="stampcard__count">
        <div class="big">${remaining(c)}<small> / ${c.total}</small></div>
        <div class="lab">${low ? 'เหลือน้อย — ครั้งสุดท้าย' : 'สิทธิ์คงเหลือ'}</div>
      </div>
      <div class="stampcard__exp">หมดอายุ<b>${c.expiry}</b></div>
    </div>
    <div class="stampcard__bar">
      <div class="sbar-track"><div class="sbar-fill" style="width:${usedPct}%"></div></div>
      <div class="sbar-meta">
        <span>ใช้ไปแล้ว ${c.used} จาก ${c.total} ครั้ง</span>
        <span>${ppu} / ครั้ง</span>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   VIEWS
   ============================================================ */
const VIEWS = {

  /* ---------- HOME ---------- */
  home() {
    const active = COURSES.filter(c => remaining(c) > 0);
    return `
    <div class="topbar">
      <div class="searchbar">${icon('search')}<input placeholder="ค้นหาคอร์ส หรือ หัตถการ..." id="search-input" autocomplete="off" /></div>
      <div class="avatar-btn" data-tab2="profile">${icon('user')}</div>
    </div>
    <div class="deck">
      ${active.map(c => `<div class="deck__cell">${stampCard(c)}</div>`).join('')}
    </div>
    <div class="dots">${active.map((_, i) => `<i class="${i === 0 ? 'is-on' : ''}"></i>`).join('')}</div>`;
  },

  /* ---------- COURSES ---------- */
  courses() {
    const active = COURSES.filter(c => remaining(c) > 0);
    const done = COURSES.filter(c => remaining(c) === 0);
    const total = active.reduce((s, c) => s + remaining(c), 0);
    return `
    <div class="pagehead">
      <div><div class="pagehead__title">คอร์สของฉัน</div>
        <div class="pagehead__sub">เหลือทั้งหมด ${total} ครั้ง · ${active.length} คอร์ส</div></div>
      <div style="flex:1"></div>
      <div class="iconbtn" data-tab2="profile">${icon('user')}</div>
    </div>
    <div class="pad"><div class="card card--pad0">
      ${active.map(c => courseRow(c)).join('')}
    </div></div>
    ${done.length ? `<div class="sec"><span class="label">ใช้ครบแล้ว</span></div>
    <div class="pad"><div class="card card--pad0" style="opacity:.6">
      ${done.map(c => courseRow(c)).join('')}
    </div></div>` : ''}
    <div class="spacer"></div>`;
  },

  /* ---------- COURSE DETAIL ---------- */
  courseDetail({ id }) {
    const c = courseById(id);
    const cat = catOf(c.cat);
    const r = remaining(c);
    return `
    <div class="pagehead">
      <div class="iconbtn" data-back="courses">${icon('chevleft')}</div>
      <div><div class="pagehead__title">รายละเอียด</div><div class="pagehead__sub">${c.id}</div></div>
    </div>
    <div class="pad stack">
      <div class="detailcard">
        <div class="detailcard__cat">${icon(cat.icon,'ic--sm')} ${cat.label}</div>
        <div class="detailcard__title">${c.name}</div>
        <div class="detailcard__stamps">${stamps(c)}</div>
        <div class="detailcard__line">
          <div><div class="big">${r}<small> / ${c.total}</small></div><div class="lab">สิทธิ์คงเหลือ</div></div>
          <div style="text-align:right"><div class="lab" style="margin:0 0 3px">หมดอายุ</div><div style="font-weight:600">${c.expiry}</div></div>
        </div>
      </div>

      <div class="card card--pad0">
        <div class="kv"><span class="kv__k">วันที่ซื้อ</span><span class="kv__v">${c.purchasedAt}</span></div>
        <div class="kv"><span class="kv__k">เวลาต่อครั้ง</span><span class="kv__v">${c.perVisit}</span></div>
        <div class="kv"><span class="kv__k">มูลค่าต่อครั้ง</span><span class="kv__v">${fmtBaht(Math.round(c.price / c.total))}</span></div>
      </div>

      <div class="note">${icon('info')}<div><div class="note__t">${c.desc}</div><div class="note__d">${c.note}</div></div></div>
    </div>
    <div class="actionbar">
      ${r > 0
        ? `<button class="btn btn--dark" data-book-course="${c.id}">${icon('calendar')} จองใช้สิทธิ์</button>`
        : `<button class="btn btn--ghost" data-act="renew">${icon('plus')} ต่อคอร์ส</button>`}
    </div>`;
  },

  /* ---------- BOOKING step 1 ---------- */
  book() {
    if (!State.booking) State.booking = { treatment: null, date: null, time: null };
    const b = State.booking;
    return `
    <div class="pagehead">
      <div class="iconbtn" data-back="home">${icon('chevleft')}</div>
      <div><div class="pagehead__title">จองหัตถการ</div><div class="pagehead__sub">เลือกบริการ</div></div>
    </div>
    <div class="steps"><i class="on"></i><i></i><i></i></div>
    <div class="sec"><span class="label">ใช้สิทธิ์จากคอร์ส</span></div>
    <div class="pad stack">${TREATMENTS.filter(t => t.owned).map(t => bookOpt(t, b)).join('')}</div>
    <div class="sec"><span class="label">บริการอื่น ๆ</span></div>
    <div class="pad stack">${TREATMENTS.filter(t => !t.owned).map(t => bookOpt(t, b)).join('')}</div>
    <div class="actionbar">
      <button class="btn btn--dark" data-next="date" ${b.treatment ? '' : 'disabled style="opacity:.4"'}>ถัดไป ${icon('chevright')}</button>
    </div>`;
  },

  /* ---------- BOOKING step 2 ---------- */
  bookDate() {
    const b = State.booking;
    const t = TREATMENTS.find(x => x.id === b.treatment);
    const dates = nextDates(8);
    return `
    <div class="pagehead">
      <div class="iconbtn" data-back="book">${icon('chevleft')}</div>
      <div><div class="pagehead__title">วันและเวลา</div><div class="pagehead__sub">${t.name}</div></div>
    </div>
    <div class="steps"><i class="on"></i><i class="on"></i><i></i></div>
    <div class="sec"><span class="label">เลือกวัน</span></div>
    <div class="datescroll">
      ${dates.map(d => `<div class="dpick${d.off ? ' is-off' : ''}${b.date === d.iso ? ' is-sel' : ''}" data-date="${d.iso}">
        <div class="dow">${THAI_DOW[d.dow]}</div><div class="dnum">${d.d}</div></div>`).join('')}
    </div>
    <div class="sec"><span class="label">เลือกเวลา</span><span class="sec__a" style="cursor:default;color:var(--muted);font-weight:400">${b.date ? fmtFull(b.date) : ''}</span></div>
    <div class="pad">
      ${b.date ? `<div class="slots">
        ${TIME_SLOTS.map(s => {
          const di = String(dates.findIndex(d => d.iso === b.date));
          const off = (BOOKED_SLOTS[di] || []).includes(s);
          return `<div class="slot${off ? ' is-off' : ''}${b.time === s ? ' is-sel' : ''}" data-slot="${s}">${s}</div>`;
        }).join('')}
      </div>` : `<div class="empty">${icon('calendar','ic--lg')}<p>เลือกวันที่ก่อน</p></div>`}
    </div>
    <div class="actionbar">
      <button class="btn btn--dark" data-next="confirm" ${b.date && b.time ? '' : 'disabled style="opacity:.4"'}>ถัดไป ${icon('chevright')}</button>
    </div>`;
  },

  /* ---------- BOOKING step 3 ---------- */
  bookConfirm() {
    const b = State.booking;
    const t = TREATMENTS.find(x => x.id === b.treatment);
    const cat = catOf(t.cat);
    const c = t.owned ? courseById(t.id) : null;
    return `
    <div class="pagehead">
      <div class="iconbtn" data-back="bookDate">${icon('chevleft')}</div>
      <div><div class="pagehead__title">ยืนยัน</div><div class="pagehead__sub">ตรวจสอบรายละเอียด</div></div>
    </div>
    <div class="steps"><i class="on"></i><i class="on"></i><i class="on"></i></div>
    <div class="pad stack">
      <div class="card">
        <div class="row" style="padding:0;border:0">
          <div class="row__ic">${icon(cat.icon)}</div>
          <div class="row__main"><div class="row__t">${t.name}</div>
          <div class="row__s">${cat.label}${c ? ' · ใช้สิทธิ์คอร์ส' : t.free ? ' · ไม่มีค่าใช้จ่าย' : ' · บริการใหม่'}</div></div>
        </div>
      </div>
      <div class="summary">
        <div class="kv"><span class="kv__k">วันที่</span><span class="kv__v">${fmtFull(b.date)}</span></div>
        <div class="kv"><span class="kv__k">เวลา</span><span class="kv__v">${b.time} น.</span></div>
        <div class="kv"><span class="kv__k">สาขา</span><span class="kv__v">${CLINIC.branch}</span></div>
        ${c ? `<div class="kv"><span class="kv__k">สิทธิ์คงเหลือ</span><span class="kv__v">${remaining(c)} → ${remaining(c) - 1} ครั้ง</span></div>` : ''}
        <div class="kv"><span class="kv__k">ค่าใช้จ่ายวันนี้</span><span class="kv__v">${c || t.free ? '฿0' : 'ชำระที่คลินิก'}</span></div>
      </div>
      <div class="note">${icon('info')}<div><div class="note__d">เปลี่ยน/ยกเลิกนัดล่วงหน้าอย่างน้อย 24 ชม.</div></div></div>
    </div>
    <div class="actionbar"><button class="btn btn--dark" data-act="confirm-book">${icon('check')} ยืนยันการจอง</button></div>`;
  },

  /* ---------- SUCCESS ---------- */
  bookDone() {
    const b = State.booking;
    const t = TREATMENTS.find(x => x.id === b.treatment);
    return `
    <div class="success">
      <div class="success__ic">${icon('check')}</div>
      <div class="success__t">จองสำเร็จ</div>
      <div class="success__d">${t.name}<br>${fmtFull(b.date)} · ${b.time} น.</div>
    </div>
    <div class="pad stack">
      <button class="btn btn--dark" data-tab2="appts">${icon('calendar')} ดูนัดหมายของฉัน</button>
      <button class="btn btn--ghost" data-tab2="home">กลับหน้าแรก</button>
    </div>`;
  },

  /* ---------- APPOINTMENTS ---------- */
  appts() {
    return `
    <div class="pagehead">
      <div><div class="pagehead__title">นัดหมาย</div><div class="pagehead__sub">${APPOINTMENTS.length} นัดที่กำลังจะถึง</div></div>
      <div style="flex:1"></div>
      <div class="iconbtn" data-tab2="book">${icon('plus')}</div>
    </div>
    <div class="pad"><div class="seg" id="apptSeg">
      <div class="seg__b is-active" data-seg="up">กำลังจะถึง</div>
      <div class="seg__b" data-seg="past">ผ่านมาแล้ว</div>
    </div></div>
    <div class="pad stack" id="apptList" style="margin-top:14px">${APPOINTMENTS.map(apptCard).join('')}</div>
    <div class="spacer"></div>`;
  },

  /* ---------- HISTORY ---------- */
  history() {
    return `
    <div class="pagehead">
      <div class="iconbtn" data-back="profile">${icon('chevleft')}</div>
      <div><div class="pagehead__title">ประวัติ</div><div class="pagehead__sub">การใช้บริการและธุรกรรม</div></div>
    </div>
    <div class="pad"><div class="card"><div class="tl">
      ${HISTORY.map(h => `<div class="tl__item${h.type === 'buy' ? ' tl__item--buy' : ''}">
        <div class="tl__date">${h.date}</div>
        <div class="tl__title">${h.title}</div>
        <div class="tl__desc">${h.detail}</div></div>`).join('')}
    </div></div></div>
    <div class="spacer"></div>`;
  },

  /* ---------- PROFILE ---------- */
  profile() {
    const visits = HISTORY.filter(h => h.type === 'visit').length;
    const left = COURSES.reduce((s, c) => s + remaining(c), 0);
    return `
    <div class="pagehead">
      <div class="iconbtn" data-back="home">${icon('chevleft')}</div>
      <div><div class="pagehead__title">โปรไฟล์</div></div>
    </div>
    <div class="pad stack">
      <div class="profhead">
        <div class="ava">${USER.initials}</div>
        <div class="profhead__name">${USER.fullName}</div>
        <div class="profhead__sub">${USER.id} · สมาชิกตั้งแต่ปี ${USER.memberSince}</div>
        <div style="margin-top:10px"><span class="tag tag--ink">${icon('star','ic--sm')} ${USER.tier}</span></div>
      </div>
      <div class="card"><div class="statline">
        <div><div class="n">${COURSES.length}</div><div class="l">คอร์ส</div></div>
        <div><div class="n">${visits}</div><div class="l">เข้ารับบริการ</div></div>
        <div><div class="n">${left}</div><div class="l">สิทธิ์คงเหลือ</div></div>
      </div></div>
      <div class="card card--pad0">
        ${[
          { i: 'package', t: 'คอร์สของฉัน', act: 'courses' },
          { i: 'history', t: 'ประวัติการใช้บริการ', act: 'history' },
          { i: 'card', t: 'ใบเสร็จและการชำระเงิน', act: 'soon' },
          { i: 'phone', t: 'ติดต่อคลินิก', act: 'soon' },
        ].map(m => `<div class="menu__item" data-menu="${m.act}">
          ${icon(m.i)}<div class="menu__item__t">${m.t}</div><span class="ic menu__item__chev">${icon('chevright','ic--sm')}</span></div>`).join('')}
      </div>
      <button class="btn btn--ghost" data-act="logout" style="color:var(--rose)">${icon('logout')} ออกจากระบบ</button>
      <div class="center muted" style="font-size:11.5px">${CLINIC.name} · v1.0.0</div>
    </div>`;
  },
};

/* ---------- fragments ---------- */
function courseRow(c) {
  const r = remaining(c);
  const low = r <= 1;
  const cat = catOf(c.cat);
  return `<div class="row" data-course="${c.id}">
    <div class="row__ic">${icon(cat.icon)}</div>
    <div class="row__main">
      <div class="row__t">${c.name}</div>
      <div class="row__s">${cat.label} · ใช้ไป ${c.used} ครั้ง</div>
      <div class="mini${low ? ' mini--low' : ''}"><i style="width:${pct(c)}%"></i></div>
    </div>
    <div class="row__n"><div class="v">${r}<small>/${c.total}</small></div><div class="l">เหลือ</div></div>
  </div>`;
}

function bookOpt(t, b) {
  const cat = catOf(t.cat);
  const c = t.owned ? courseById(t.id) : null;
  let s, tag;
  if (c) { s = `${cat.label} · เหลือ ${remaining(c)} ครั้ง`; tag = `<span class="tag tag--ok">มีสิทธิ์</span>`; }
  else if (t.free) { s = `${cat.label} · ไม่มีค่าใช้จ่าย`; tag = `<span class="tag tag--ink">ฟรี</span>`; }
  else { s = `${cat.label} · ปรึกษาราคา`; tag = `<span class="tag tag--mute">ใหม่</span>`; }
  const dis = c && remaining(c) === 0;
  return `<div class="opt${b.treatment === t.id ? ' is-sel' : ''}" data-opt="${t.id}" ${dis ? 'style="opacity:.4;pointer-events:none"' : ''}>
    <div class="opt__ic">${icon(cat.icon)}</div>
    <div class="opt__main"><div class="opt__t">${t.name}</div><div class="opt__s">${s}</div></div>
    ${tag}
    <div class="opt__rad">${icon('check')}</div>
  </div>`;
}

function apptCard(a) {
  const c = courseById(a.courseId);
  if (!c) return ''; // Bug #7: guard deleted course
  const fd = fmtApptDate(a.date);
  const tag = a.status === 'confirmed'
    ? `<span class="tag tag--ok">${icon('check','ic--sm')} ยืนยันแล้ว</span>`
    : `<span class="tag tag--mute">${icon('clock','ic--sm')} รอยืนยัน</span>`;
  return `<div class="card">
    <div class="row" style="padding:0;border:0">
      <div class="row__ic" style="background:var(--ink);color:#fff;flex-direction:column;gap:0">
        <div style="font-family:var(--font-dp);font-weight:600;font-size:18px;line-height:1">${fd.d}</div>
        <div style="font-size:9px;letter-spacing:.05em">${fd.m}</div>
      </div>
      <div class="row__main">
        <div class="row__t">${c.name}</div>
        <div class="row__s">${a.time} น. · ${a.staff} · ${a.room}</div>
      </div>
      ${tag}
    </div>
    <div style="display:flex;gap:9px;margin-top:14px">
      <button class="btn btn--cream btn--sm" style="flex:1" data-appt-qr="${a.id}">${icon('qr','ic--sm')} QR เช็คอิน</button>
      <button class="btn btn--ghost btn--sm" style="flex:1" data-appt-cancel="${a.id}">ยกเลิก</button>
    </div>
  </div>`;
}

/* ---------- date generator ---------- */
const TODAY = { y: 2026, m: 5, d: 30 };
function nextDates(n) {
  const out = []; let { y, m, d } = TODAY;
  const isLeap = y%400===0 || (y%4===0 && y%100!==0);
  const dim = mm => [31,28,31,30,31,30,31,31,30,31,30,31][mm-1] + (mm===2 && isLeap ? 1 : 0);
  for (let i = 0; i < n; i++) {
    d++; if (d > dim(m)) { d = 1; m++; if (m > 12) { m = 1; y++; } }
    const dow = zellerDow(y, m, d);
    out.push({ iso: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, d, dow, off: dow === 0 });
  }
  return out;
}

/* ============================================================
   EVENTS
   ============================================================ */
function bindView() {
  const q = sel => $view.querySelectorAll(sel);

  q('[data-tab2]').forEach(el => el.onclick = () => setTab(el.dataset.tab2));
  q('[data-back]').forEach(el => el.onclick = () => go(el.dataset.back));
  q('[data-course]').forEach(el => el.onclick = () => go('courseDetail', { id: el.dataset.course }));

  q('[data-book-course]').forEach(el => el.onclick = () => {
    State.booking = { treatment: el.dataset.bookCourse, date: null, time: null };
    go('bookDate');
  });

  q('[data-opt]').forEach(el => el.onclick = () => { State.booking.treatment = el.dataset.opt; State.booking.date = null; State.booking.time = null; render(); });
  q('[data-date]').forEach(el => el.onclick = () => { State.booking.date = el.dataset.date; State.booking.time = null; render(); });
  q('[data-slot]').forEach(el => el.onclick = () => { State.booking.time = el.dataset.slot; render(); });
  q('[data-next]').forEach(el => el.onclick = () => { go(el.dataset.next === 'date' ? 'bookDate' : 'bookConfirm'); });

  /* deck pager dots */
  const deck = $view.querySelector('.deck');
  const dots = $view.querySelector('.dots');
  if (deck && dots) {
    deck.addEventListener('scroll', () => {
      const i = Math.round(deck.scrollLeft / deck.clientWidth);
      dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('is-on', k === i));
    });
  }

  /* appt segment */
  const seg = $view.querySelector('#apptSeg');
  if (seg) seg.querySelectorAll('[data-seg]').forEach(b => b.onclick = () => {
    seg.querySelectorAll('.seg__b').forEach(x => x.classList.remove('is-active'));
    b.classList.add('is-active');
    const list = $view.querySelector('#apptList');
    if (b.dataset.seg === 'past') {
      list.innerHTML = `<div class="empty">${icon('history','ic--lg')}<p>ดูประวัติทั้งหมดได้ที่เมนูโปรไฟล์</p>
        <button class="btn btn--ghost btn--sm" style="margin:14px auto 0" data-go-history>เปิดประวัติ</button></div>`;
      list.querySelector('[data-go-history]').onclick = () => go('history');
    } else {
      list.innerHTML = APPOINTMENTS.map(apptCard).join('');
      // bind only appt-specific handlers (avoid full bindView re-register)
      list.querySelectorAll('[data-appt-qr]').forEach(el => el.onclick = () => {
        const appt = APPOINTMENTS.find(a => a.id === el.dataset.apptQr);
        if (appt) showQRCheckinModal(appt);
      });
      list.querySelectorAll('[data-appt-cancel]').forEach(el => el.onclick = () => {
        const idx = APPOINTMENTS.findIndex(a => a.id === el.dataset.apptCancel);
        if (idx === -1) return;
        const appt = APPOINTMENTS[idx];
        const c = courseById(appt.courseId);
        if (c && c.used > 0) c.used -= 1;
        if (c) { const t = TREATMENTS.find(x => x.id === c.id); if (t) t.owned = remaining(c) > 0; }
        APPOINTMENTS.splice(idx, 1);
        db.deleteAppt(appt.id);
        if (c) db.saveCourse(c);
        toast('ยกเลิกนัดสำเร็จ');
        go('appts');
      });
    }
  });

  q('[data-appt-qr]').forEach(el => el.onclick = () => {
    const appt = APPOINTMENTS.find(a => a.id === el.dataset.apptQr);
    if (appt) showQRCheckinModal(appt);
  });
  q('[data-appt-cancel]').forEach(el => el.onclick = () => {
    const idx = APPOINTMENTS.findIndex(a => a.id === el.dataset.apptCancel);
    if (idx === -1) return;
    const appt = APPOINTMENTS[idx];
    const c = courseById(appt.courseId);
    if (c && c.used > 0) c.used -= 1;
    if (c) { const t = TREATMENTS.find(x => x.id === c.id); if (t) t.owned = remaining(c) > 0; } // Bug #3 fix
    APPOINTMENTS.splice(idx, 1);
    db.deleteAppt(appt.id);
    if (c) db.saveCourse(c);
    toast('ยกเลิกนัดสำเร็จ');
    go('appts');
  });

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() { showSearchResults(this.value); });
    searchInput.addEventListener('blur', function() {
      setTimeout(() => { const ov = $view.querySelector('.search-overlay'); if (ov) ov.remove(); }, 200);
    });
  }

  q('[data-menu]').forEach(el => el.onclick = () => {
    const a = el.dataset.menu;
    if (a === 'courses') setTab('courses');
    else if (a === 'history') go('history');
    else toast('ฟีเจอร์นี้อยู่ระหว่างพัฒนา');
  });

  q('[data-act]').forEach(el => el.onclick = async () => {
    const a = el.dataset.act;
    if (a === 'confirm-book') {
      if (_saving) return; // prevent double-submit
      _saving = true;
      setTimeout(() => { _saving = false; }, 3000);
      const t = TREATMENTS.find(x => x.id === State.booking.treatment);
      const c = t?.owned ? courseById(State.booking.treatment) : null;
      if (c && remaining(c) <= 0) { toast('ไม่มีสิทธิ์เหลือ'); _saving = false; return; }
      if (c) c.used += 1;
      // Sync TREATMENTS after deduct
      if (t) t.owned = c ? remaining(c) > 0 : false;
      const rs = t?.cat ? defaultRoomStaff(t.cat) : defaultRoomStaff('facial');
      const newAppt = {
        id: 'AP-' + Date.now(),
        courseId: State.booking.treatment,
        date: State.booking.date,
        time: State.booking.time,
        staff: rs.staff, room: rs.room, status: 'pending',
      };
      APPOINTMENTS.unshift(newAppt);
      if (c) db.saveCourse(c);
      db.saveAppt(newAppt);
      _saving = false;
      go('bookDone');
    }
    else if (a === 'renew') toast('ติดต่อเจ้าหน้าที่เพื่อต่อคอร์ส');
    else if (a === 'logout') { doLogout(); }
  });
}

/* ---------- PWA service worker — unregister เวอร์ชันเก่าออกก่อน ---------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
}

/* ---------- boot ---------- */
function lsLoad() {
  try {
    const c = localStorage.getItem('slc_courses');
    const a = localStorage.getItem('slc_appointments');
    if (c) COURSES.splice(0, COURSES.length, ...JSON.parse(c));
    if (a) APPOINTMENTS.splice(0, APPOINTMENTS.length, ...JSON.parse(a));
    return !!(c || a);
  } catch(_) { return false; }
}

function lsSave() {
  try {
    localStorage.setItem('slc_courses', JSON.stringify(COURSES));
    localStorage.setItem('slc_appointments', JSON.stringify(APPOINTMENTS));
  } catch(_) {}
}

/* รอให้ Supabase พร้อม (โหลด async ทีหลัง) */
function waitSupa(maxMs) {
  return new Promise(resolve => {
    if (window._supaReady) { resolve(true); return; }
    const start = Date.now();
    const t = setInterval(() => {
      if (window._supaReady) { clearInterval(t); resolve(true); }
      else if (Date.now() - start > maxMs) { clearInterval(t); resolve(false); }
    }, 200);
  });
}

/* background sync — ไม่ block UI เลย */
async function bgSync() {
  const ready = await waitSupa(10000); // รอ Supabase สูงสุด 10 วิ
  if (!ready) return;
  try {
    const has = await supaCheckSession();
    if (!has) return;
    await supaLoad();
    lsSave();
    render();
  } catch(e) { console.warn('bgSync:', e.message); }
}

function boot() {
  const appEl = document.getElementById('app');
  if (appEl) appEl.style.display = '';
  try { document.getElementById('loading').remove(); } catch(_) {}
  // แสดง Role Selection ทุกครั้งก่อนเสมอ
  showSplash(() => showRoleSelect());
}

function startApp() {

  // โหลดข้อมูล (localStorage หรือ default จาก data.js)
  lsLoad();

  // เปิดแอป
  try { setTab('home'); } catch(e) { console.error('render error:', e); }

  // Supabase sync ใน background — ไม่กระทบการแสดงผล
  bgSync();
}
boot();
