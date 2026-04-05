/**
 * DentAdmin — LocalStorage Database Layer
 * Keyinchalik REST API ga o'tish uchun tayyor arxitektura
 */

const DB = {
  // ========== KLINIKALAR ==========
  getClinics() {
    return JSON.parse(localStorage.getItem('da_clinics') || '[]');
  },
  saveClinic(clinic) {
    const clinics = this.getClinics();
    const idx = clinics.findIndex(c => c.id === clinic.id);
    if (idx >= 0) clinics[idx] = clinic;
    else clinics.push(clinic);
    localStorage.setItem('da_clinics', JSON.stringify(clinics));
    return clinic;
  },
  deleteClinic(id) {
    const clinics = this.getClinics().filter(c => c.id !== id);
    localStorage.setItem('da_clinics', JSON.stringify(clinics));
  },
  getClinicById(id) {
    return this.getClinics().find(c => c.id === id);
  },

  // ========== FOYDALANUVCHILAR ==========
  getUsers() {
    return JSON.parse(localStorage.getItem('da_users') || '[]');
  },
  saveUser(user) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    localStorage.setItem('da_users', JSON.stringify(users));
    return user;
  },
  deleteUser(id) {
    const users = this.getUsers().filter(u => u.id !== id);
    localStorage.setItem('da_users', JSON.stringify(users));
  },
  findUserByLogin(username, clinicId) {
    return this.getUsers().find(u =>
      u.username === username &&
      (u.role === 'super_admin' || u.clinicId === clinicId)
    );
  },

  // ========== SOZLAMALAR ==========
  getSettings(clinicId) {
    const all = JSON.parse(localStorage.getItem('da_settings') || '{}');
    return all[clinicId] || {};
  },
  updateSetting(clinicId, key, value) {
    const all = JSON.parse(localStorage.getItem('da_settings') || '{}');
    if (!all[clinicId]) all[clinicId] = {};
    all[clinicId][key] = value;
    localStorage.setItem('da_settings', JSON.stringify(all));
  },
  updateSettings(clinicId, updates) {
    const all = JSON.parse(localStorage.getItem('da_settings') || '{}');
    if (!all[clinicId]) all[clinicId] = {};
    Object.assign(all[clinicId], updates);
    localStorage.setItem('da_settings', JSON.stringify(all));
  },

  // ========== VRACHLAR ==========
  getDoctors(clinicId) {
    const all = JSON.parse(localStorage.getItem('da_doctors') || '{}');
    return (all[clinicId] || []).filter(d => !d.deleted);
  },
  saveDoctor(clinicId, doctor) {
    const all = JSON.parse(localStorage.getItem('da_doctors') || '{}');
    if (!all[clinicId]) all[clinicId] = [];
    const idx = all[clinicId].findIndex(d => d.id === doctor.id);
    if (idx >= 0) all[clinicId][idx] = doctor;
    else all[clinicId].push(doctor);
    localStorage.setItem('da_doctors', JSON.stringify(all));
    return doctor;
  },
  deleteDoctor(clinicId, id) {
    const all = JSON.parse(localStorage.getItem('da_doctors') || '{}');
    if (!all[clinicId]) return;
    const idx = all[clinicId].findIndex(d => d.id === id);
    if (idx >= 0) all[clinicId][idx].deleted = true;
    localStorage.setItem('da_doctors', JSON.stringify(all));
  },

  // ========== HAMSHIRALAR ==========
  getNurses(clinicId) {
    const all = JSON.parse(localStorage.getItem('da_nurses') || '{}');
    return (all[clinicId] || []).filter(n => !n.deleted);
  },
  saveNurse(clinicId, nurse) {
    const all = JSON.parse(localStorage.getItem('da_nurses') || '{}');
    if (!all[clinicId]) all[clinicId] = [];
    const idx = all[clinicId].findIndex(n => n.id === nurse.id);
    if (idx >= 0) all[clinicId][idx] = nurse;
    else all[clinicId].push(nurse);
    localStorage.setItem('da_nurses', JSON.stringify(all));
    return nurse;
  },
  deleteNurse(clinicId, id) {
    const all = JSON.parse(localStorage.getItem('da_nurses') || '{}');
    if (!all[clinicId]) return;
    const idx = all[clinicId].findIndex(n => n.id === id);
    if (idx >= 0) all[clinicId][idx].deleted = true;
    localStorage.setItem('da_nurses', JSON.stringify(all));
  },

  // ========== TO'LOV TURLARI ==========
  getPaymentTypes(clinicId) {
    const all = JSON.parse(localStorage.getItem('da_payment_types') || '{}');
    return all[clinicId] || [
      { id: 'naqd', name: 'Naqd pul', icon: '💵', active: true, builtin: true },
      { id: 'terminal', name: 'Terminal', icon: '💳', active: true, builtin: true },
      { id: 'qr', name: 'QR-kod', icon: '📱', active: true, builtin: true },
      { id: 'inkassa', name: 'Inkassa', icon: '🏦', active: true, builtin: true },
      { id: 'prechesleniya', name: 'Prechesleniya', icon: '🔄', active: true, builtin: true },
      { id: 'p2p', name: 'P2P / Payme', icon: '📲', active: true, builtin: false },
    ];
  },
  savePaymentTypes(clinicId, types) {
    const all = JSON.parse(localStorage.getItem('da_payment_types') || '{}');
    all[clinicId] = types;
    localStorage.setItem('da_payment_types', JSON.stringify(all));
  },

  // ========== XARAJAT KATEGORIYALARI ==========
  getExpenseCategories(clinicId) {
    const all = JSON.parse(localStorage.getItem('da_expense_cats') || '{}');
    return all[clinicId] || [
      { id: 'arenda', name: 'Arenda', active: true },
      { id: 'kommunal', name: 'Kommunal', active: true },
      { id: 'texnik', name: 'Texnik', active: true },
      { id: 'maosh', name: 'Xodim maoshi', active: true },
      { id: 'boshqa', name: 'Boshqa', active: true },
    ];
  },
  saveExpenseCategories(clinicId, cats) {
    const all = JSON.parse(localStorage.getItem('da_expense_cats') || '{}');
    all[clinicId] = cats;
    localStorage.setItem('da_expense_cats', JSON.stringify(all));
  },

  // ========== QO'SHIMCHA MAYDONLAR ==========
  getCustomFields(clinicId) {
    const all = JSON.parse(localStorage.getItem('da_custom_fields') || '{}');
    return all[clinicId] || [];
  },
  saveCustomFields(clinicId, fields) {
    const all = JSON.parse(localStorage.getItem('da_custom_fields') || '{}');
    all[clinicId] = fields;
    localStorage.setItem('da_custom_fields', JSON.stringify(all));
  },

  // ========== KUNLIK HISOBOT ==========
  getDailyReports(clinicId) {
    const all = JSON.parse(localStorage.getItem('da_daily_reports') || '{}');
    return all[clinicId] || [];
  },
  getDailyReport(clinicId, date) {
    const reports = this.getDailyReports(clinicId);
    return reports.find(r => r.date === date) || null;
  },
  saveDailyReport(clinicId, report) {
    const all = JSON.parse(localStorage.getItem('da_daily_reports') || '{}');
    if (!all[clinicId]) all[clinicId] = [];
    const idx = all[clinicId].findIndex(r => r.date === report.date);
    if (idx >= 0) all[clinicId][idx] = report;
    else all[clinicId].push(report);
    localStorage.setItem('da_daily_reports', JSON.stringify(all));
    return report;
  },
  deleteDailyReport(clinicId, date) {
    const all = JSON.parse(localStorage.getItem('da_daily_reports') || '{}');
    if (!all[clinicId]) return;
    all[clinicId] = all[clinicId].filter(r => r.date !== date);
    localStorage.setItem('da_daily_reports', JSON.stringify(all));
  },

  // ========== OYLIK AGREGATSIYA ==========
  getMonthlyReports(clinicId, year, month) {
    // month: 1-12
    const reports = this.getDailyReports(clinicId);
    return reports.filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    }).sort((a, b) => a.date.localeCompare(b.date));
  },

  getYearlyReports(clinicId, year) {
    const reports = this.getDailyReports(clinicId);
    return reports.filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === year;
    });
  },

  // ========== UTIL: ID GENERATSIYA ==========
  generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // ========== DEMO MA'LUMOTLAR ==========
  seedDemo() {
    if (localStorage.getItem('da_seeded')) return;

    // Super admin
    const superAdmin = {
      id: 'user_super',
      username: 'admin',
      password: 'admin123',
      role: 'super_admin',
      fullName: 'Super Admin',
      clinicId: null
    };

    // Klinika
    const clinic = {
      id: 'clinic_main',
      name: 'FDC Stomatologiya',
      address: 'Toshkent, Yunusobod tumani',
      phone: '+998 90 123-45-67',
      color: '#6366f1',
      createdAt: new Date().toISOString()
    };

    // Rahbar
    const rahbar = {
      id: 'user_rahbar',
      username: 'rahbar',
      password: 'rahbar123',
      role: 'admin',
      fullName: 'Farrukh Abdirakhimov',
      clinicId: clinic.id
    };

    // Qabulxona
    const reception = {
      id: 'user_recep',
      username: 'kassir',
      password: 'kassir123',
      role: 'receptionist',
      fullName: 'Qabulxona Xodimi',
      clinicId: clinic.id
    };

    // Vrachlar
    const doctors = [
      { id: 'dr_shaxruz', name: 'Dr. Shaxruz', percent: 35, formula: '(tushum - texnik) * percent / 100 + implant_count * implant_value', implantMode: 'fixed', implantValue: 300000, active: true, color: '#6366f1' },
      { id: 'dr_otanazar', name: 'Dr. Otanazar', percent: 35, formula: '(tushum - texnik) * percent / 100 + implant_count * implant_value', implantMode: 'fixed', implantValue: 300000, active: true, color: '#8b5cf6' },
      { id: 'dr_abror', name: 'Dr. Abror', percent: 35, formula: '(tushum - texnik) * percent / 100 + implant_count * implant_value', implantMode: 'fixed', implantValue: 300000, active: true, color: '#06b6d4' },
      { id: 'dr_jahongir', name: 'Dr. Jahongir', percent: 35, formula: '(tushum - texnik) * percent / 100 + implant_count * implant_value', implantMode: 'fixed', implantValue: 300000, active: true, color: '#10b981' },
      { id: 'dr_oybek_u', name: 'Dr. Oybek Usanovich', percent: 30, formula: '(tushum - texnik) * percent / 100 + implant_count * implant_value', implantMode: 'fixed', implantValue: 300000, active: true, color: '#f59e0b' },
      { id: 'dr_bexzod', name: 'Dr. Bexzod', percent: 30, formula: '(tushum - texnik) * percent / 100 + implant_count * implant_value', implantMode: 'fixed', implantValue: 300000, active: true, color: '#ef4444' },
      { id: 'dr_jasur', name: 'Dr. Jasur', percent: 30, formula: '(tushum - texnik) * percent / 100 + implant_count * implant_value', implantMode: 'fixed', implantValue: 300000, active: true, color: '#ec4899' },
      { id: 'dr_oybek_q', name: 'Dr. Oybek Qazaqov', percent: 30, formula: '(tushum - texnik) * percent / 100 + implant_count * implant_value', implantMode: 'fixed', implantValue: 300000, active: true, color: '#84cc16' },
    ];

    // Hamshiralar
    const nurses = [
      { id: 'nurse_1', name: 'Yusupova Niyozjon', baseSalary: 2300000, active: true },
      { id: 'nurse_2', name: 'R. Farangiz', baseSalary: 1290000, active: true },
      { id: 'nurse_3', name: 'Xakimova Sevara', baseSalary: 1500000, active: true },
      { id: 'nurse_4', name: 'Bekchanova Sarvinoz', baseSalary: 2500000, active: true },
    ];

    // Sozlamalar
    const settings = {
      dollarRate: 12700,
      arenda: 4450000,
      kommunal: 1290000,
      shaxruzXarajat: 0,
      clinicName: clinic.name
    };

    // Saqlash
    localStorage.setItem('da_users', JSON.stringify([superAdmin, rahbar, reception]));
    this.saveClinic(clinic);
    const all_doc = {};
    all_doc[clinic.id] = doctors;
    localStorage.setItem('da_doctors', JSON.stringify(all_doc));
    const all_nur = {};
    all_nur[clinic.id] = nurses;
    localStorage.setItem('da_nurses', JSON.stringify(all_nur));
    this.updateSettings(clinic.id, settings);
    localStorage.setItem('da_seeded', '1');

    console.log('✅ Demo ma\'lumotlar yuklandi');
  }
};
