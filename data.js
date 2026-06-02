/* ============================================================
   Mock data — Méthode Clinic
   ทุก field ออกแบบให้ map กับ DB จริงได้ (id, ความสัมพันธ์ course<->session)
   ============================================================ */

const CLINIC = {
  name: 'SLC Clinics & Hospital',
  branch: 'สาขาทองหล่อ ซอย 13',
};

const USER = {
  id: 'CU-100245',
  name: 'ฐิติพงษ์',
  fullName: 'ฐิติพงษ์ จันทรเสน',
  initials: 'ฐ',
  tier: 'GOLD MEMBER',
  phone: '08x-xxx-4512',
  memberSince: '2566',
};

/* สี/ไอคอนต่อหมวดหัตถการ — ใช้ซ้ำทั้งแอป */
const CATEGORY = {
  laser:   { label: 'เลเซอร์',      icon: 'spark',   color: '#1A3D50', soft: '#CCE8F4' },
  filler:  { label: 'ฟิลเลอร์',     icon: 'droplet', color: '#1A9BAC', soft: '#CCE8F4' },
  botox:   { label: 'โบทูลินั่ม',   icon: 'syringe', color: '#1A3D50', soft: '#CCE8F4' },
  facial:  { label: 'ทรีตเมนต์ผิว', icon: 'face',    color: '#1A9BAC', soft: '#CCE8F4' },
  body:    { label: 'รูปร่าง',      icon: 'wave',    color: '#1A3D50', soft: '#CCE8F4' },
  iv:      { label: 'วิตามิน IV',   icon: 'flask',   color: '#1A9BAC', soft: '#CCE8F4' },
};

/* คอร์ส/แพ็กเกจที่ลูกค้าซื้อไว้
   used = ใช้ไปแล้ว, total = สิทธิ์ทั้งหมด, remaining คำนวณจาก total-used */
const COURSES = [
  {
    id: 'PKG-2041', cat: 'laser',
    name: 'Pico Laser หน้าใส',
    desc: 'ลดรอยดำ รูขุมขน กระชับผิว',
    total: 10, used: 6,
    purchasedAt: '12 ม.ค. 2567', expiry: '12 ม.ค. 2568',
    price: 39000, perVisit: '~45 นาที',
    note: 'เว้นระยะอย่างน้อย 3 สัปดาห์ต่อครั้ง',
  },
  {
    id: 'PKG-2068', cat: 'facial',
    name: 'Hydra Facial Signature',
    desc: 'ทำความสะอาดล้ำลึก เติมความชุ่มชื้น',
    total: 8, used: 7,
    purchasedAt: '03 พ.ย. 2566', expiry: '30 มิ.ย. 2568',
    price: 22400, perVisit: '~60 นาที',
    note: 'เหมาะทำก่อนงานสำคัญ 1-2 วัน',
  },
  {
    id: 'PKG-2090', cat: 'botox',
    name: 'Botox ลดริ้วรอย (50 ยูนิต)',
    desc: 'หน้าผาก หางตา ร่องคิ้ว',
    total: 3, used: 0,
    purchasedAt: '20 พ.ค. 2567', expiry: '20 พ.ค. 2568',
    price: 28500, perVisit: '~30 นาที',
    note: 'ผลลัพธ์เต็มที่ใน 7-14 วัน',
  },
  {
    id: 'PKG-2103', cat: 'iv',
    name: 'IV Drip Glutathione',
    desc: 'ผิวกระจ่างใส ฟื้นฟูจากภายใน',
    total: 12, used: 9,
    purchasedAt: '08 ก.พ. 2567', expiry: '08 ก.พ. 2568',
    price: 36000, perVisit: '~40 นาที',
    note: 'แนะนำสัปดาห์ละ 1 ครั้ง',
  },
  {
    id: 'PKG-2117', cat: 'body',
    name: 'Body Slimming RF',
    desc: 'กระชับสัดส่วน ลดเซลลูไลท์',
    total: 6, used: 6,
    purchasedAt: '15 ส.ค. 2566', expiry: '15 ส.ค. 2567',
    price: 30000, perVisit: '~50 นาที',
    note: 'คอร์สนี้ใช้ครบแล้ว',
  },
];

/* นัดหมายที่จองไว้ (ผูกกับ courseId) */
const APPOINTMENTS = [
  { id: 'AP-5521', courseId: 'PKG-2041', date: '2026-06-02', time: '14:30', staff: 'พญ. ปาริชาต', room: 'Laser 2', status: 'confirmed' },
  { id: 'AP-5530', courseId: 'PKG-2103', date: '2026-06-05', time: '11:00', staff: 'พยาบาล สุนิสา', room: 'IV Lounge', status: 'confirmed' },
  { id: 'AP-5544', courseId: 'PKG-2090', date: '2026-06-11', time: '16:00', staff: 'พญ. ปาริชาต', room: 'Treatment 1', status: 'pending' },
];

/* ประวัติการใช้สิทธิ์ + ธุรกรรม */
const HISTORY = [
  { type: 'visit', courseId: 'PKG-2041', title: 'Pico Laser หน้าใส', detail: 'ครั้งที่ 6 — พญ. ปาริชาต', date: '14 พ.ค. 2569' },
  { type: 'visit', courseId: 'PKG-2103', title: 'IV Drip Glutathione', detail: 'ครั้งที่ 9 — พยาบาล สุนิสา', date: '10 พ.ค. 2569' },
  { type: 'buy',   courseId: 'PKG-2090', title: 'ซื้อคอร์ส Botox 50 ยูนิต', detail: '3 ครั้ง — ฿28,500', date: '20 พ.ค. 2567', gold: true },
  { type: 'visit', courseId: 'PKG-2068', title: 'Hydra Facial Signature', detail: 'ครั้งที่ 7 — ผิวแพ้ง่าย ใช้สูตรอ่อนโยน', date: '28 เม.ย. 2569' },
  { type: 'visit', courseId: 'PKG-2041', title: 'Pico Laser หน้าใส', detail: 'ครั้งที่ 5 — พญ. ปาริชาต', date: '02 เม.ย. 2569' },
  { type: 'buy',   courseId: 'PKG-2041', title: 'ซื้อคอร์ส Pico Laser', detail: '10 ครั้ง — ฿39,000', date: '12 ม.ค. 2567', gold: true },
];

/* เมนูหัตถการสำหรับจอง (รวมที่มีคอร์ส + ซื้อใหม่) */
const TREATMENTS = [
  { id: 'PKG-2041', name: 'Pico Laser หน้าใส',        cat: 'laser',  owned: true },
  { id: 'PKG-2090', name: 'Botox ลดริ้วรอย',           cat: 'botox',  owned: true },
  { id: 'PKG-2103', name: 'IV Drip Glutathione',       cat: 'iv',     owned: true },
  { id: 'PKG-2068', name: 'Hydra Facial Signature',    cat: 'facial', owned: true },
  { id: 'NEW-01',   name: 'ปรึกษาแพทย์ (ครั้งแรก)',     cat: 'facial', owned: false, free: true },
  { id: 'NEW-02',   name: 'Filler ปรับรูปหน้า',         cat: 'filler', owned: false },
];

const TIME_SLOTS = ['10:00', '10:30', '11:00', '13:30', '14:30', '15:30', '16:30', '17:30'];
/* slot ที่เต็มต่อวัน (mock) */
const BOOKED_SLOTS = { '0': ['11:00','14:30'], '1': ['10:00'], '2': ['15:30','16:30'], '3': [] };

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const THAI_DOW = ['อา','จ','อ','พ','พฤ','ศ','ส'];
