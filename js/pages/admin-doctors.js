/**
 * Admin Doctors Management — To'liq tahrirlash imkoniyati
 * - Ism, foiz, implant summa va rejim
 * - Faol/Nofaol toggle
 * - Rang tanlash
 */

const AdminDoctors = {
  render() {
    const session = Auth.requireAuth(['admin', 'super_admin']);
    if (!session) return;
    const clinicId = session.clinicId;
    const doctors = DB.getDoctors(clinicId);

    const content = `
      ${Components.renderPageHeader(
        '👨‍⚕️ Vrachlar sozlamalari',
        `Jami ${doctors.filter(d => d.active !== false).length} ta faol vrach`,
        `<button class="btn btn-primary" onclick="AdminDoctors.openAddDoctor('${clinicId}')">
          ${Utils.icon('plus', 14)} Yangi vrach
        </button>`
      )}
      <div class="page-body" style="display:flex;flex-direction:column;gap:var(--sp-5);">

        <!-- Vrachlar kartochkalari -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--sp-4);" id="doctors-grid">
          ${doctors.map(doc => this._renderDoctorCard(doc, clinicId)).join('')}
          ${!doctors.length ? `<div class="empty-state"><div class="empty-icon">👨‍⚕️</div><div class="empty-title">Vrachlar yo'q</div></div>` : ''}
        </div>

        <!-- FORMULA BUILDER -->
        ${this._renderFormulaBuilder(clinicId)}

      </div>
    `;

    document.getElementById('app').innerHTML = Components.renderLayout(session, '/admin/doctors', content);
  },

  _renderDoctorCard(doc, clinicId) {
    const isActive = doc.active !== false;
    const implantLabel = doc.implantMode === 'percent'
      ? `${doc.implantValue || 0}% (foiz)`
      : `${Utils.formatMoneyShort(doc.implantValue || 300000)}/ta`;

    return `
      <div class="card" style="border:2px solid ${isActive ? 'rgba(99,102,241,0.2)' : 'rgba(127,127,127,0.15)'};opacity:${isActive ? 1 : 0.65};transition:all 0.2s;">
        <!-- Avatar + nom -->
        <div style="display:flex;align-items:center;gap:var(--sp-3);margin-bottom:var(--sp-4);">
          <div class="doctor-avatar" style="background:${doc.color || 'var(--grad-brand)'};width:48px;height:48px;font-size:16px;flex-shrink:0;">
            ${Utils.getInitials(doc.name)}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:var(--text-md);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${doc.name}</div>
            <div style="display:flex;gap:var(--sp-2);margin-top:4px;flex-wrap:wrap;">
              <span class="badge ${isActive ? 'badge-success' : 'badge-neutral'}">${isActive ? '✓ Faol' : '✗ Nofaol'}</span>
            </div>
          </div>
          <div style="display:flex;gap:var(--sp-2);">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="AdminDoctors.openEditDoctor('${clinicId}','${doc.id}')" title="Tahrirlash">
              ${Utils.icon('edit', 14)}
            </button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="AdminDoctors.deleteDoctor('${clinicId}','${doc.id}','${doc.name}')" title="O'chirish">
              ${Utils.icon('trash', 14)}
            </button>
          </div>
        </div>

        <!-- Parametrlar -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);">
          <div style="padding:var(--sp-3);background:var(--bg-elevated);border-radius:var(--r-md);border:1px solid var(--border-subtle);">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Tushum foizi</div>
            <div style="font-family:var(--font-mono);font-size:1.3em;font-weight:800;color:var(--brand-primary)">${doc.percent ?? 35}%</div>
          </div>
          <div style="padding:var(--sp-3);background:var(--bg-elevated);border-radius:var(--r-md);border:1px solid var(--border-subtle);">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Implant</div>
            <div style="font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;color:#a855f7">${implantLabel}</div>
          </div>
        </div>

        <!-- Tez o'zgartirish: foiz slider -->
        <div style="margin-top:var(--sp-3);">
          <label style="font-size:11px;color:var(--text-muted);">Foizni tez o'zgartirish: <span id="pct-label-${doc.id}">${doc.percent ?? 35}%</span></label>
          <input type="range" min="0" max="60" step="1" value="${doc.percent ?? 35}"
            style="width:100%;margin-top:4px;accent-color:var(--brand-primary)"
            oninput="document.getElementById('pct-label-${doc.id}').textContent=this.value+'%'"
            onchange="AdminDoctors.quickUpdatePercent('${clinicId}','${doc.id}',this.value)" />
        </div>

        <!-- Faol toggle -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--sp-3);padding-top:var(--sp-3);border-top:1px solid var(--border-subtle);">
          <span style="font-size:var(--text-sm);color:var(--text-secondary)">Faollik holati</span>
          <div class="toggle-wrap" onclick="AdminDoctors.toggleActive('${clinicId}','${doc.id}')">
            <div class="toggle ${isActive ? 'on' : ''}"></div>
          </div>
        </div>
      </div>
    `;
  },

  quickUpdatePercent(clinicId, docId, val) {
    const doc = DB.getDoctors(clinicId).find(d => d.id === docId);
    if (!doc) return;
    doc.percent = Number(val);
    DB.saveDoctor(clinicId, doc);
    Utils.toast('success', `${doc.name}: foiz ${val}%ga o'zgartirildi`, '', 1500);
  },

  toggleActive(clinicId, docId) {
    const doc = DB.getDoctors(clinicId).find(d => d.id === docId);
    if (!doc) return;
    doc.active = doc.active === false ? true : false;
    DB.saveDoctor(clinicId, doc);
    this.render();
  },

  openAddDoctor(clinicId) {
    this._openDoctorModal(null, clinicId);
  },

  openEditDoctor(clinicId, docId) {
    const doc = DB.getDoctors(clinicId).find(d => d.id === docId);
    this._openDoctorModal(doc, clinicId);
  },

  _openDoctorModal(doc, clinicId) {
    const isEdit = !!doc;
    const colors = ['var(--grad-brand)', 'linear-gradient(135deg,#ec4899,#f472b6)', 'linear-gradient(135deg,#06b6d4,#67e8f9)', 'linear-gradient(135deg,#f59e0b,#fbbf24)', 'linear-gradient(135deg,#10b981,#6ee7b7)', 'linear-gradient(135deg,#8b5cf6,#a78bfa)'];

    Utils.openModal(`
      <div class="modal-header">
        <div class="modal-title">${isEdit ? '✏️ Vrach tahrirlash' : '➕ Yangi vrach'}</div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--sp-4);">

        <div class="form-group">
          <label class="label">👤 To'liq ism</label>
          <input class="input" id="doc-modal-name" value="${doc?.name || ''}" placeholder="Dr. Familiya Ism" />
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);">
          <div class="form-group">
            <label class="label">📊 Tushum foizi (%)</label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">%</span>
              <input class="input" type="number" min="0" max="100" id="doc-modal-percent" value="${doc?.percent ?? 35}" />
            </div>
          </div>
          <div class="form-group">
            <label class="label">🦷 Implant rejimi</label>
            <select class="select" id="doc-modal-implant-mode" onchange="AdminDoctors._updateImplantMode()">
              <option value="fixed" ${(doc?.implantMode||'fixed') === 'fixed' ? 'selected' : ''}>Aniq summa (so'm)</option>
              <option value="percent" ${doc?.implantMode === 'percent' ? 'selected' : ''}>Foiz (%)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="label" id="implant-val-label">
            ${doc?.implantMode === 'percent' ? '🦷 Implant foizi (%)' : '🦷 Implant narxi (so\'m/ta)'}
          </label>
          <div class="input-prefix-wrap">
            <span class="input-prefix" id="implant-val-prefix">${doc?.implantMode === 'percent' ? '%' : 'so\'m'}</span>
            <input class="input" type="number" id="doc-modal-implant-val" value="${doc?.implantValue || 300000}" />
          </div>
          <div class="hint">Masalam: 300 000 so'm har bir implant uchun</div>
        </div>

        <div class="form-group">
          <label class="label">🎨 Rang</label>
          <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;" id="color-picker">
            ${colors.map((c, i) => `
              <div onclick="document.querySelectorAll('#color-picker .color-opt').forEach(x=>x.classList.remove('selected'));this.classList.add('selected');document.getElementById('doc-modal-color').value='${c}'"
                class="color-opt ${(doc?.color||colors[0])===c?'selected':''}"
                style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;border:2px solid ${(doc?.color||colors[0])===c?'white':'transparent'};outline:${(doc?.color||colors[0])===c?'2px solid var(--brand-primary)':'none'};transition:all 0.15s;">
              </div>
            `).join('')}
          </div>
          <input type="hidden" id="doc-modal-color" value="${doc?.color || colors[0]}" />
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;">
          <label style="font-size:var(--text-sm);color:var(--text-secondary)">Faol holat</label>
          <div class="toggle-wrap" onclick="this.querySelector('.toggle').classList.toggle('on')">
            <div class="toggle ${doc?.active !== false ? 'on' : ''}"></div>
          </div>
        </div>

        <!-- Formula builder -->
        <div style="border:1px solid var(--border-subtle);border-radius:var(--r-md);padding:var(--sp-4);background:var(--bg-secondary)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--sp-3)">
            <span style="font-size:16px">📐</span>
            <div style="font-weight:600;font-size:var(--text-sm)">VU Formula quruvchi</div>
            <span class="badge badge-neutral" style="font-size:10px">Vrach ulushi hisoblash</span>
          </div>

          <!-- Preset formulalar -->
          <div style="margin-bottom:var(--sp-3)">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Tayyor formulalar:</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${FormulaEngine.getPresetFormulas().map(p => `
                <button class="btn btn-ghost btn-sm" style="font-size:11px;border:1px solid var(--border-subtle)"
                  title="${p.desc.replace(/'/g,"&apos;")}"
                  onclick="AdminDoctors._setFormula('${p.formula.replace(/'/g,'\\&apos;')}')"> 
                  ${p.name}
                </button>`).join('')}
            </div>
          </div>

          <!-- O'zgaruvchilar -->
          <div style="margin-bottom:var(--sp-2)">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:6px">O'zgaruvchilar (bosing → formulaga qo'shiladi):</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${FormulaEngine.getAvailableVars().map(v => `
                <button class="btn btn-sm" style="font-size:11px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);color:var(--brand-primary)"
                  title="${v.desc.replace(/'/g,"&apos;")}"
                  onclick="AdminDoctors._insertToken(' ${v.key} ')">${v.label}</button>`).join('')}
            </div>
          </div>

          <!-- Amallar -->
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:var(--sp-3);flex-wrap:wrap">
            <div style="font-size:10px;color:var(--text-muted);margin-right:2px">Amallar:</div>
            ${['+', '-', '*', '/', '(', ')', '100', '0.5', '0.3'].map(op => `
              <button class="btn btn-ghost btn-sm" style="font-family:var(--font-mono);font-size:13px;padding:3px 9px;border:1px solid var(--border-subtle)"
                onclick="AdminDoctors._insertToken('${op}')">${op}</button>`).join('')}
          </div>

          <!-- Formula input + preview -->
          <div class="form-group" style="margin-bottom:0">
            <label class="label" style="display:flex;justify-content:space-between">
              <span>Formula (tahrirlash mumkin)</span>
              <button class="btn btn-ghost" style="font-size:10px;padding:2px 8px" onclick="AdminDoctors._clearFormula()">🗑️ Tozalash</button>
            </label>
            <textarea class="input" id="doc-modal-formula" rows="2"
              style="font-family:var(--font-mono);font-size:12px;resize:vertical"
              placeholder="(tushum - texnik) * percent / 100 + implant_count * implant_value"
              oninput="AdminDoctors._previewFormula()">${doc?.formula || '(tushum - texnik) * percent / 100 + implant_count * implant_value'}</textarea>
            <div id="formula-preview" style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:11px">
              <span style="color:var(--text-muted)">Misol (800k tushum, 100k texnik):</span>
              <span id="formula-preview-val" style="font-weight:700">Hisoblanmoqda...</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Bekor</button>
        <button class="btn btn-primary" onclick="AdminDoctors.saveDoctor('${clinicId}','${doc?.id||''}')">
          ${Utils.icon('save', 14)} Saqlash
        </button>
      </div>
    `, { size: 'lg' });

    // Preview boshlash
    setTimeout(() => AdminDoctors._previewFormula(), 100);
  },

  _updateImplantMode() {
    const mode = document.getElementById('doc-modal-implant-mode')?.value;
    const label = document.getElementById('implant-val-label');
    const prefix = document.getElementById('implant-val-prefix');
    if (label) label.textContent = mode === 'percent' ? '🦷 Implant foizi (%)' : '🦷 Implant narxi (so\'m/ta)';
    if (prefix) prefix.textContent = mode === 'percent' ? '%' : 'so\'m';
  },

  _insertToken(text) {
    const ta = document.getElementById('doc-modal-formula');
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.substring(0, s) + text + ta.value.substring(e);
    ta.selectionStart = ta.selectionEnd = s + text.length;
    ta.focus();
    this._previewFormula();
  },

  _setFormula(formula) {
    const ta = document.getElementById('doc-modal-formula');
    if (ta) { ta.value = formula; this._previewFormula(); }
  },

  _clearFormula() {
    const ta = document.getElementById('doc-modal-formula');
    if (ta) { ta.value = ''; ta.focus(); this._previewFormula(); }
  },

  _previewFormula() {
    const formula  = document.getElementById('doc-modal-formula')?.value || '';
    const percent  = Utils.num(document.getElementById('doc-modal-percent')?.value) || 35;
    const impVal   = Utils.num(document.getElementById('doc-modal-implant-val')?.value) || 300000;
    const result   = FormulaEngine.testFormula(formula, { percent, implant_value: impVal });
    const el       = document.getElementById('formula-preview-val');
    if (el) {
      el.innerHTML = result.ok
        ? `<span style="color:var(--brand-success)">✅ ${Utils.formatMoneyFull(result.result)}</span>`
        : `<span style="color:var(--brand-danger)">❌ Formula xato!</span>`;
    }
  },

  saveDoctor(clinicId, existingId) {
    const name    = document.getElementById('doc-modal-name')?.value?.trim();
    const percent = Utils.num(document.getElementById('doc-modal-percent')?.value) || 35;
    const mode    = document.getElementById('doc-modal-implant-mode')?.value || 'fixed';
    const impVal  = Utils.num(document.getElementById('doc-modal-implant-val')?.value) || 300000;
    const color   = document.getElementById('doc-modal-color')?.value || 'var(--grad-brand)';
    const active  = document.querySelector('#modal-overlay .toggle')?.classList.contains('on') ?? true;
    const formula = document.getElementById('doc-modal-formula')?.value?.trim()
                    || '(tushum - texnik) * percent / 100 + implant_count * implant_value';

    if (!name) { Utils.toast('error', 'Vrach ismini kiriting'); return; }

    if (existingId) {
      const doc = DB.getDoctors(clinicId).find(d => d.id === existingId);
      if (doc) {
        Object.assign(doc, { name, percent, implantMode: mode, implantValue: impVal, color, active, formula });
        DB.saveDoctor(clinicId, doc);
      }
    } else {
      const newDoc = {
        id: DB.generateId('doc_'),
        name, percent,
        implantMode: mode,
        implantValue: impVal,
        formula,
        color, active,
        createdAt: new Date().toISOString()
      };
      DB.saveDoctor(clinicId, newDoc);
    }
    Utils.closeModal();
    Utils.toast('success', existingId ? 'Vrach yangilandi' : 'Vrach qo\'shildi');
    this.render();
  },

  async deleteDoctor(clinicId, docId, name) {
    const ok = await Utils.confirm(`"${name}" ni o'chirishni tasdiqlaysizmi?`, 'Vrach o\'chirish');
    if (!ok) return;
    DB.deleteDoctor(clinicId, docId);
    Utils.toast('success', 'O\'chirildi');
    this.render();
  },

  // ================================================================
  // 📐 FORMULA BUILDER — Vizual formula quriluvchi
  // ================================================================

  // Formula builder ichki holati
  _formulaTokens: [],  // Joriy yig'ilayotgan formula tokenlari
  _editingFormulaId: null, // Tahrirlanayotgan formula ID
  _editMode: 'visual', // 'visual' yoki 'text'

  /**
   * Klinika uchun saqlangan formulalarni olish
   */
  _getClinicFormulas(clinicId) {
    const settings = DB.getSettings(clinicId);
    return settings.salaryFormulas || [
      {
        id: 'vu_default',
        name: 'VU (Vrach Ulushi)',
        description: 'Oylik uchun',
        formula: '(tushum - texnik) * percent / 100 + implant_count * implant_value',
        isDefault: true,
        createdAt: new Date().toISOString()
      }
    ];
  },

  /**
   * Formula tokenlarini string ga aylantirish
   */
  _tokensToFormula(tokens) {
    return tokens.map(t => t.value).join(' ');
  },

  /**
   * Formula string ni tokenlarga aylantirish (parse)
   */
  _formulaToTokens(formulaStr) {
    if (!formulaStr) return [];
    const vars = FormulaEngine.getAvailableVars();
    const varKeys = vars.map(v => v.key);
    // Sort by length descending to match longer keys first
    const sortedKeys = [...varKeys].sort((a, b) => b.length - a.length);

    const tokens = [];
    let str = formulaStr.trim();

    while (str.length > 0) {
      str = str.trimStart();
      if (!str.length) break;

      // Check for variable
      let matched = false;
      for (const key of sortedKeys) {
        if (str.startsWith(key) && (str.length === key.length || /[^a-z_]/.test(str[key.length]))) {
          const varInfo = vars.find(v => v.key === key);
          tokens.push({ type: 'var', value: key, label: varInfo?.label || key });
          str = str.slice(key.length);
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // Check for operator
      if ('+-*/'.includes(str[0])) {
        tokens.push({ type: 'operator', value: str[0] });
        str = str.slice(1);
        continue;
      }

      // Check for parentheses
      if ('()'.includes(str[0])) {
        tokens.push({ type: 'paren', value: str[0] });
        str = str.slice(1);
        continue;
      }

      // Check for number
      const numMatch = str.match(/^(\d+\.?\d*)/);
      if (numMatch) {
        tokens.push({ type: 'number', value: numMatch[1] });
        str = str.slice(numMatch[1].length);
        continue;
      }

      // Skip unknown character
      str = str.slice(1);
    }

    return tokens;
  },

  /**
   * Token chiplarini HTML ga render qilish
   */
  _renderChipsHTML(tokens) {
    if (!tokens.length) {
      return '<span class="formula-bar-placeholder">👆 Quyidagi tugmalardan bosib formulani yig\'ing...</span>';
    }
    return tokens.map((t, i) => {
      let cls = '', label = '';
      switch (t.type) {
        case 'var':
          cls = 'chip-var';
          label = t.label || t.value;
          break;
        case 'operator':
          cls = 'chip-operator';
          label = t.value;
          break;
        case 'number':
          cls = 'chip-number';
          label = t.value;
          break;
        case 'paren':
          cls = 'chip-paren';
          label = t.value;
          break;
      }
      return `<span class="formula-chip ${cls}" data-idx="${i}">
        ${label}
        <span class="chip-remove" onclick="event.stopPropagation();AdminDoctors._removeToken(${i})">✕</span>
      </span>`;
    }).join('');
  },

  /**
   * Formula builder bo'limini render qilish
   */
  _renderFormulaBuilder(clinicId) {
    const formulas = this._getClinicFormulas(clinicId);
    const vars = FormulaEngine.getAvailableVars();
    const presets = FormulaEngine.getPresetFormulas();

    // Agar tokenlar bo'sh bo'lsa va formulalar mavjud bo'lsa, birinchisini yuklash
    if (!this._formulaTokens.length && formulas.length > 0 && !this._editingFormulaId) {
      this._formulaTokens = this._formulaToTokens(formulas[0].formula);
      this._editingFormulaId = formulas[0].id;
    }

    const currentFormula = this._tokensToFormula(this._formulaTokens);
    const previewResult = FormulaEngine.testFormula(currentFormula, {});

    return `
      <div class="formula-builder">
        <div class="formula-builder-header">
          <div class="formula-builder-title">
            <span style="font-size:22px">📐</span>
            <span>Hisoblash formulasi</span>
            <span class="badge badge-neutral" style="font-size:10px">Oylik uchun</span>
          </div>
          <div style="display:flex;gap:var(--sp-2)">
            <button class="btn btn-secondary btn-sm" onclick="AdminDoctors._toggleEditMode()">
              ${this._editMode === 'visual' ? '✏️ Matn rejimi' : '🧩 Vizual rejim'}
            </button>
            <button class="btn btn-primary btn-sm" onclick="AdminDoctors._openNewFormulaModal('${clinicId}')">
              ${Utils.icon('plus', 14)} Yangi formula
            </button>
            ${Auth.getSession()?.role === 'super_admin' ? `
              <button class="btn btn-sm" style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);color:#f59e0b;font-weight:600" 
                onclick="AdminDoctors._broadcastFormulasToAll('${clinicId}')">
                🌐 Barcha klinikalarga tarqatish
              </button>
            ` : ''}
          </div>
        </div>

        <div class="formula-builder-body">
          <!-- Saqlangan formulalar ro'yxati -->
          <div class="formula-list" id="formula-list">
            ${formulas.map((f, i) => `
              <div class="formula-list-item ${this._editingFormulaId === f.id ? 'style="border-color:rgba(99,102,241,0.5);background:rgba(99,102,241,0.04)"' : ''}"
                id="formula-item-${f.id}">
                <div style="display:flex;flex-direction:column;gap:4px;min-width:0;flex:1">
                  <div style="display:flex;align-items:center;gap:var(--sp-2)">
                    <span class="formula-name">${f.name}</span>
                    ${f.isDefault ? '<span class="badge badge-success" style="font-size:9px">standart</span>' : ''}
                    ${f.description ? `<span style="font-size:11px;color:var(--text-muted)">${f.description}</span>` : ''}
                  </div>
                  <div class="formula-raw-text" style="padding:6px 10px;font-size:12px">
                    ${this._renderFormulaExprChips(f.formula)}
                  </div>
                </div>
                <div class="formula-actions">
                  <button class="btn btn-secondary btn-sm btn-icon" onclick="AdminDoctors._loadFormulaToBuilder('${clinicId}','${f.id}')" title="Tahrirlash">
                    ${Utils.icon('edit', 14)}
                  </button>
                  <button class="btn btn-primary btn-sm" onclick="AdminDoctors._applyFormulaToAll('${clinicId}','${f.id}')" title="Barcha vrachlarga qo'llash">
                    🔄 Qo'llash
                  </button>
                  ${!f.isDefault ? `
                    <button class="btn btn-danger btn-sm btn-icon" onclick="AdminDoctors._deleteClinicFormula('${clinicId}','${f.id}')" title="O'chirish">
                      ${Utils.icon('trash', 14)}
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
            ${!formulas.length ? '<div style="color:var(--text-muted);font-size:var(--text-sm);padding:var(--sp-4);text-align:center">Hali formula qo\'shilmagan</div>' : ''}
          </div>

          <!-- Formulani yig'ish zonasi -->
          <div style="border:1px solid rgba(99,102,241,0.2);border-radius:var(--r-lg);padding:var(--sp-4);background:rgba(99,102,241,0.02)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-3)">
              <div style="font-size:var(--text-sm);font-weight:700;color:var(--text-primary)">
                🧮 ${this._editingFormulaId ? 'Formulani tahrirlash' : 'Yangi formula quriluvchi'}
              </div>
              <div style="display:flex;gap:var(--sp-2)">
                <button class="btn btn-ghost btn-sm" style="font-size:11px" onclick="AdminDoctors._undoLastToken()">↩ Ortga</button>
                <button class="btn btn-ghost btn-sm" style="font-size:11px;color:var(--brand-danger)" onclick="AdminDoctors._clearAllTokens()">🗑️ Tozalash</button>
              </div>
            </div>

            <!-- VU = [...] formulani ko'rsatish satri -->
            <div style="display:flex;align-items:flex-start;gap:var(--sp-3);margin-bottom:var(--sp-4)">
              <div style="background:rgba(16,185,129,0.15);color:#10b981;font-weight:800;font-size:16px;padding:8px 14px;border-radius:8px;font-family:var(--font-mono);flex-shrink:0;border:1px solid rgba(16,185,129,0.3)">VU =</div>
              ${this._editMode === 'visual' ? `
                <div class="formula-bar" id="formula-bar" onclick="document.getElementById('formula-bar')?.focus()">
                  ${this._renderChipsHTML(this._formulaTokens)}
                </div>
              ` : `
                <textarea class="formula-textarea-edit" id="formula-text-edit"
                  oninput="AdminDoctors._onTextFormulaInput()"
                  placeholder="(tushum - texnik) * percent / 100 + implant_count * implant_value">${currentFormula}</textarea>
              `}
            </div>

            ${this._editMode === 'visual' ? `
              <!-- O'zgaruvchilar (kataklar) -->
              <div class="formula-token-group">
                <div class="formula-token-group-label">📊 O'zgaruvchilar (kataklar) — bosing, formulaga qo'shiladi</div>
                <div class="formula-token-buttons">
                  ${vars.map(v => `
                    <button class="formula-token-btn token-var" onclick="AdminDoctors._addToken('var','${v.key}','${v.label}')" title="${v.desc}">
                      ${v.label}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Amallar (ishoralar) -->
              <div style="display:flex;gap:var(--sp-5);flex-wrap:wrap">
                <div class="formula-token-group">
                  <div class="formula-token-group-label">⚡ Amallar (ishoralar)</div>
                  <div class="formula-token-buttons">
                    ${[
                      { op: '+', title: 'Qo\'shish' },
                      { op: '-', title: 'Ayirish' },
                      { op: '*', title: 'Ko\'paytirish' },
                      { op: '/', title: 'Bo\'lish' },
                    ].map(o => `
                      <button class="formula-token-btn token-op" onclick="AdminDoctors._addToken('operator','${o.op}')" title="${o.title}">
                        ${o.op}
                      </button>
                    `).join('')}
                  </div>
                </div>

                <div class="formula-token-group">
                  <div class="formula-token-group-label">🔗 Qavslar</div>
                  <div class="formula-token-buttons">
                    <button class="formula-token-btn token-paren" onclick="AdminDoctors._addToken('paren','(')" title="Ochiq qavs">(</button>
                    <button class="formula-token-btn token-paren" onclick="AdminDoctors._addToken('paren',')')" title="Yopiq qavs">)</button>
                  </div>
                </div>

                <div class="formula-token-group">
                  <div class="formula-token-group-label">🔢 Raqamlar</div>
                  <div class="formula-token-buttons">
                    ${['100', '0.5', '0.3', '0.2', '0.1'].map(n => `
                      <button class="formula-token-btn token-num" onclick="AdminDoctors._addToken('number','${n}')">${n}</button>
                    `).join('')}
                    <div style="display:flex;align-items:center;gap:4px">
                      <input class="formula-num-input" id="custom-num-input" type="number" step="any" placeholder="raqam..." />
                      <button class="formula-token-btn token-num" onclick="AdminDoctors._addCustomNumber()" style="font-size:11px;padding:6px 10px">
                        ➕ Qo'sh
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tayyor shablonlar -->
              <div class="formula-token-group">
                <div class="formula-token-group-label">📋 Tayyor shablonlar (bosing — formula o'rnini bosadi)</div>
                <div class="formula-token-buttons">
                  ${presets.map(p => `
                    <button class="formula-token-btn token-var" style="background:rgba(139,92,246,0.1);border-color:rgba(139,92,246,0.25);color:#8b5cf6"
                      onclick="AdminDoctors._loadPresetFormula('${p.formula.replace(/'/g, "\\'")}')" title="${p.desc.replace(/'/g, "\\'")}">
                      📋 ${p.name}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Real-time preview -->
            <div id="formula-preview-area">
              ${this._renderFormulaPreview(currentFormula)}
            </div>

            <!-- Saqlash tugmasi -->
            <div style="display:flex;gap:var(--sp-3);justify-content:flex-end;padding-top:var(--sp-3);border-top:1px solid var(--border-subtle)">
              ${this._editingFormulaId ? `
                <button class="btn btn-secondary" onclick="AdminDoctors._cancelFormulaEdit()">Bekor</button>
                <button class="btn btn-primary" onclick="AdminDoctors._saveClinicFormula('${clinicId}')">
                  ${Utils.icon('save', 14)} Formulani saqlash
                </button>
              ` : `
                <button class="btn btn-primary" onclick="AdminDoctors._openNewFormulaModal('${clinicId}')">
                  ${Utils.icon('save', 14)} Yangi formula sifatida saqlash
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Formula ifodalarini mini chiplar sifatida ko'rsatish (ro'yxat uchun)
   */
  _renderFormulaExprChips(formulaStr) {
    const tokens = this._formulaToTokens(formulaStr);
    return tokens.map(t => {
      const colors = {
        var: 'color:#818cf8',
        operator: 'color:#fbbf24;font-weight:800',
        number: 'color:#6ee7b7',
        paren: 'color:#f472b6;font-weight:800'
      };
      return `<span style="${colors[t.type] || ''};font-family:var(--font-mono)">${t.label || t.value}</span>`;
    }).join(' ');
  },

  /**
   * Formula preview panelini render qilish
   */
  _renderFormulaPreview(formulaStr) {
    if (!formulaStr) {
      return '<div class="formula-preview-panel"><div class="formula-preview-icon error">❓</div><div class="formula-preview-info"><div class="formula-preview-label">Formula bo\'sh</div><div class="formula-preview-value" style="color:var(--text-muted)">Formulani yig\'ing</div></div></div>';
    }
    const result = FormulaEngine.testFormula(formulaStr, {});
    if (result.ok) {
      return `
        <div class="formula-preview-panel">
          <div class="formula-preview-icon success">✅</div>
          <div class="formula-preview-info">
            <div class="formula-preview-label">Misol: tushum=1,000,000 | texnik=200,000 | implant=2ta | foiz=35%</div>
            <div class="formula-preview-value" style="color:var(--brand-success)">${Utils.formatMoney(result.result)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;color:var(--text-muted)">Formula matni</div>
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);max-width:200px;word-break:break-all">${formulaStr}</div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="formula-preview-panel" style="border-color:rgba(239,68,68,0.3)">
          <div class="formula-preview-icon error">❌</div>
          <div class="formula-preview-info">
            <div class="formula-preview-label">Formula xatosi</div>
            <div class="formula-preview-value" style="color:var(--brand-danger)">Formulani tekshiring!</div>
          </div>
        </div>
      `;
    }
  },

  // ── TOKEN BOSHQARUVI ──────────────────────────────────────

  _addToken(type, value, label) {
    this._formulaTokens.push({ type, value, label: label || value });
    this._updateFormulaBar();
  },

  _removeToken(idx) {
    this._formulaTokens.splice(idx, 1);
    this._updateFormulaBar();
  },

  _undoLastToken() {
    if (this._formulaTokens.length > 0) {
      this._formulaTokens.pop();
      this._updateFormulaBar();
    }
  },

  _clearAllTokens() {
    this._formulaTokens = [];
    this._updateFormulaBar();
  },

  _addCustomNumber() {
    const input = document.getElementById('custom-num-input');
    const val = input?.value?.trim();
    if (!val || isNaN(Number(val))) {
      Utils.toast('error', 'Raqam kiriting');
      return;
    }
    this._addToken('number', val);
    input.value = '';
  },

  _loadPresetFormula(formulaStr) {
    this._formulaTokens = this._formulaToTokens(formulaStr);
    this._updateFormulaBar();
  },

  _toggleEditMode() {
    this._editMode = this._editMode === 'visual' ? 'text' : 'visual';
    // Agar text rejimga o'tayotgan bo'lsa — tokenlarni textga, va aksincha
    if (this._editMode === 'visual') {
      const textarea = document.getElementById('formula-text-edit');
      if (textarea) {
        this._formulaTokens = this._formulaToTokens(textarea.value);
      }
    }
    // Sahifani qayta render
    const session = Auth.requireAuth(['admin', 'super_admin']);
    if (session) this.render();
  },

  _onTextFormulaInput() {
    const textarea = document.getElementById('formula-text-edit');
    if (textarea) {
      const formula = textarea.value;
      const previewArea = document.getElementById('formula-preview-area');
      if (previewArea) {
        previewArea.innerHTML = this._renderFormulaPreview(formula);
      }
      // Tokenlarni yangilash (visual ga qaytganda ishlatiladi)
      this._formulaTokens = this._formulaToTokens(formula);
    }
  },

  /**
   * Formula bar va preview ni yangilash
   */
  _updateFormulaBar() {
    const bar = document.getElementById('formula-bar');
    if (bar) {
      bar.innerHTML = this._renderChipsHTML(this._formulaTokens);
    }
    const formula = this._tokensToFormula(this._formulaTokens);
    const previewArea = document.getElementById('formula-preview-area');
    if (previewArea) {
      previewArea.innerHTML = this._renderFormulaPreview(formula);
    }
  },

  // ── KLINIKA FORMULALARI BOSHQARUVI ─────────────────────────

  _loadFormulaToBuilder(clinicId, formulaId) {
    const formulas = this._getClinicFormulas(clinicId);
    const formula = formulas.find(f => f.id === formulaId);
    if (!formula) return;
    this._formulaTokens = this._formulaToTokens(formula.formula);
    this._editingFormulaId = formulaId;
    this.render();
    Utils.toast('info', `"${formula.name}" formulasi yuklandi`);
  },

  _openNewFormulaModal(clinicId) {
    const currentFormula = this._tokensToFormula(this._formulaTokens);
    Utils.openModal(`
      <div class="modal-header">
        <div class="modal-title">📐 Yangi formula saqlash</div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
        <div class="form-group">
          <label class="label">Formula nomi *</label>
          <input class="input" id="new-formula-name" placeholder="masalan: Oylik uchun, VU, Ikkinchi variant..." />
        </div>
        <div class="form-group">
          <label class="label">Tavsif (ixtiyoriy)</label>
          <input class="input" id="new-formula-desc" placeholder="Qisqacha izoh" />
        </div>
        <div class="form-group">
          <label class="label">Formula</label>
          <textarea class="formula-textarea-edit" id="new-formula-expr"
            placeholder="(tushum - texnik) * percent / 100 + implant_count * implant_value">${currentFormula}</textarea>
          <div class="hint" style="margin-top:4px">Vizual quriluvchida yig'gan formula avtomatik qo'yildi. Kerak bo'lsa tahrirlang.</div>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer">
            <input type="checkbox" id="new-formula-default" />
            <span style="font-size:var(--text-sm)">Standart formula qilish (yangi vrachlarga avtomatik qo'llanadi)</span>
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Bekor</button>
        <button class="btn btn-primary" onclick="AdminDoctors._saveNewFormula('${clinicId}')">
          ${Utils.icon('save', 14)} Saqlash
        </button>
      </div>
    `);
  },

  _saveNewFormula(clinicId) {
    const name = document.getElementById('new-formula-name')?.value?.trim();
    const desc = document.getElementById('new-formula-desc')?.value?.trim();
    const formula = document.getElementById('new-formula-expr')?.value?.trim();
    const isDefault = document.getElementById('new-formula-default')?.checked || false;

    if (!name) { Utils.toast('error', 'Formula nomini kiriting'); return; }
    if (!formula) { Utils.toast('error', 'Formulani kiriting'); return; }

    // Formulani tekshirish
    const test = FormulaEngine.testFormula(formula, {});
    if (!test.ok) { Utils.toast('error', 'Formula xato! Tekshiring.'); return; }

    const formulas = this._getClinicFormulas(clinicId);

    // Agar default qilinsa, boshqalarni default dan olib tashlash
    if (isDefault) {
      formulas.forEach(f => f.isDefault = false);
    }

    formulas.push({
      id: DB.generateId('frm_'),
      name,
      description: desc || '',
      formula,
      isDefault,
      createdAt: new Date().toISOString()
    });

    DB.updateSettings(clinicId, { salaryFormulas: formulas });

    Utils.closeModal();
    Utils.toast('success', `"${name}" formulasi saqlandi`);

    // Tokenlarni yangi formula bilan yangilash
    this._formulaTokens = this._formulaToTokens(formula);
    this._editingFormulaId = formulas[formulas.length - 1].id;
    this.render();
  },

  _saveClinicFormula(clinicId) {
    if (!this._editingFormulaId) return;

    const formula = this._tokensToFormula(this._formulaTokens);
    if (!formula) { Utils.toast('error', 'Formula bo\'sh!'); return; }

    const test = FormulaEngine.testFormula(formula, {});
    if (!test.ok) { Utils.toast('error', 'Formula xato! Tekshiring.'); return; }

    const formulas = this._getClinicFormulas(clinicId);
    const idx = formulas.findIndex(f => f.id === this._editingFormulaId);
    if (idx >= 0) {
      formulas[idx].formula = formula;
      formulas[idx].updatedAt = new Date().toISOString();
      DB.updateSettings(clinicId, { salaryFormulas: formulas });
      Utils.toast('success', `"${formulas[idx].name}" formulasi yangilandi`);
      this.render();
    }
  },

  _cancelFormulaEdit() {
    this._formulaTokens = [];
    this._editingFormulaId = null;
    this.render();
  },

  async _deleteClinicFormula(clinicId, formulaId) {
    const ok = await Utils.confirm('Bu formulani o\'chirishni tasdiqlaysizmi?', 'Formula o\'chirish');
    if (!ok) return;

    const formulas = this._getClinicFormulas(clinicId);
    const filtered = formulas.filter(f => f.id !== formulaId);
    DB.updateSettings(clinicId, { salaryFormulas: filtered });

    if (this._editingFormulaId === formulaId) {
      this._editingFormulaId = null;
      this._formulaTokens = [];
    }

    Utils.toast('success', 'Formula o\'chirildi');
    this.render();
  },

  async _applyFormulaToAll(clinicId, formulaId) {
    const formulas = this._getClinicFormulas(clinicId);
    const formula = formulas.find(f => f.id === formulaId);
    if (!formula) return;

    const doctors = DB.getDoctors(clinicId);
    const ok = await Utils.confirm(
      `"${formula.name}" formulasini barcha ${doctors.length} ta vrachga qo'llashni tasdiqlaysizmi?\n\nFormula: ${formula.formula}`,
      'Barcha vrachlarga qo\'llash'
    );
    if (!ok) return;

    for (const doc of doctors) {
      doc.formula = formula.formula;
      DB.saveDoctor(clinicId, doc);
    }
    Utils.toast('success', `${doctors.length} ta vrachga "${formula.name}" formulasi qo'llandi`);
    this.render();
  },

  /**
   * Barcha klinikalarga formulalarni tarqatish (super_admin)
   */
  async _broadcastFormulasToAll(clinicId) {
    const formulas = this._getClinicFormulas(clinicId);
    if (!formulas.length) {
      Utils.toast('error', 'Avval formula yarating');
      return;
    }

    const ok = await Utils.confirm(
      `Bu klinikadagi ${formulas.length} ta formulani BARCHA klinikalarga tarqatishni tasdiqlaysizmi?\n\nFormulalar:\n${formulas.map(f => `• ${f.name}: ${f.formula}`).join('\n')}`,
      '🌐 Barcha klinikalarga tarqatish'
    );
    if (!ok) return;

    try {
      const result = await API.post('/super/broadcast-settings', { salaryFormulas: formulas });
      Utils.toast('success', result.message || 'Barcha klinikalarga tarqatildi');
    } catch (err) {
      Utils.toast('error', 'Xatolik: ' + (err.message || 'Tarqatish amalga oshmadi'));
    }
  }
};
