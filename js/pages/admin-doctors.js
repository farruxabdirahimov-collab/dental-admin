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

        <!-- Formula qo'llanma -->
        <div class="card">
          <div class="card-header"><div class="card-title">${Utils.icon('formula', 18)} Hisoblash formulasi</div></div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-4);">
            ${[
              { label: 'JTS', color: '#22d3ee', desc: 'Jami Texnik Summasi', formula: '∑ (kunlik texnik xarajat)' },
              { label: 'JIS', color: '#a855f7', desc: 'Jami Implant Summasi', formula: 'implant_soni × narx_per_ta' },
              { label: 'VU',  color: '#10b981', desc: 'Vrach Ulushi',         formula: '(Tushum − JTS) × foiz% + JIS' },
              { label: 'JVB', color: '#6366f1', desc: 'Vrachga Beriladi',     formula: 'VU + JTS − Avanslar' },
            ].map(f => `
              <div style="padding:var(--sp-3);border:1px solid ${f.color}33;border-radius:var(--r-md);background:${f.color}0d;">
                <div style="font-size:13px;font-weight:800;color:${f.color};margin-bottom:4px">${f.label}</div>
                <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">${f.desc}</div>
                <div style="font-size:11px;font-family:var(--font-mono);color:var(--text-muted)">${f.formula}</div>
              </div>
            `).join('')}
          </div>
        </div>

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
            <div style="font-family:var(--font-mono);font-size:1.3em;font-weight:800;color:var(--brand-primary)">${doc.percent || 35}%</div>
          </div>
          <div style="padding:var(--sp-3);background:var(--bg-elevated);border-radius:var(--r-md);border:1px solid var(--border-subtle);">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Implant</div>
            <div style="font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;color:#a855f7">${implantLabel}</div>
          </div>
        </div>

        <!-- Tez o'zgartirish: foiz slider -->
        <div style="margin-top:var(--sp-3);">
          <label style="font-size:11px;color:var(--text-muted);">Foizni tez o'zgartirish: <span id="pct-label-${doc.id}">${doc.percent || 35}%</span></label>
          <input type="range" min="10" max="60" step="1" value="${doc.percent || 35}"
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
              <input class="input" type="number" min="1" max="100" id="doc-modal-percent" value="${doc?.percent || 35}" />
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
  }
};
