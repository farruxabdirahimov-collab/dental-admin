/**
 * DentAdmin — Shared UI Components
 */

const Components = {
  // ========== LAYOUT ==========
  renderLayout(session, activeNav, contentHtml) {
    const clinic = session.clinicId ? DB.getClinicById(session.clinicId) : null;
    const isAdmin = session.role === 'admin' || session.role === 'super_admin';
    const isSuper = session.role === 'super_admin';

    const adminNavItems = [
      { path: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
      { path: '/admin/monthly', icon: 'chart', label: 'Oylik hisobot' },
      { path: '/admin/yearly', icon: 'trend', label: 'Yillik tahlil' },
      { path: '/admin/salary', icon: 'money', label: 'Vrachlar ish haqi' },
      { divider: true, label: 'SOZLAMALAR' },
      { path: '/admin/doctors', icon: 'users', label: 'Vrachlar' },
      { path: '/admin/nurses', icon: 'nurse', label: 'Hamshiralar' },
      { path: '/admin/settings', icon: 'settings', label: 'Klinika sozlamalari' },
    ];

    const superNavItems = [
      { path: '/super/clinics', icon: 'building', label: 'Filiallar' },
      { path: '/super/users', icon: 'users', label: 'Foydalanuvchilar' },
    ];

    const receptionNavItems = [
      { path: '/reception/daily', icon: 'calendar', label: 'Kunlik hisobot' },
      { path: '/reception/history', icon: 'history', label: 'Kunlar tarixi' },
    ];

    let navItems = isSuper ? superNavItems : (isAdmin ? adminNavItems : receptionNavItems);
    if (isAdmin && !isSuper) {
      navItems = [...adminNavItems, { divider: true, label: 'QABULXONA' },
        { path: '/reception/daily', icon: 'calendar', label: 'Kunlik kiritish' },
        { path: '/reception/history', icon: 'history', label: 'Kunlar tarixi' },
      ];
    }

    const navHtml = navItems.map(item => {
      if (item.divider) {
        return `<div class="nav-section-label">${item.label}</div>`;
      }
      const isActive = activeNav === item.path;
      return `
        <div class="nav-item ${isActive ? 'active' : ''}" onclick="Router.go('${item.path}')" data-path="${item.path}">
          <span class="nav-icon">${Utils.icon(item.icon)}</span>
          <span>${item.label}</span>
        </div>
      `;
    }).join('');

    const initials = Utils.getInitials(session.fullName);
    const roleLabel = Auth.getRoleLabel(session.role).replace(/^[^\s]+\s/, '');

    return `
      <div class="app-layout">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-logo">
            <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="10" fill="url(#slg)"/>
              <path d="M14 24C14 18.477 18.477 14 24 14C29.523 14 34 18.477 34 24" stroke="white" stroke-width="3" stroke-linecap="round"/>
              <circle cx="24" cy="30" r="6" fill="white" fill-opacity="0.9"/>
              <circle cx="24" cy="30" r="3" fill="url(#slg)"/>
              <defs><linearGradient id="slg" x1="0" y1="0" x2="48" y2="48"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
            </svg>
            <div class="sidebar-logo-text">
              <div class="sidebar-logo-name">DentAdmin</div>
              <div class="sidebar-logo-clinic">${clinic ? clinic.name : 'Super Admin'}</div>
            </div>
          </div>
          <nav class="sidebar-nav">${navHtml}</nav>
          <div class="sidebar-bottom">
            <div class="user-card">
              <div class="user-avatar">${initials}</div>
              <div class="user-info">
                <div class="user-name">${session.fullName}</div>
                <div class="user-role">${roleLabel}</div>
              </div>
              <button class="logout-btn" onclick="Auth.logout()" title="Chiqish">
                ${Utils.icon('logout', 14)}
              </button>
            </div>
          </div>
        </aside>
        <main class="main-content">${contentHtml}</main>
      </div>
    `;
  },

  renderPageHeader(title, subtitle, actionsHtml = '') {
    return `
      <div class="page-header">
        <div class="page-title-wrap">
          <h1 class="page-title">${title}</h1>
          ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
        </div>
        <div class="page-actions">${actionsHtml}</div>
      </div>
    `;
  },

  // ========== DOCTOR MODAL ==========
  openDoctorModal(doctor, clinicId, onSave) {
    const isEdit = !!doctor;
    const d = doctor || {
      id: DB.generateId('dr_'),
      name: '',
      percent: 35,
      formula: '(tushum - texnik) * percent / 100 + implant_count * implant_value',
      implantMode: 'fixed',
      implantValue: 300000,
      active: true,
      color: '#6366f1'
    };

    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#84cc16', '#f97316'];
    const colorSwatches = colors.map(c => `
      <div class="color-swatch ${d.color === c ? 'selected' : ''}"
           style="background: ${c};"
           onclick="this.closest('.color-options').querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('selected'));this.classList.add('selected');document.getElementById('doctor-color').value='${c}'">
      </div>
    `).join('');

    const presets = FormulaEngine.getPresetFormulas().map(p => `
      <button class="btn btn-ghost btn-sm" type="button"
        onclick="document.getElementById('doctor-formula').value='${p.formula}';Components.updateFormulaPreview()">
        ${p.name}
      </button>
    `).join('');

    const vars = FormulaEngine.getAvailableVars().map(v => `
      <span class="formula-var" onclick="Utils.insertAtCursor('doctor-formula','${v.key}')" title="${v.desc}">{${v.key}}</span>
    `).join('');

    Utils.openModal(`
      <div class="modal-header">
        <div>
          <div class="modal-title">${isEdit ? '✏️ Vrach tahrirlash' : '➕ Yangi vrach qo\'shish'}</div>
          <div class="modal-sub">Formula va foizni sozlang</div>
        </div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--sp-5);">
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="label">Vrach ismi *</label>
            <input class="input" id="doctor-name" placeholder="Dr. Ism Familiya" value="${d.name}" />
          </div>
          <div class="form-group">
            <label class="label">Foiz (%) *</label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">%</span>
              <input class="input" id="doctor-percent" type="number" min="0" max="100" step="0.5" value="${d.percent}" />
            </div>
          </div>
        </div>

        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="label">Implant hisoblash usuli</label>
            <select class="select" id="doctor-implant-mode" onchange="document.getElementById('implant-value-wrap').style.display=this.value==='fixed'?'':'none'">
              <option value="fixed" ${d.implantMode === 'fixed' ? 'selected' : ''}>Aniq summa (har bir implant)</option>
              <option value="percent" ${d.implantMode === 'percent' ? 'selected' : ''}>Implant summasidan foiz</option>
            </select>
          </div>
          <div class="form-group" id="implant-value-wrap" style="display:${d.implantMode === 'percent' ? 'none' : ''}">
            <label class="label">Bir implant qiymati (so'm)</label>
            <input class="input" id="doctor-implant-value" type="number" value="${d.implantValue}" placeholder="300000" />
          </div>
        </div>

        <div class="form-group">
          <label class="label">Rang (avatar uchun)</label>
          <div class="color-options">${colorSwatches}</div>
          <input type="hidden" id="doctor-color" value="${d.color}" />
        </div>

        <div class="form-group">
          <label class="label">VU Formulasi</label>
          <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-2);">${presets}</div>
          <textarea class="textarea" id="doctor-formula" rows="2"
            oninput="Components.updateFormulaPreview()"
            style="font-family:var(--font-mono);font-size:var(--text-sm);">${d.formula}</textarea>
          <div style="margin-top:var(--sp-2);">
            <div class="hint">O'zgaruvchilarni qo'shish uchun bosing:</div>
            <div class="formula-vars">${vars}</div>
          </div>
          <div id="formula-preview" class="formula-result" style="margin-top:var(--sp-3);display:none;">
            <span class="formula-result-label">Namuna hisob:</span>
            <span class="formula-result-val" id="formula-preview-val">—</span>
          </div>
        </div>

        <div class="form-group">
          <label class="label">Holat</label>
          <div class="toggle-wrap" onclick="this.querySelector('.toggle').classList.toggle('on');document.getElementById('doctor-active').value=this.querySelector('.toggle').classList.contains('on')?'1':'0'">
            <div class="toggle ${d.active !== false ? 'on' : ''}"></div>
            <span class="toggle-label">Faol vrach</span>
          </div>
          <input type="hidden" id="doctor-active" value="${d.active !== false ? '1' : '0'}" />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Bekor</button>
        <button class="btn btn-primary" onclick="Components.saveDoctor('${clinicId}', '${d.id}', ${isEdit})">
          ${Utils.icon('save', 14)} Saqlash
        </button>
      </div>
    `, { size: 'modal-lg' });

    // Preview boshlash
    setTimeout(() => this.updateFormulaPreview(), 100);
  },

  updateFormulaPreview() {
    const formula = document.getElementById('doctor-formula')?.value;
    const percent = parseFloat(document.getElementById('doctor-percent')?.value) || 35;
    const implantValue = parseFloat(document.getElementById('doctor-implant-value')?.value) || 300000;
    if (!formula) return;

    const result = FormulaEngine.testFormula(formula, { percent, implant_value: implantValue });
    const preview = document.getElementById('formula-preview');
    const previewVal = document.getElementById('formula-preview-val');
    if (preview && previewVal) {
      preview.style.display = 'flex';
      if (result.ok) {
        previewVal.textContent = Utils.formatMoney(result.result);
        previewVal.style.color = 'var(--brand-success)';
      } else {
        previewVal.textContent = '❌ Xato formula';
        previewVal.style.color = 'var(--brand-danger)';
      }
    }
  },

  saveDoctor(clinicId, doctorId, isEdit) {
    const name = document.getElementById('doctor-name')?.value?.trim();
    const percent = parseFloat(document.getElementById('doctor-percent')?.value) || 0;
    const implantMode = document.getElementById('doctor-implant-mode')?.value;
    const implantValue = parseFloat(document.getElementById('doctor-implant-value')?.value) || 0;
    const formula = document.getElementById('doctor-formula')?.value?.trim();
    const color = document.getElementById('doctor-color')?.value || '#6366f1';
    const active = document.getElementById('doctor-active')?.value === '1';

    if (!name) { Utils.toast('error', 'Xato', 'Vrach ismi kiritilishi shart'); return; }
    if (!formula) { Utils.toast('error', 'Xato', 'Formula kiritilishi shart'); return; }

    const doctor = {
      id: doctorId,
      name,
      percent,
      formula,
      implantMode,
      implantValue,
      color,
      active,
      updatedAt: new Date().toISOString(),
      createdAt: isEdit ? undefined : new Date().toISOString()
    };

    DB.saveDoctor(clinicId, doctor);
    Utils.closeModal();
    Utils.toast('success', 'Saqlandi', `${name} ma\'lumotlari yangilandi`);

    // Sahifani yangilash
    if (window.AdminDoctors) AdminDoctors.render();
  },

  // ========== NURSE MODAL ==========
  openNurseModal(nurse, clinicId) {
    const isEdit = !!nurse;
    const n = nurse || {
      id: DB.generateId('nurse_'),
      name: '',
      baseSalary: 0,
      active: true
    };

    Utils.openModal(`
      <div class="modal-header">
        <div>
          <div class="modal-title">${isEdit ? '✏️ Hamshira tahrirlash' : '➕ Yangi hamshira'}</div>
        </div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-5);">
        <div class="form-group">
          <label class="label">Hamshira ismi *</label>
          <input class="input" id="nurse-name" placeholder="Ism Familiya" value="${n.name}" />
        </div>
        <div class="form-group">
          <label class="label">Oylik maosh (so'm)</label>
          <div class="input-prefix-wrap">
            <span class="input-prefix">so'm</span>
            <input class="input" id="nurse-salary" type="number" value="${n.baseSalary}" placeholder="2000000" />
          </div>
        </div>
        <div class="form-group">
          <label class="label">Holat</label>
          <div class="toggle-wrap" onclick="this.querySelector('.toggle').classList.toggle('on');document.getElementById('nurse-active').value=this.querySelector('.toggle').classList.contains('on')?'1':'0'">
            <div class="toggle ${n.active !== false ? 'on' : ''}"></div>
            <span class="toggle-label">Faol hamshira</span>
          </div>
          <input type="hidden" id="nurse-active" value="${n.active !== false ? '1' : '0'}" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Bekor</button>
        <button class="btn btn-primary" onclick="Components.saveNurse('${clinicId}','${n.id}',${isEdit})">
          ${Utils.icon('save', 14)} Saqlash
        </button>
      </div>
    `);
  },

  saveNurse(clinicId, nurseId, isEdit) {
    const name = document.getElementById('nurse-name')?.value?.trim();
    const salary = parseFloat(document.getElementById('nurse-salary')?.value) || 0;
    const active = document.getElementById('nurse-active')?.value === '1';

    if (!name) { Utils.toast('error', 'Xato', 'Hamshira ismi kiritilishi shart'); return; }

    DB.saveNurse(clinicId, { id: nurseId, name, baseSalary: salary, active });
    Utils.closeModal();
    Utils.toast('success', 'Saqlandi');
    if (window.AdminNurses) AdminNurses.render();
  },

  // Cursor pozitsiyasiga text qo'shish
  insertAtCursor(inputId, text) {
    const el = document.getElementById(inputId);
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    el.setSelectionRange(start + text.length, start + text.length);
    el.focus();
    el.dispatchEvent(new Event('input'));
  }
};

// Textarea uchun insertAtCursor yordam
Utils.insertAtCursor = Components.insertAtCursor;
