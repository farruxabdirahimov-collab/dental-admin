/**
 * Main App Entry Point
 */

// Router yo'llari
Router.register('/login', () => LoginPage.render());
Router.register('/admin/dashboard', () => AdminDashboard.render());
Router.register('/admin/settings', (p) => AdminSettings.render(p));
Router.register('/admin/doctors', () => AdminDoctors.render());
Router.register('/admin/nurses', () => AdminNurses.render());
Router.register('/admin/monthly', (p) => AdminMonthly.render(p));
Router.register('/admin/yearly', (p) => AdminYearly.render(p));
Router.register('/admin/salary', (p) => AdminSalary.render(p));
Router.register('/reception/daily', (p) => ReceptionDaily.render(p));
Router.register('/reception/history', (p) => ReceptionHistory.render(p));
Router.register('/super/clinics', () => SuperAdmin.renderClinics());
Router.register('/super/users', () => SuperAdmin.renderUsers());
Router.register('*', () => {
  const session = Auth.getSession();
  if (session) {
    if (session.role === 'admin' || session.role === 'super_admin') Router.go('/admin/dashboard');
    else Router.go('/reception/daily');
  } else {
    Router.go('/login');
  }
});

// Super Admin placeholder
const SuperAdmin = {
  renderClinics() {
    const session = Auth.requireAuth(['super_admin']);
    if (!session) return;

    const clinics = DB.getClinics();
    const content = `
      ${Components.renderPageHeader(
        '🏥 Filiallar',
        `Jami ${clinics.length} ta filial`,
        `<button class="btn btn-primary" onclick="SuperAdmin.openAddClinic()">
          ${Utils.icon('plus', 14)} Yangi filial
        </button>`
      )}
      <div class="page-body">
        <div class="clinic-cards-grid">
          ${clinics.map(c => `
            <div class="clinic-card" onclick="SuperAdmin.enterClinic('${c.id}')">
              <div class="clinic-card-header">
                <div class="clinic-card-icon" style="background:${c.color || 'var(--grad-brand)'}">🦷</div>
                <span class="badge badge-success">Faol</span>
              </div>
              <div class="clinic-card-name">${c.name}</div>
              <div class="clinic-card-address">${c.address || '—'}</div>
              <div class="clinic-card-stats">
                <div class="clinic-stat">
                  <div class="clinic-stat-val">${DB.getDoctors(c.id).length}</div>
                  <div class="clinic-stat-label">Vrachlar</div>
                </div>
                <div class="clinic-stat">
                  <div class="clinic-stat-val">${DB.getNurses(c.id).length}</div>
                  <div class="clinic-stat-label">Hamshira</div>
                </div>
                <div class="clinic-stat">
                  <div class="clinic-stat-val">${DB.getDailyReports(c.id).length}</div>
                  <div class="clinic-stat-label">Kun</div>
                </div>
              </div>
            </div>
          `).join('') || `
            <div class="empty-state" style="grid-column:1/-1">
              <div class="empty-icon">🏥</div>
              <div class="empty-title">Hech qanday filial yo'q</div>
              <button class="btn btn-primary" onclick="SuperAdmin.openAddClinic()">Birinchi filial yaratish</button>
            </div>
          `}
        </div>
      </div>
    `;
    document.getElementById('app').innerHTML = Components.renderLayout(session, '/super/clinics', content);
  },

  openAddClinic() {
    Utils.openModal(`
      <div class="modal-header">
        <div class="modal-title">🏥 Yangi filial yaratish</div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-4);">
        <div class="form-group">
          <label class="label">Klinika nomi *</label>
          <input class="input" id="new-clinic-name" placeholder="FDC Stomatologiya" />
        </div>
        <div class="form-group">
          <label class="label">Manzil</label>
          <input class="input" id="new-clinic-address" placeholder="Toshkent, Yunusobod" />
        </div>
        <div class="form-group">
          <label class="label">Telefon</label>
          <input class="input" id="new-clinic-phone" placeholder="+998 90 000-00-00" />
        </div>
        <div class="form-group">
          <label class="label">Admin username *</label>
          <input class="input" id="new-clinic-admin-user" placeholder="rahbar" />
        </div>
        <div class="form-group">
          <label class="label">Admin parol *</label>
          <input class="input" type="password" id="new-clinic-admin-pass" placeholder="****" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Bekor</button>
        <button class="btn btn-primary" onclick="SuperAdmin.createClinic()">Yaratish</button>
      </div>
    `);
  },

  createClinic() {
    const name = document.getElementById('new-clinic-name')?.value?.trim();
    const address = document.getElementById('new-clinic-address')?.value?.trim();
    const phone = document.getElementById('new-clinic-phone')?.value?.trim();
    const adminUser = document.getElementById('new-clinic-admin-user')?.value?.trim();
    const adminPass = document.getElementById('new-clinic-admin-pass')?.value;

    if (!name || !adminUser || !adminPass) {
      Utils.toast('error', 'Barcha majburiy maydonlarni to\'ldiring');
      return;
    }

    const clinicId = DB.generateId('clinic_');
    const clinic = { id: clinicId, name, address, phone, color: '#6366f1', createdAt: new Date().toISOString() };
    DB.saveClinic(clinic);

    DB.saveUser({
      id: DB.generateId('user_'),
      fullName: `${name} Rahbari`,
      username: adminUser,
      password: adminPass,
      role: 'admin',
      clinicId,
      createdAt: new Date().toISOString()
    });

    // Default qabulxona xodimi
    DB.saveUser({
      id: DB.generateId('user_'),
      fullName: 'Qabulxona',
      username: `${adminUser}_kassir`,
      password: adminPass + '_kassir',
      role: 'receptionist',
      clinicId,
      createdAt: new Date().toISOString()
    });

    Utils.closeModal();
    Utils.toast('success', 'Filial yaratildi!', `${name} muvaffaqiyatli yaratildi`);
    this.renderClinics();
  },

  enterClinic(clinicId) {
    Utils.toast('info', 'Tez orada', 'Super admin filialga kirish funksiyasi qo\'shiladi');
  },

  renderUsers() {
    const session = Auth.requireAuth(['super_admin']);
    if (!session) return;
    const users = DB.getUsers().filter(u => u.role !== 'super_admin');
    const content = `
      ${Components.renderPageHeader('👤 Barcha foydalanuvchilar', `Jami ${users.length} ta`)}
      <div class="page-body">
        <div class="card">
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Ism</th><th>Username</th><th>Rol</th><th>Filial</th></tr></thead>
              <tbody>
                ${users.map(u => {
                  const clinic = u.clinicId ? DB.getClinicById(u.clinicId) : null;
                  return `<tr>
                    <td>${u.fullName}</td>
                    <td><code>@${u.username}</code></td>
                    <td>${Auth.getRoleLabel(u.role)}</td>
                    <td>${clinic?.name || '—'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    document.getElementById('app').innerHTML = Components.renderLayout(session, '/super/users', content);
  }
};

// APP START
(async function init() {
  // Token tiklash (sahifa yangilanishida)
  Auth.restore();

  // Ma'lumotlar bor bo'lsa, cache ni tiklash
  const session = Auth.getSession();
  if (session && session.clinicId && API.hasToken()) {
    try {
      await DB.loadAll(session.clinicId);
    } catch (e) {
      // Token muddati tugagan — login ga yo'naltirish
      console.warn('Session tiklash xatosi:', e.message);
      Auth.logout();
      return;
    }
  }

  // Loading animatsiyasi
  const loading = document.getElementById('loading-screen');
  if (loading) {
    setTimeout(() => {
      loading.classList.add('hidden');
      Router.init();
    }, 600);
  } else {
    Router.init();
  }
})();
