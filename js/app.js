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

// ── Super Admin Panel ─────────────────────────────────────────────────────────
const SuperAdmin = {
  _clinics: [], // cache

  async renderClinics() {
    const session = Auth.requireAuth(['super_admin']);
    if (!session) return;

    const app = document.getElementById('app');
    // Loading
    app.innerHTML = Components.renderLayout(session, '/super/clinics', `
      <div class="page-body" style="display:flex;align-items:center;justify-content:center;min-height:60vh">
        <div style="text-align:center;color:var(--text-secondary)">
          <div style="font-size:36px;margin-bottom:12px">⏳</div>
          <div>Ma'lumotlar yuklanmoqda...</div>
        </div>
      </div>
    `);

    try {
      this._clinics = await API.get('/super/overview');
    } catch (e) {
      Utils.toast('error', 'Xato', e.message);
      this._clinics = [];
    }

    const total   = this._clinics.length;
    const active  = this._clinics.filter(c => c.subscription.status === 'active' || c.subscription.status === 'no_expiry').length;
    const warning = this._clinics.filter(c => ['warning', 'critical'].includes(c.subscription.status)).length;
    const expired = this._clinics.filter(c => c.subscription.status === 'expired').length;

    const content = `
      ${Components.renderPageHeader(
        '🏥 Filiallar Monitoringi',
        `${total} ta filial • ${active} faol • ${warning} ogohlantirish • ${expired} muddati tugagan`,
        `<button class="btn btn-primary" onclick="SuperAdmin.openAddClinic()">
          ${Utils.icon('plus', 14)} Yangi filial
        </button>`
      )}
      <div class="page-body" style="display:flex;flex-direction:column;gap:var(--sp-5)">

        <!-- Summary stats -->
        <div class="stats-grid stats-grid-4">
          <div class="stat-card" style="--stat-color:var(--grad-brand)">
            <div class="stat-label">Jami filiallar</div>
            <div class="stat-value">${total}</div>
            <div class="stat-icon">${Utils.icon('building', 20)}</div>
          </div>
          <div class="stat-card" style="--stat-color:var(--grad-success)">
            <div class="stat-label">🟢 Faol</div>
            <div class="stat-value">${active}</div>
            <div class="stat-icon">✅</div>
          </div>
          <div class="stat-card" style="--stat-color:linear-gradient(135deg,#f59e0b,#d97706)">
            <div class="stat-label">🟡 Ogohlantirish</div>
            <div class="stat-value">${warning}</div>
            <div class="stat-icon">⚠️</div>
          </div>
          <div class="stat-card" style="--stat-color:var(--grad-danger)">
            <div class="stat-label">🔴 Muddati o'tgan</div>
            <div class="stat-value">${expired}</div>
            <div class="stat-icon">❌</div>
          </div>
        </div>

        <!-- Clinic cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:var(--sp-4)">
          ${this._clinics.map(c => this._renderClinicCard(c)).join('') || `
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

  _renderClinicCard(c) {
    const sub     = c.subscription;
    const lastAct = c.lastReportDate
      ? Utils.formatDate(c.lastReportDate)
      : (c.lastActivityAt ? Utils.formatDate(c.lastActivityAt.split('T')[0]) : '—');

    const daysSinceActivity = c.lastReportDate
      ? Math.floor((new Date() - new Date(c.lastReportDate)) / 86400000)
      : null;

    const activityBadge = daysSinceActivity === null ? `<span class="badge badge-neutral">Faollik yo'q</span>`
      : daysSinceActivity > 7  ? `<span class="badge badge-danger">${daysSinceActivity} kun faol emas ⚠️</span>`
      : daysSinceActivity > 3  ? `<span class="badge" style="background:#f59e0b20;color:#f59e0b">${daysSinceActivity} kun</span>`
      : `<span class="badge badge-success">Faol</span>`;

    const subBadge = `<span class="badge" style="background:${sub.color}20;color:${sub.color};border:1px solid ${sub.color}40">
      ${sub.status === 'active' ? '✅' : sub.status === 'warning' ? '⚠️' : sub.status === 'critical' || sub.status === 'expired' ? '🔴' : sub.status === 'inactive' ? '⛔' : '∞'}
      ${sub.label}
    </span>`;

    return `
      <div class="card" style="border:2px solid ${c.active ? sub.color : '#6b7280'}22;position:relative;opacity:${c.active ? 1 : 0.7}">
        <div style="display:flex;align-items:center;gap:var(--sp-3);margin-bottom:var(--sp-4)">
          <div style="width:48px;height:48px;border-radius:var(--r-md);background:${c.color||'var(--grad-brand)'};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🦷</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:var(--text-md);font-weight:700">${c.name}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">${c.address || '—'}</div>
          </div>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:var(--sp-4)">
          ${subBadge} ${activityBadge}
        </div>

        <!-- Stats row -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sp-2);margin-bottom:var(--sp-4)">
          ${[
            ['👨‍⚕️', c.doctorCount, 'Vrach'],
            ['💉', c.nurseCount, 'Hamshira'],
            ['📋', c.reportCount, 'Hisobot'],
            ['👤', c.userCount, 'Foydalanuvchi'],
          ].map(([icon, val, lbl]) => `
            <div style="text-align:center;padding:var(--sp-2);background:var(--bg-secondary);border-radius:var(--r-sm)">
              <div style="font-size:14px">${icon}</div>
              <div style="font-size:var(--text-lg);font-weight:700">${val}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted)">${lbl}</div>
            </div>
          `).join('')}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:var(--sp-3);gap:var(--sp-2)">
          <div style="font-size:var(--text-xs);color:var(--text-muted)">Oxirgi faollik: ${lastAct}</div>
          <div style="display:flex;gap:var(--sp-2)">
            <button class="btn btn-secondary btn-sm" onclick="SuperAdmin.openSubscription('${c.id}')" title="Abonement">
              🗓️
            </button>
            <button class="btn btn-secondary btn-sm" onclick="SuperAdmin.openUsers('${c.id}','${c.name}')" title="Foydalanuvchilar / Parol">
              🔑
            </button>
            <button class="btn btn-sm ${c.active ? 'btn-danger' : 'btn-primary'}"
              onclick="SuperAdmin.toggleActive('${c.id}',${c.active})">
              ${c.active ? '⛔ Nofaollashtirish' : '✅ Faollashtirish'}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ── Abonement muddat boshqaruv ─────────────────────────────────────────────
  openSubscription(clinicId) {
    const c   = this._clinics.find(x => x.id === clinicId);
    if (!c) return;
    const sub = c.subscription;
    const curExpiry = c.expiresAt ? c.expiresAt.split('T')[0] : '';

    Utils.openModal(`
      <div class="modal-header">
        <div>
          <div class="modal-title">🗓️ Abonement — ${c.name}</div>
          <div class="modal-sub">Hozir: <b style="color:${sub.color}">${sub.label}</b></div>
        </div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
        <div class="form-group">
          <label class="label">Abonement tugash sanasi</label>
          <input class="input" type="date" id="sub-expires" value="${curExpiry}" min="${new Date().toISOString().split('T')[0]}" />
          <div class="hint" style="margin-top:4px">Bo'sh qoldirsa — muddatsiz (cheksiz)</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-2)">
          ${[['1 oy', 30], ['3 oy', 90], ['6 oy', 180], ['1 yil', 365], ['2 yil', 730]].map(([lbl, days]) => {
            const d = new Date(); d.setDate(d.getDate() + days);
            const val = d.toISOString().split('T')[0];
            return `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('sub-expires').value='${val}'">${lbl}</button>`;
          }).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Bekor</button>
        <button class="btn btn-primary" onclick="SuperAdmin.saveSubscription('${clinicId}')">Saqlash</button>
      </div>
    `);
  },

  async saveSubscription(clinicId) {
    const expiresAt = document.getElementById('sub-expires')?.value || null;
    try {
      await API.patch(`/super/clinics/${clinicId}/subscription`, { expiresAt: expiresAt || null });
      Utils.toast('success', 'Saqlandi', 'Abonement yangilandi');
      Utils.closeModal();
      this.renderClinics();
    } catch (e) { Utils.toast('error', 'Xato', e.message); }
  },

  // ── Faollashtirish / Nofaollashtirish ─────────────────────────────────────
  async toggleActive(clinicId, currentlyActive) {
    const action = currentlyActive ? 'nofaollashtirmoqchimisiz' : 'faollashtirmoqchimisiz';
    const c = this._clinics.find(x => x.id === clinicId);
    if (!confirm(`"${c?.name}" ni ${action}?`)) return;
    try {
      await API.patch(`/super/clinics/${clinicId}/subscription`, { active: !currentlyActive });
      Utils.toast('success', currentlyActive ? 'Nofaollashtirildi' : 'Faollashtirildi');
      this.renderClinics();
    } catch (e) { Utils.toast('error', 'Xato', e.message); }
  },

  // ── Foydalanuvchilar & parol tiklash ──────────────────────────────────────
  async openUsers(clinicId, clinicName) {
    let users = [];
    try { users = await API.get(`/super/clinics/${clinicId}/users`); }
    catch (e) { Utils.toast('error', 'Foydalanuvchilar yuklanmadi', e.message); return; }

    const rows = users.map(u => `
      <tr>
        <td>${u.fullName}</td>
        <td><code>@${u.username}</code></td>
        <td>${Auth.getRoleLabel(u.role)}</td>
        <td>
          <button class="btn btn-secondary btn-sm"
            onclick="SuperAdmin.openResetPassword('${clinicId}','${u.id}','${u.username}')">
            🔑 Parol tiklash
          </button>
        </td>
      </tr>
    `).join('');

    Utils.openModal(`
      <div class="modal-header">
        <div class="modal-title">👤 ${clinicName} — Foydalanuvchilar</div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Ism</th><th>Username</th><th>Rol</th><th>Amal</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" style="text-align:center">Foydalanuvchi yo\'q</td></tr>'}</tbody>
        </table>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Yopish</button>
      </div>
    `, { size: 'modal-lg' });
  },

  openResetPassword(clinicId, userId, username) {
    Utils.openModal(`
      <div class="modal-header">
        <div>
          <div class="modal-title">🔑 Parol tiklash</div>
          <div class="modal-sub"><code>@${username}</code></div>
        </div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>
      <div class="form-group" style="margin:var(--sp-4) 0">
        <label class="label">Yangi parol (kamida 6 ta belgi)</label>
        <input class="input" type="password" id="new-pwd" placeholder="Yangi parol..." />
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Bekor</button>
        <button class="btn btn-danger" onclick="SuperAdmin.doResetPassword('${clinicId}','${userId}','${username}')">
          🔑 Parolni tiklash
        </button>
      </div>
    `);
  },

  async doResetPassword(clinicId, userId, username) {
    const newPassword = document.getElementById('new-pwd')?.value;
    if (!newPassword || newPassword.length < 6) {
      Utils.toast('error', 'Xato', 'Kamida 6 ta belgi kiriting'); return;
    }
    try {
      await API.post(`/super/clinics/${clinicId}/reset-password`, { userId, newPassword });
      Utils.toast('success', 'Parol tiklandi', `@${username} uchun yangi parol o'rnatildi`);
      Utils.closeModal();
    } catch (e) { Utils.toast('error', 'Xato', e.message); }
  },

  // ── Yangi filial qo'shish ─────────────────────────────────────────────────
  openAddClinic() {
    Utils.openModal(`
      <div class="modal-header">
        <div class="modal-title">🏥 Yangi filial yaratish</div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="label">Klinika nomi *</label>
            <input class="input" id="new-clinic-name" placeholder="FDC Stomatologiya" />
          </div>
          <div class="form-group">
            <label class="label">Manzil</label>
            <input class="input" id="new-clinic-address" placeholder="Toshkent, Yunusobod" />
          </div>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="label">Admin username *</label>
            <input class="input" id="new-clinic-admin-user" placeholder="fdcone_admin" />
          </div>
          <div class="form-group">
            <label class="label">Admin parol *</label>
            <input class="input" type="password" id="new-clinic-admin-pass" placeholder="Kamida 6 belgi" />
          </div>
        </div>
        <div class="form-group">
          <label class="label">Abonement tugash sanasi</label>
          <input class="input" type="date" id="new-clinic-expires" />
          <div class="hint" style="margin-top:4px">Bo'sh = muddatsiz</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Bekor</button>
        <button class="btn btn-primary" onclick="SuperAdmin.createClinic()">Yaratish</button>
      </div>
    `);
  },

  async createClinic() {
    const name      = document.getElementById('new-clinic-name')?.value?.trim();
    const address   = document.getElementById('new-clinic-address')?.value?.trim();
    const adminUser = document.getElementById('new-clinic-admin-user')?.value?.trim();
    const adminPass = document.getElementById('new-clinic-admin-pass')?.value;
    const expiresAt = document.getElementById('new-clinic-expires')?.value || null;

    if (!name || !adminUser || !adminPass) {
      Utils.toast('error', 'Barcha majburiy maydonlarni to\'ldiring'); return;
    }

    const btn = document.querySelector('.modal-footer .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Yaratilmoqda...'; }

    try {
      const result = await API.post('/clinics', { name, address, adminUser, adminPass, expiresAt });
      Utils.closeModal();
      Utils.toast('success', 'Filial yaratildi!',
        `Admin: ${result.adminUsername} | Kassir: ${result.kassirUsername}`);
      this.renderClinics();
    } catch (err) {
      Utils.toast('error', 'Xato', err.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Yaratish'; }
    }
  },

  renderUsers() {
    Router.go('/super/clinics'); // Users tab yo'q — barcha foydalanuvchilar klinika ichida
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
