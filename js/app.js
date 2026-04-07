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
        `<div style="display:flex;gap:var(--sp-2)">
          <button class="btn btn-secondary" onclick="SuperAdmin.openCompare()">
            📊 Solishtirish
          </button>
          <button class="btn btn-primary" onclick="SuperAdmin.openAddClinic()">
            ${Utils.icon('plus', 14)} Yangi filial
          </button>
        </div>`
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

        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:var(--sp-3);gap:var(--sp-2);flex-wrap:wrap">
          <div style="font-size:var(--text-xs);color:var(--text-muted)">Oxirgi faollik: ${lastAct}</div>
          <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" onclick="SuperAdmin.openClinicView('${c.id}','${c.name}')" title="Klinika hisobotini ko'rish">
              👁️ Ko'rish
            </button>
            <button class="btn btn-secondary btn-sm" onclick="SuperAdmin.openSubscription('${c.id}')" title="Abonement boshqaruvi">
              🗓️ Abonement
            </button>
            <button class="btn btn-secondary btn-sm" onclick="SuperAdmin.openUsers('${c.id}','${c.name}')" title="Login va parolni o'zgartirish">
              🔑 Login/Parol
            </button>
            <button class="btn btn-sm ${c.active ? 'btn-danger' : 'btn-primary'}"
              onclick="SuperAdmin.toggleActive('${c.id}',${c.active})">
              ${c.active ? '⛔ O\'chirish' : '✅ Yoqish'}
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

  async openUsers(clinicId, clinicName) {
    let users = [];
    try { users = await API.get(`/super/clinics/${clinicId}/users`); }
    catch (e) { Utils.toast('error', 'Yuklanmadi', e.message); return; }

    const roles = { admin: '👑 Rahbar', kassir: '💼 Kassir', receptionist: '📋 Retseptsionist', super_admin: '🔑 Super Admin' };

    Utils.openModal(`
      <div class="modal-header">
        <div>
          <div class="modal-title">🔑 ${clinicName} — Login va Parollar</div>
          <div class="modal-sub" style="color:var(--text-muted);font-size:12px">Parolni bo'sh qoldiring — o'zgarmaydi. Logini o'zgartirish ham mumkin.</div>
        </div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
        ${users.map((u, i) => `
          <div style="border:1px solid var(--border-subtle);border-radius:var(--r-md);padding:var(--sp-4);background:var(--bg-secondary)">
            <!-- User header -->
            <div style="display:flex;align-items:center;gap:var(--sp-3);margin-bottom:var(--sp-3)">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--grad-brand);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0">
                ${Utils.getInitials(u.fullName)}
              </div>
              <div>
                <div style="font-weight:700">${u.fullName}</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted)">${roles[u.role] || u.role}</div>
              </div>
              <span id="user-save-status-${i}" style="margin-left:auto;font-size:11px"></span>
            </div>

            <!-- Fields -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
              <div class="form-group" style="margin:0">
                <label class="label" style="font-size:11px">👤 Login (username)</label>
                <input class="input" id="user-login-${i}" value="${u.username}"
                  placeholder="username" style="font-family:var(--font-mono)" />
              </div>
              <div class="form-group" style="margin:0">
                <label class="label" style="font-size:11px">🔒 Yangi parol <span style="color:var(--text-muted);font-weight:400">(bo'sh = o'zgarmaydi)</span></label>
                <div style="position:relative">
                  <input class="input" type="password" id="user-pwd-${i}"
                    placeholder="Yangi parol kiriting..."
                    style="padding-right:40px" />
                  <button style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px"
                    onclick="const inp=document.getElementById('user-pwd-${i}');inp.type=inp.type==='password'?'text':'password'"
                    title="Ko'rsatish/yashirish">👁️</button>
                </div>
              </div>
            </div>

            <div style="margin-top:var(--sp-3);display:flex;align-items:center;gap:var(--sp-2)">
              <button class="btn btn-secondary btn-sm" id="user-save-btn-${i}"
                onclick="SuperAdmin.saveUserEdit('${clinicId}','${u.id}',${i},'${u.username}')">
                💾 Saqlash
              </button>
              <span style="font-size:10px;color:var(--text-muted)">Joriy login: <code>@${u.username}</code></span>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Yopish</button>
      </div>
    `, { size: 'lg' });
  },

  async saveUserEdit(clinicId, userId, idx, oldUsername) {
    const newLogin = document.getElementById(`user-login-${idx}`)?.value?.trim();
    const newPwd   = document.getElementById(`user-pwd-${idx}`)?.value;
    const statusEl = document.getElementById(`user-save-status-${idx}`);
    const btn      = document.getElementById(`user-save-btn-${idx}`);

    if (!newLogin) { Utils.toast('error', 'Login bo\'sh bo\'lmaydi'); return; }
    if (newPwd && newPwd.length < 6) { Utils.toast('error', 'Parol kamida 6 ta belgi bo\'lishi kerak'); return; }

    const body = { userId, newLogin: newLogin !== oldUsername ? newLogin : undefined, newPassword: newPwd || undefined };
    if (!body.newLogin && !body.newPassword) {
      Utils.toast('info', 'O\'zgarish yo\'q', 'Login yoki parol kiritilmadi'); return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳...'; }
    try {
      await API.post(`/super/clinics/${clinicId}/reset-password`, body);
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--brand-success)">✅ Saqlandi</span>';
      if (btn) { btn.disabled = false; btn.textContent = '💾 Saqlash'; }
      // Pwd fieldini tozalash
      const pwdEl = document.getElementById(`user-pwd-${idx}`);
      if (pwdEl) pwdEl.value = '';
      Utils.toast('success', 'Saqlandi', newPwd ? 'Login va parol yangilandi' : 'Login yangilandi');
    } catch (e) {
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--brand-danger)">❌ ${e.message}</span>`;
      if (btn) { btn.disabled = false; btn.textContent = '💾 Saqlash'; }
    }
  },

  // ── Klinika hisobotini ko'rish (readonly) ──────────────────────────────────
  async openClinicView(clinicId, clinicName) {
    let stats = null;
    try { stats = await API.get(`/super/clinics/${clinicId}/stats`); }
    catch (e) { Utils.toast('error', 'Yuklanmadi', e.message); return; }

    const { thisMonth, doctors, nurses } = stats;
    const now = new Date();
    const monthName = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktyabr','Noyabr','Dekabr'][now.getMonth()];

    Utils.openModal(`
      <div class="modal-header">
        <div>
          <div class="modal-title">🏥 ${clinicName} — Ko'rish rejimi</div>
          <div class="modal-sub" style="color:var(--text-muted);font-size:12px">🔒 Faqat ko'rish — o'zgartirish mumkin emas</div>
        </div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>

      <!-- Bu oy statistika -->
      <div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--text-sm);font-weight:700;color:var(--text-secondary);margin-bottom:var(--sp-3)">📅 ${monthName} ${now.getFullYear()} — Oylik ko'rsatkichlar</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-3)">
          ${[
            ['💰 Jami tushum', thisMonth.tushum, 'var(--brand-primary)', 'sum'],
            ['💸 Jami avans', thisMonth.avansTotal, 'var(--brand-warning)', 'sum'],
            ['📋 Xarajatlar', thisMonth.xarajat, 'var(--brand-danger)', 'sum'],
            ['📊 Kun soni', thisMonth.days, '#22d3ee', 'count'],
            ['👨‍⚕️ Vrachlar', doctors.length, 'var(--brand-primary)', 'count'],
            ['👩‍⚕️ Hamshiralar', nurses.length, '#ec4899', 'count'],
          ].map(([lbl, val, color, type]) => `
            <div style="padding:var(--sp-3);border:1px solid ${color}30;border-radius:var(--r-md);background:${color}0d">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">${lbl}</div>
              <div style="font-family:var(--font-mono);font-weight:800;color:${color};font-size:var(--text-md)">
                ${type === 'sum' ? Utils.formatMoneyShort(val) : val}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Vrachlar ro'yxati -->
      <div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--text-sm);font-weight:700;color:var(--text-secondary);margin-bottom:var(--sp-3)">👨‍⚕️ Vrachlar (${doctors.length} ta)</div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${doctors.map(d => `
            <div style="padding:6px 12px;border-radius:var(--r-md);background:var(--bg-elevated);font-size:12px;border:1px solid var(--border-subtle)">
              ${d.name} <span style="color:var(--brand-primary);font-family:var(--font-mono)">${d.percent}%</span>
            </div>`).join('') || '<span style="color:var(--text-muted);font-size:12px">Vrachlar yo\'q</span>'}
        </div>
      </div>

      <!-- Hamshiralar -->
      <div>
        <div style="font-size:var(--text-sm);font-weight:700;color:var(--text-secondary);margin-bottom:var(--sp-3)">👩‍⚕️ Hamshiralar (${nurses.length} ta)</div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${nurses.map(n => `
            <div style="padding:6px 12px;border-radius:var(--r-md);background:var(--bg-elevated);font-size:12px;border:1px solid var(--border-subtle)">
              ${n.name} <span style="color:#ec4899;font-family:var(--font-mono)">${Utils.formatMoneyShort(n.baseSalary)}</span>
            </div>`).join('') || '<span style="color:var(--text-muted);font-size:12px">Hamshiralar yo\'q</span>'}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Yopish</button>
      </div>
    `, { size: 'lg' });
  },

  // ── Filiallar solishtirish ─────────────────────────────────────────────────
  openCompare() {
    const clinics = this._clinics;
    if (!clinics.length) { Utils.toast('info', 'Filiallar yo\'q'); return; }

    const maxReports = Math.max(...clinics.map(c => c.reportCount || 0)) || 1;
    const maxDoctors = Math.max(...clinics.map(c => c.doctorCount || 0)) || 1;

    const barRow = (label, clinics, getValue, max, color) => `
      <div style="margin-bottom:var(--sp-5)">
        <div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:var(--sp-3);text-transform:uppercase;letter-spacing:.05em">${label}</div>
        ${clinics.map(c => {
          const val = getValue(c);
          const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
          return `
            <div style="display:flex;align-items:center;gap:var(--sp-3);margin-bottom:var(--sp-2)">
              <div style="width:120px;font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0">${c.name}</div>
              <div style="flex:1;height:22px;background:var(--bg-elevated);border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${pct.toFixed(1)}%;background:${color};border-radius:4px;display:flex;align-items:center;padding-left:8px;transition:width .3s">
                  <span style="font-size:10px;font-weight:700;color:white;white-space:nowrap">${typeof val === 'number' && val > 100000 ? Utils.formatMoneyShort(val) : val}</span>
                </div>
              </div>
            </div>`;}).join('')}
      </div>`;

    Utils.openModal(`
      <div class="modal-header">
        <div class="modal-title">📊 Filiallar solishtirish</div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>

      <!-- Jadval solishtirish -->
      <div class="table-wrap" style="margin-bottom:var(--sp-5)">
        <table class="table" style="font-size:12px">
          <thead><tr>
            <th>Ko'rsatkich</th>
            ${clinics.map(c => `<th style="text-align:center">${c.name}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${[
              ['Holati', c => `<span class="badge" style="background:${c.subscription.color}20;color:${c.subscription.color}">${c.subscription.label}</span>`],
              ['Vrachlar', c => c.doctorCount],
              ['Hamshiralar', c => c.nurseCount],
              ['Hisobotlar', c => c.reportCount],
              ['Foydalanuvchilar', c => c.userCount],
              ['Oxirgi faollik', c => c.lastReportDate ? Utils.formatDateShort(c.lastReportDate) : '—'],
            ].map(([label, fn]) => `
              <tr>
                <td style="font-weight:600">${label}</td>
                ${clinics.map(c => `<td style="text-align:center">${fn(c)}</td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- Bar chart solishtirish -->
      ${barRow('Hisobotlar soni', clinics, c => c.reportCount, maxReports, 'var(--brand-primary)')}
      ${barRow('Vrachlar soni', clinics, c => c.doctorCount, maxDoctors, '#10b981')}

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Yopish</button>
      </div>
    `, { size: 'xl' });
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
