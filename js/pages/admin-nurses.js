/**
 * Admin Nurses Management — To'liq oylik tizimi
 * - Oylik maosh belgilash
 * - Berilgan avansi oylikidan ayirib ko'rsatish
 * - Oylik bo'yicha avans tarixi
 */

const AdminNurses = {
  render() {
    const session = Auth.requireAuth(['admin', 'super_admin']);
    if (!session) return;
    const clinicId = session.clinicId;
    const nurses = DB.getNurses(clinicId);
    const now = Utils.getCurrentMonth();

    // Joriy oy uchun har bir hamshira avansini hisoblash
    const nurseStats = {};
    const reports = DB.getMonthlyReports(clinicId, now.year, now.month);
    nurses.forEach(n => {
      let totalAvans = 0;
      reports.forEach(r => {
        totalAvans += Number(((r.nurses || {})[n.id] || {}).avans) || 0;
      });
      nurseStats[n.id] = { totalAvans };
    });

    const totalSalary = nurses.reduce((s, n) => s + (n.baseSalary || 0), 0);
    const totalAvansAll = Object.values(nurseStats).reduce((s, ns) => s + ns.totalAvans, 0);

    const content = `
      ${Components.renderPageHeader(
        '👩‍⚕️ Hamshiralar',
        `${nurses.filter(n => n.active !== false).length} ta faol · Oylik jami: ${Utils.formatMoneyShort(totalSalary)}`,
        `<button class="btn btn-primary" onclick="AdminNurses.openAddModal('${clinicId}')">
          ${Utils.icon('plus', 14)} Yangi hamshira
        </button>`
      )}
      <div class="page-body" style="display:flex;flex-direction:column;gap:var(--sp-5);">

        <!-- Oylik umumiy ko'rsatkich -->
        <div class="stats-grid stats-grid-4">
          <div class="stat-card" style="--stat-color:var(--grad-brand)">
            <div class="stat-label">Jami hamshiralar</div>
            <div class="stat-value">${nurses.length}</div>
            <div class="stat-icon">👩‍⚕️</div>
          </div>
          <div class="stat-card" style="--stat-color:var(--grad-success)">
            <div class="stat-label">Oylik maoshlar jami</div>
            <div class="stat-value sm">${Utils.formatMoneyShort(totalSalary)}</div>
            <div class="stat-sub">${totalSalary.toLocaleString('ru-RU').replace(/,/g,' ')} so'm</div>
            <div class="stat-icon">${Utils.icon('money',18)}</div>
          </div>
          <div class="stat-card" style="--stat-color:var(--grad-warning)">
            <div class="stat-label">${Utils.getMonthName(now.month)} avans jami</div>
            <div class="stat-value sm" style="color:var(--brand-warning)">${Utils.formatMoneyShort(totalAvansAll)}</div>
            <div class="stat-sub">${totalAvansAll.toLocaleString('ru-RU').replace(/,/g,' ')} so'm</div>
            <div class="stat-icon">💸</div>
          </div>
          <div class="stat-card" style="--stat-color:var(--grad-danger)">
            <div class="stat-label">Oy oxirida beriladigan</div>
            <div class="stat-value sm" style="color:${(totalSalary-totalAvansAll)>=0?'var(--brand-success)':'var(--brand-danger)'}">
              ${Utils.formatMoneyShort(Math.max(0, totalSalary - totalAvansAll))}
            </div>
            <div class="stat-sub">${Math.max(0, totalSalary-totalAvansAll).toLocaleString('ru-RU').replace(/,/g,' ')} so'm</div>
            <div class="stat-icon">${Utils.icon('trend',18)}</div>
          </div>
        </div>

        <!-- Hamshiralar kartochkalari -->
        <div style="display:flex;flex-direction:column;gap:var(--sp-4);" id="nurses-list">
          ${nurses.map(n => this._renderNurseCard(n, nurseStats[n.id] || {}, clinicId, now)).join('')}
          ${!nurses.length ? `<div class="empty-state"><div class="empty-icon">👩‍⚕️</div><div class="empty-title">Hamshiralar yo'q</div><div class="empty-sub">Birinchi hamshirani qo'shing</div></div>` : ''}
        </div>

      </div>
    `;

    document.getElementById('app').innerHTML = Components.renderLayout(session, '/admin/nurses', content);
  },

  _renderNurseCard(nurse, stats, clinicId, now) {
    const isActive = nurse.active !== false;
    const avans = stats.totalAvans || 0;
    const salary = nurse.baseSalary || 0;
    const remaining = salary - avans;
    const pct = salary > 0 ? Math.min(100, Math.round((avans / salary) * 100)) : 0;

    // Progress bar rang
    const barColor = pct >= 90 ? 'var(--brand-danger)' : pct >= 60 ? 'var(--brand-warning)' : 'var(--brand-success)';

    return `
      <div class="card" style="border:2px solid ${isActive ? 'rgba(236,72,153,0.2)' : 'rgba(127,127,127,0.15)'};opacity:${isActive ? 1 : 0.6}">
        <div style="display:flex;align-items:center;gap:var(--sp-4);">

          <!-- Avatar -->
          <div class="doctor-avatar" style="background:linear-gradient(135deg,#ec4899,#f472b6);width:52px;height:52px;font-size:16px;flex-shrink:0;">
            ${Utils.getInitials(nurse.name)}
          </div>

          <!-- Asosiy ma'lumot -->
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:var(--sp-2);flex-wrap:wrap;">
              <span style="font-size:var(--text-md);font-weight:700">👩‍⚕️ ${nurse.name}</span>
              <span class="badge ${isActive ? 'badge-success' : 'badge-neutral'}">${isActive ? 'Faol' : 'Nofaol'}</span>
            </div>

            <!-- Oylik maosh breakdown -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-3);margin-top:var(--sp-3);">
              <div style="padding:var(--sp-2) var(--sp-3);background:var(--bg-elevated);border-radius:var(--r-md);">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">💰 Oylik maosh</div>
                <div style="font-family:var(--font-mono);font-weight:700;color:var(--brand-primary)">${Utils.formatMoneyShort(salary)}</div>
                <div style="font-size:9px;color:var(--text-muted)">${salary.toLocaleString('ru-RU').replace(/,/g,' ')}</div>
              </div>
              <div style="padding:var(--sp-2) var(--sp-3);background:var(--bg-elevated);border-radius:var(--r-md);">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">💸 ${Utils.getMonthName(now.month)} avansi</div>
                <div style="font-family:var(--font-mono);font-weight:700;color:var(--brand-warning)">-${Utils.formatMoneyShort(avans)}</div>
                <div style="font-size:9px;color:var(--text-muted)">${avans.toLocaleString('ru-RU').replace(/,/g,' ')}</div>
              </div>
              <div style="padding:var(--sp-2) var(--sp-3);background:var(--bg-elevated);border-radius:var(--r-md);">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">📌 Qolgan</div>
                <div style="font-family:var(--font-mono);font-weight:700;color:${remaining>=0?'var(--brand-success)':'var(--brand-danger)'}">
                  ${remaining >= 0 ? '' : '−'}${Utils.formatMoneyShort(Math.abs(remaining))}
                </div>
                <div style="font-size:9px;color:var(--text-muted)">${Math.abs(remaining).toLocaleString('ru-RU').replace(/,/g,' ')}</div>
              </div>
            </div>

            <!-- Progress bar -->
            <div style="margin-top:var(--sp-3);">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:10px;color:var(--text-muted)">Avans ulushi</span>
                <span style="font-size:10px;font-weight:600;color:${barColor}">${pct}%</span>
              </div>
              <div style="height:6px;background:var(--bg-elevated);border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width 0.3s;"></div>
              </div>
            </div>
          </div>

          <!-- Amallar -->
          <div style="display:flex;flex-direction:column;gap:var(--sp-2);flex-shrink:0;">
            <button class="btn btn-secondary btn-sm" onclick="AdminNurses.openEditModal('${clinicId}','${nurse.id}')" title="Tahrirlash">
              ${Utils.icon('edit', 14)} Tahrirlash
            </button>
            <button class="btn btn-ghost btn-sm" onclick="AdminNurses.viewHistory('${clinicId}','${nurse.id}')" title="Tarix">
              📋 Avans tarixi
            </button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="AdminNurses.deleteNurse('${clinicId}','${nurse.id}','${nurse.name}')" title="O'chirish">
              ${Utils.icon('trash', 14)}
            </button>
          </div>

        </div>

        <!-- Faollik toggle -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--sp-3);padding-top:var(--sp-3);border-top:1px solid var(--border-subtle);">
          <span style="font-size:var(--text-xs);color:var(--text-muted)">Faollik holati</span>
          <div class="toggle-wrap" onclick="AdminNurses.toggleActive('${clinicId}','${nurse.id}')">
            <div class="toggle ${isActive ? 'on' : ''}"></div>
          </div>
        </div>
      </div>
    `;
  },

  _openModal(nurse, clinicId) {
    const isEdit = !!nurse;
    Utils.openModal(`
      <div class="modal-header">
        <div class="modal-title">${isEdit ? '✏️ Hamshira tahrirlash' : '➕ Yangi hamshira'}</div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-4);">
        <div class="form-group">
          <label class="label">👩‍⚕️ To'liq ism</label>
          <input class="input" id="nurse-modal-name" value="${nurse?.name || ''}" placeholder="Hamshira F.I.O." />
        </div>
        <div class="form-group">
          <label class="label">💰 Oylik maosh (so'm)</label>
          <div class="input-prefix-wrap">
            <span class="input-prefix">so'm</span>
            <input class="input" type="number" id="nurse-modal-salary" value="${nurse?.baseSalary || 0}" placeholder="2500000" />
          </div>
          <div class="hint">Bu summa oy boshidan avanslari ayirilgandan keyin beriladi</div>
        </div>
        <div class="form-group">
          <label class="label">📞 Telefon (ixtiyoriy)</label>
          <input class="input" id="nurse-modal-phone" value="${nurse?.phone || ''}" placeholder="+998 90 000 00 00" />
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <label style="font-size:var(--text-sm);color:var(--text-secondary)">Faol holat</label>
          <div class="toggle-wrap" onclick="this.querySelector('.toggle').classList.toggle('on')">
            <div class="toggle ${nurse?.active !== false ? 'on' : ''}"></div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Bekor</button>
        <button class="btn btn-primary" onclick="AdminNurses.saveNurse('${clinicId}','${nurse?.id||''}')">
          ${Utils.icon('save', 14)} Saqlash
        </button>
      </div>
    `);
  },

  openAddModal(clinicId) { this._openModal(null, clinicId); },

  openEditModal(clinicId, nurseId) {
    const nurse = DB.getNurses(clinicId).find(n => n.id === nurseId);
    this._openModal(nurse, clinicId);
  },

  saveNurse(clinicId, existingId) {
    const name   = document.getElementById('nurse-modal-name')?.value?.trim();
    const salary = Utils.num(document.getElementById('nurse-modal-salary')?.value);
    const phone  = document.getElementById('nurse-modal-phone')?.value?.trim();
    const active = document.querySelector('#modal-overlay .toggle')?.classList.contains('on') ?? true;

    if (!name) { Utils.toast('error', 'Hamshira ismini kiriting'); return; }

    if (existingId) {
      const n = DB.getNurses(clinicId).find(x => x.id === existingId);
      if (n) {
        Object.assign(n, { name, baseSalary: salary, phone, active });
        DB.saveNurse(clinicId, n);
      }
    } else {
      const newNurse = { id: DB.generateId('nurse_'), name, baseSalary: salary, phone, active, createdAt: new Date().toISOString() };
      DB.saveNurse(clinicId, newNurse);
    }
    Utils.closeModal();
    Utils.toast('success', existingId ? 'Yangilandi' : 'Hamshira qo\'shildi');
    this.render();
  },

  toggleActive(clinicId, nurseId) {
    const n = DB.getNurses(clinicId).find(x => x.id === nurseId);
    if (n) {
      n.active = n.active === false ? true : false;
      DB.saveNurse(clinicId, n);
      this.render();
    }
  },

  viewHistory(clinicId, nurseId) {
    const nurse = DB.getNurses(clinicId).find(n => n.id === nurseId);
    if (!nurse) return;

    // Oxirgi 3 oy
    const now = Utils.getCurrentMonth();
    const months = [];
    for (let i = 0; i < 3; i++) {
      let m = now.month - i, y = now.year;
      if (m <= 0) { m += 12; y -= 1; }
      const reports = DB.getMonthlyReports(clinicId, y, m);
      let totalAvans = 0;
      const days = [];
      reports.forEach(r => {
        const av = Number(((r.nurses || {})[nurseId] || {}).avans) || 0;
        if (av) { totalAvans += av; days.push({ date: r.date, avans: av }); }
      });
      months.push({ label: Utils.getMonthName(m, y), totalAvans, salary: nurse.baseSalary || 0, days });
    }

    Utils.openModal(`
      <div class="modal-header">
        <div class="modal-title">📋 ${nurse.name} — Avans tarixi</div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-4);">
        ${months.map(mo => `
          <div style="border:1px solid var(--border-subtle);border-radius:var(--r-lg);overflow:hidden;">
            <div style="padding:var(--sp-3) var(--sp-4);background:var(--bg-elevated);display:flex;justify-content:space-between;align-items:center;">
              <strong>${mo.label}</strong>
              <div style="display:flex;gap:var(--sp-3);font-size:12px;">
                <span style="color:var(--brand-warning)">Avans: ${Utils.formatMoneyShort(mo.totalAvans)}</span>
                <span style="color:var(--brand-success)">Qolgan: ${Utils.formatMoneyShort(Math.max(0, mo.salary - mo.totalAvans))}</span>
              </div>
            </div>
            ${mo.days.length ? `
              <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead><tr><th style="padding:6px 12px;text-align:left;color:var(--text-muted)">Sana</th><th style="padding:6px 12px;text-align:right;color:var(--text-muted)">Avans</th></tr></thead>
                <tbody>
                  ${mo.days.map(d => `<tr>
                    <td style="padding:6px 12px">${Utils.formatDateShort(d.date)}</td>
                    <td style="padding:6px 12px;text-align:right;font-family:var(--font-mono);color:var(--brand-warning)">-${d.avans.toLocaleString('ru-RU').replace(/,/g,' ')}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            ` : '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:12px">Bu oy avans yo\'q</div>'}
          </div>
        `).join('')}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Yopish</button>
      </div>
    `, { size: 'lg' });
  },

  async deleteNurse(clinicId, nurseId, name) {
    const ok = await Utils.confirm(`"${name}" ni o'chirishni tasdiqlaysizmi?`, 'Hamshira o\'chirish');
    if (!ok) return;
    DB.deleteNurse(clinicId, nurseId);
    Utils.toast('success', 'O\'chirildi');
    this.render();
  }
};
