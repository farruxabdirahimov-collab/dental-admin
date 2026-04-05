/**
 * DentAdmin — Data Layer
 * API-backed + in-memory cache
 *
 * STRATEGIYA:
 *  1. Login → DB.loadAll(clinicId) → barcha ma'lumot xotiraga yuklanadi
 *  2. O'qishlar — xotiradan (sinxron, tez)
 *  3. Yozishlar — xotirani yangilab, background da API ga yuboradi
 *  4. Hisobotlar — alohida async (sanaga qarab lazy load)
 */

const DB = {
  // ── In-memory cache ───────────────────────────────────────────────────────
  _c: {
    clinics:      [],
    users:        [],
    doctors:      {},   // { clinicId: [...] }
    nurses:       {},   // { clinicId: [...] }
    settings:     {},   // { clinicId: {...} }
    paymentTypes: {},   // { clinicId: [...] }
    expenseCats:  {},   // { clinicId: [...] }
    customFields: {},   // { clinicId: [...] }
  },
  _reportCache: new Map(),  // key: `cid_date`, value: report
  _currentClinicId: null,

  generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // ── LOGIN da chaqiriladi — barcha ma'lumotni yuklaydi ────────────────────
  async loadAll(clinicId) {
    this._currentClinicId = clinicId;
    if (!clinicId) return; // super_admin

    const today = Utils ? Utils.getTodayStr() : new Date().toISOString().split('T')[0];

    const [doctors, nurses, settings, users, pts, cats, cfs, todayReport] =
      await Promise.all([
        API.get(`/clinics/${clinicId}/doctors`),
        API.get(`/clinics/${clinicId}/nurses`),
        API.get(`/clinics/${clinicId}/settings`),
        API.get(`/clinics/${clinicId}/users`),
        API.get(`/clinics/${clinicId}/config/payment_types`),
        API.get(`/clinics/${clinicId}/config/expense_cats`),
        API.get(`/clinics/${clinicId}/config/custom_fields`),
        API.get(`/clinics/${clinicId}/reports/daily?date=${today}`).catch(() => null),
      ]);

    this._c.doctors[clinicId]      = doctors      || [];
    this._c.nurses[clinicId]       = nurses       || [];
    this._c.settings[clinicId]     = settings     || {};
    this._c.users                  = users        || [];
    this._c.paymentTypes[clinicId] = pts          || [];
    this._c.expenseCats[clinicId]  = cats         || [];
    this._c.customFields[clinicId] = cfs          || [];

    if (todayReport) {
      this._reportCache.set(`${clinicId}_${today}`, todayReport);
    }

    // Super admin: klinikalar ro'yxatini yuklash
    try {
      const user = Auth.getSession();
      if (user && user.role === 'super_admin') {
        this._c.clinics = await API.get('/clinics');
      }
    } catch {}
  },

  // ── KLINIKALAR ────────────────────────────────────────────────────────────
  getClinics() { return this._c.clinics; },
  getClinicById(id) { return this._c.clinics.find(c => c.id === id); },
  saveClinic(clinic) {
    const idx = this._c.clinics.findIndex(c => c.id === clinic.id);
    if (idx >= 0) this._c.clinics[idx] = clinic;
    else this._c.clinics.push(clinic);
    API.put(`/clinics/${clinic.id}`, clinic).catch(console.error);
    return clinic;
  },
  deleteClinic(id) {
    this._c.clinics = this._c.clinics.filter(c => c.id !== id);
  },

  // ── FOYDALANUVCHILAR ──────────────────────────────────────────────────────
  getUsers() { return this._c.users; },
  findUserByLogin(username, clinicId) {
    return this._c.users.find(u =>
      u.username === username &&
      (u.role === 'super_admin' || u.clinicId === clinicId || u.clinic_id === clinicId)
    );
  },
  saveUser(user) {
    const cid = this._currentClinicId;
    const idx = this._c.users.findIndex(u => u.id === user.id);
    const isNew = idx < 0;
    if (isNew) this._c.users.push(user);
    else this._c.users[idx] = user;
    if (isNew) API.post(`/clinics/${cid}/users`, user).catch(console.error);
    else API.put(`/clinics/${cid}/users/${user.id}`, user).catch(console.error);
    return user;
  },
  deleteUser(id) {
    const cid = this._currentClinicId;
    this._c.users = this._c.users.filter(u => u.id !== id);
    API.del(`/clinics/${cid}/users/${id}`).catch(console.error);
  },

  // ── SOZLAMALAR ────────────────────────────────────────────────────────────
  getSettings(clinicId) { return this._c.settings[clinicId] || {}; },
  updateSetting(clinicId, key, value) {
    if (!this._c.settings[clinicId]) this._c.settings[clinicId] = {};
    this._c.settings[clinicId][key] = value;
    API.put(`/clinics/${clinicId}/settings`, { [key]: value }).catch(console.error);
  },
  updateSettings(clinicId, updates) {
    if (!this._c.settings[clinicId]) this._c.settings[clinicId] = {};
    Object.assign(this._c.settings[clinicId], updates);
    API.put(`/clinics/${clinicId}/settings`, updates).catch(console.error);
  },

  // ── VRACHLAR ─────────────────────────────────────────────────────────────
  getDoctors(clinicId) { return (this._c.doctors[clinicId] || []).filter(d => !d.deleted); },
  saveDoctor(clinicId, doctor) {
    if (!this._c.doctors[clinicId]) this._c.doctors[clinicId] = [];
    const idx = this._c.doctors[clinicId].findIndex(d => d.id === doctor.id);
    const isNew = idx < 0;
    if (isNew) this._c.doctors[clinicId].push(doctor);
    else this._c.doctors[clinicId][idx] = doctor;
    if (isNew) API.post(`/clinics/${clinicId}/doctors`, doctor).catch(console.error);
    else API.put(`/clinics/${clinicId}/doctors/${doctor.id}`, doctor).catch(console.error);
    return doctor;
  },
  deleteDoctor(clinicId, id) {
    if (!this._c.doctors[clinicId]) return;
    const idx = this._c.doctors[clinicId].findIndex(d => d.id === id);
    if (idx >= 0) this._c.doctors[clinicId][idx].deleted = true;
    API.del(`/clinics/${clinicId}/doctors/${id}`).catch(console.error);
  },

  // ── HAMSHIRALAR ───────────────────────────────────────────────────────────
  getNurses(clinicId) { return (this._c.nurses[clinicId] || []).filter(n => !n.deleted); },
  saveNurse(clinicId, nurse) {
    if (!this._c.nurses[clinicId]) this._c.nurses[clinicId] = [];
    const idx = this._c.nurses[clinicId].findIndex(n => n.id === nurse.id);
    const isNew = idx < 0;
    if (isNew) this._c.nurses[clinicId].push(nurse);
    else this._c.nurses[clinicId][idx] = nurse;
    if (isNew) API.post(`/clinics/${clinicId}/nurses`, nurse).catch(console.error);
    else API.put(`/clinics/${clinicId}/nurses/${nurse.id}`, nurse).catch(console.error);
    return nurse;
  },
  deleteNurse(clinicId, id) {
    if (!this._c.nurses[clinicId]) return;
    const idx = this._c.nurses[clinicId].findIndex(n => n.id === id);
    if (idx >= 0) this._c.nurses[clinicId][idx].deleted = true;
    API.del(`/clinics/${clinicId}/nurses/${id}`).catch(console.error);
  },

  // ── TO'LOV TURLARI ────────────────────────────────────────────────────────
  getPaymentTypes(clinicId) {
    return this._c.paymentTypes[clinicId] || [
      { id: 'naqd',          name: 'Naqd pul',      icon: '💵', active: true, builtin: true },
      { id: 'terminal',      name: 'Terminal',       icon: '💳', active: true, builtin: true },
      { id: 'qr',            name: 'QR-kod',         icon: '📱', active: true, builtin: true },
      { id: 'inkassa',       name: 'Inkassa',        icon: '🏦', active: true, builtin: true },
      { id: 'prechesleniya', name: 'Prechesleniya',  icon: '🔄', active: true, builtin: true },
      { id: 'p2p',           name: 'P2P / Payme',    icon: '📲', active: true, builtin: false },
    ];
  },
  savePaymentTypes(clinicId, types) {
    this._c.paymentTypes[clinicId] = types;
    API.put(`/clinics/${clinicId}/config/payment_types`, types).catch(console.error);
  },

  // ── XARAJAT KATEGORIYALARI ────────────────────────────────────────────────
  getExpenseCategories(clinicId) {
    return this._c.expenseCats[clinicId] || [
      { id: 'arenda',   name: 'Arenda',         active: true },
      { id: 'kommunal', name: 'Kommunal',        active: true },
      { id: 'texnik',   name: 'Texnik',          active: true },
      { id: 'maosh',    name: 'Xodim maoshi',    active: true },
      { id: 'boshqa',   name: 'Boshqa',          active: true },
    ];
  },
  saveExpenseCategories(clinicId, cats) {
    this._c.expenseCats[clinicId] = cats;
    API.put(`/clinics/${clinicId}/config/expense_cats`, cats).catch(console.error);
  },

  // ── QO'SHIMCHA MAYDONLAR ──────────────────────────────────────────────────
  getCustomFields(clinicId) { return this._c.customFields[clinicId] || []; },
  saveCustomFields(clinicId, fields) {
    this._c.customFields[clinicId] = fields;
    API.put(`/clinics/${clinicId}/config/custom_fields`, fields).catch(console.error);
  },

  // ── KUNLIK HISOBOT (async — lazy load per date) ───────────────────────────
  async getDailyReport(clinicId, date) {
    const key = `${clinicId}_${date}`;
    if (this._reportCache.has(key)) return this._reportCache.get(key);
    try {
      const report = await API.get(`/clinics/${clinicId}/reports/daily?date=${date}`);
      if (report) this._reportCache.set(key, report);
      return report || null;
    } catch { return null; }
  },

  async saveDailyReport(clinicId, report) {
    this._reportCache.set(`${clinicId}_${report.date}`, report);
    await API.put(`/clinics/${clinicId}/reports/daily`, report);
    return report;
  },

  deleteDailyReport(clinicId, date) {
    this._reportCache.delete(`${clinicId}_${date}`);
    API.del(`/clinics/${clinicId}/reports/daily?date=${date}`).catch(console.error);
  },

  // ── OYLIK / YILLIK (async) ────────────────────────────────────────────────
  async getMonthlyReports(clinicId, year, month) {
    try {
      return await API.get(`/clinics/${clinicId}/reports/monthly?year=${year}&month=${month}`);
    } catch { return []; }
  },

  async getYearlyReports(clinicId, year) {
    try {
      return await API.get(`/clinics/${clinicId}/reports/yearly?year=${year}`);
    } catch { return []; }
  },

  async getDailyReports(clinicId, limit = 90) {
    try {
      return await API.get(`/clinics/${clinicId}/reports?limit=${limit}`);
    } catch { return []; }
  },
};
