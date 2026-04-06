/**
 * Reception Daily Report — Qayta ishlangan (yangi mantiq)
 *
 * MANTIQ:
 * - Barcha vrachlar tushumi yig'indisi = Umumiy tushum (= Umumiy naqt pul dastlab)
 * - Naqt pul (kassadagi) = Umumiy tushum - Terminal - QR - Inkassa - Prechesleniya - P2P
 * - Umumiy avans = Barcha doctor avanslari yig'indisi
 * - Berilishi kerak = Jami tushum - Jami avans - Jami xarajat - Inkassa - Terminal - Prechesleniya - P2P
 */

const ReceptionDaily = {
  currentDate: null,
  report: null,
  clinicId: null,
  doctors: [],
  nurses: [],
  paymentTypes: [],       // faqat naqt bo'lmagan turlar
  expenseCategories: [],
  settings: {},
  customFields: [],       // target=doctor bo'lgan qo'shimcha maydonlar

  // Naqt bo'lmagan to'lov turlari (kassadan ayiriladi)
  NON_CASH_IDS: ['terminal', 'qr', 'inkassa', 'prechesleniya', 'p2p'],

  async render(params = {}) {
    const session = Auth.requireAuth(['admin', 'receptionist', 'super_admin']);
    if (!session) return;

    this.clinicId = session.clinicId;
    this.currentDate = params.date || Utils.getTodayStr();
    this.report = (await DB.getDailyReport(this.clinicId, this.currentDate)) || this._emptyReport();
    this.doctors = DB.getDoctors(this.clinicId);
    this.nurses = DB.getNurses(this.clinicId);
    // Faqat naqt bo'lmagan to'lov turlari (naqd pul avtomatik hisoblanadi)
    this.paymentTypes = DB.getPaymentTypes(this.clinicId).filter(p => p.active && p.id !== 'naqd');
    this.expenseCategories = DB.getExpenseCategories(this.clinicId);
    this.settings = DB.getSettings(this.clinicId);
    // Vrach satrlari uchun qo'shimcha maydonlar
    this.customFields = DB.getCustomFields(this.clinicId).filter(f => f.target === 'doctor');

    const content = `
      ${Components.renderPageHeader(
        '📋 Kunlik hisobot',
        `Sana: ${Utils.formatDate(this.currentDate)}`,
        `<div class="date-nav">
          <button class="date-nav-btn" onclick="ReceptionDaily.prevDay()">${Utils.icon('chevron_left')}</button>
          <input type="date" id="report-date-input" value="${this.currentDate}"
            style="background:none;border:none;color:var(--text-primary);font-family:var(--font-base);font-size:var(--text-sm);font-weight:600;outline:none;cursor:pointer;"
            onchange="ReceptionDaily.goToDate(this.value)" />
          <button class="date-nav-btn" onclick="ReceptionDaily.nextDay()">${Utils.icon('chevron_right')}</button>
        </div>
        <div style="display:flex;gap:var(--sp-2);align-items:center;">
          <button class="btn btn-success" onclick="ReceptionDaily.saveReport()">
            ${Utils.icon('save', 14)} Saqlash
          </button>
          ${this.report._closed
            ? `<span style="padding:6px 14px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:var(--r-md);font-size:12px;font-weight:700;color:var(--brand-success);">✅ Kun yopilgan</span>`
            : `<button class="btn btn-danger" onclick="ReceptionDaily.closeDayModal()" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:var(--brand-danger);">
                ⛔ Kun yopildi
              </button>`
          }
        </div>`
      )}

      <div class="page-body" style="display:grid;grid-template-columns:1fr 300px;gap:var(--sp-6);align-items:start;">
        <div class="daily-form">

          <!-- 1. VRACHLAR TUSHUMI (BIRINCHI) -->
          <div class="daily-section">
            <div class="daily-section-header">
              <div class="daily-section-icon">👨‍⚕️</div>
              <div>
                <div class="daily-section-title">Vrachlar tushumi</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">
                  Barcha vrachlar tushumi yig'indisi = Umumiy naqt pul tushum
                </div>
              </div>
              <div style="margin-left:auto;text-align:right">
                <div style="font-size:var(--text-xs);color:var(--text-muted)">Jami vrachlar tushumi</div>
                <div id="total-doctor-tushum" style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:800;color:var(--brand-primary)">0</div>
              </div>
            </div>
            <div class="daily-section-body">
              <div class="doctor-daily-list" id="doctors-daily-list">
                ${this.renderDoctorRows()}
              </div>
              <!-- Jami -->
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);margin-top:var(--sp-4);">
                <div style="padding:var(--sp-3) var(--sp-4);background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:var(--r-md);">
                  <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;">Umumiy tushum</div>
                  <div id="sum-tushum" style="font-family:var(--font-mono);font-weight:800;color:var(--brand-primary);font-size:var(--text-md)">0</div>
                </div>
                <div style="padding:var(--sp-3) var(--sp-4);background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:var(--r-md);">
                  <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;">Umumiy avans</div>
                  <div id="sum-avans" style="font-family:var(--font-mono);font-weight:800;color:var(--brand-warning);font-size:var(--text-md)">0</div>
                </div>
                <div style="padding:var(--sp-3) var(--sp-4);background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);border-radius:var(--r-md);">
                  <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;">Texnik jami</div>
                  <div id="sum-texnik" style="font-family:var(--font-mono);font-weight:700;color:#22d3ee;font-size:var(--text-md)">0</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. NAQT BO'LMAGAN TO'LOVLAR -->
          <div class="daily-section">
            <div class="daily-section-header">
              <div class="daily-section-icon">💳</div>
              <div>
                <div class="daily-section-title">Naqt bo'lmagan to'lovlar</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">
                  Bu summalar umumiy tushimdan ayirib kassadagi naqt pul hisoblanadi
                </div>
              </div>
            </div>
            <div class="daily-section-body">
              <div class="payment-grid" id="payments-grid">
                ${this.renderPaymentInputs()}
              </div>

              <!-- Kassadagi naqt pul — avtomatik -->
              <div style="margin-top:var(--sp-4);padding:var(--sp-4);background:rgba(16,185,129,0.06);border:2px solid rgba(16,185,129,0.25);border-radius:var(--r-lg);">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <div style="font-size:var(--text-sm);font-weight:700;color:var(--brand-success);">💵 Kassadagi naqt pul</div>
                    <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">
                      = Umumiy tushum − (Terminal + QR + Inkassa + ...)
                    </div>
                  </div>
                  <div id="kassa-naqd">0</div>
                </div>
              </div>

              <div style="margin-top:var(--sp-2);">
                <button class="btn btn-ghost btn-sm" onclick="ReceptionDaily.openAddPaymentType()">
                  ${Utils.icon('plus', 12)} To'lov turi qo'shish
                </button>
              </div>
            </div>
          </div>

          <!-- 3. HAMSHIRALAR -->
          <div class="daily-section">
            <div class="daily-section-header">
              <div class="daily-section-icon">👩‍⚕️</div>
              <div class="daily-section-title">Hamshiralar avans</div>
            </div>
            <div class="daily-section-body">
              <div class="nurse-rows" id="nurse-rows">
                ${this.renderNurseRows()}
              </div>
            </div>
          </div>

          <!-- 4. XARAJATLAR -->
          <div class="daily-section">
            <div class="daily-section-header">
              <div class="daily-section-icon">💸</div>
              <div class="daily-section-title">Xarajatlar</div>
              <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="ReceptionDaily.addExpense()">
                ${Utils.icon('plus', 12)} Qo'shish
              </button>
            </div>
            <div class="daily-section-body">
              <!-- So'nggi 10 kun eng ko'p ishlatilanlar -->
              <div id="expense-suggestions" style="margin-bottom:var(--sp-3)">
                ${this.renderExpenseQuickSuggestions()}
              </div>
              <div class="expense-list" id="expense-list">
                ${this.renderExpenses()}
              </div>
              ${!(this.report.expenses?.length) ? `
                <div class="empty-state" style="padding:var(--sp-5)" id="expense-empty">
                  <div class="empty-icon" style="font-size:28px">📋</div>
                  <div class="empty-title" style="font-size:var(--text-sm)">Xarajat yo'q</div>
                </div>` : ''}
            </div>
          </div>

          <!-- 5. IZOH -->
          <div class="daily-section">
            <div class="daily-section-header">
              <div class="daily-section-icon">📝</div>
              <div class="daily-section-title">Izoh</div>
            </div>
            <div class="daily-section-body">
              <textarea class="textarea" id="report-notes" placeholder="Kun haqida qo'shimcha ma'lumot..." rows="2">${this.report.notes || ''}</textarea>
            </div>
          </div>

        </div>

        <!-- SUMMARY PANELI (o'ng taraf) -->
        <div class="daily-summary" id="daily-summary">
          ${this.renderSummary()}
        </div>
      </div>
    `;

    document.getElementById('app').innerHTML = Components.renderLayout(session, '/reception/daily', content);
    setTimeout(() => this.updateTotals(), 100);
  },

  _emptyReport() {
    return {
      date: this.currentDate,
      payments: {},
      doctors: {},
      nurses: {},
      expenses: [],
      notes: '',
      createdAt: new Date().toISOString()
    };
  },

  // Faqat naqt bo'lmagan to'lov turlari
  renderPaymentInputs() {
    return this.paymentTypes.map(pt => `
      <div class="payment-item">
        <div class="payment-item-label">${pt.icon || ''} ${pt.name}</div>
        <div class="input-prefix-wrap">
          <span class="input-prefix" style="font-size:10px">so'm</span>
          <input class="input payment-input" type="number" min="0" step="1000"
            id="pay-${pt.id}"
            data-pt="${pt.id}"
            value="${(this.report.payments || {})[pt.id] || ''}"
            placeholder="0"
            oninput="ReceptionDaily.updateTotals()" />
        </div>
      </div>
    `).join('');
  },

  renderDoctorRows() {
    const implantLabel = this.settings.implantLabel || 'Implant';
    const showImplant  = this.settings.showImplant !== false;

    return this.doctors.map(doc => {
      const entry = (this.report.doctors || {})[doc.id] || {};
      const cfVals = entry.customFields || {};

      return `
        <div class="doctor-daily-card" id="doc-card-${doc.id}">
          <div class="doctor-daily-head" onclick="ReceptionDaily.toggleDoctor('${doc.id}')">
            <div class="doctor-avatar" style="width:32px;height:32px;font-size:12px;background:${doc.color || 'var(--grad-brand)'}">
              ${Utils.getInitials(doc.name)}
            </div>
            <span class="doctor-daily-name">${doc.name}</span>
            <span class="badge badge-neutral" style="font-size:10px">${doc.percent}%</span>
            <span class="doctor-daily-vu" id="tushum-badge-${doc.id}" style="color:var(--brand-primary)">
              ${entry.tushum ? Utils.formatMoneyShort(entry.tushum) : ''}
            </span>
            <span class="history-expand-icon" id="expand-${doc.id}">${Utils.icon('chevron_down')}</span>
          </div>
          <div class="doctor-daily-body" id="doc-body-${doc.id}" style="${entry.tushum || entry.texnik ? '' : 'display:none'}">
            <div class="doctor-daily-inputs">
              <div class="form-group">
                <label class="label">💰 Tushum</label>
                <div class="input-prefix-wrap">
                  <span class="input-prefix" style="font-size:10px">so'm</span>
                  <input class="input doctor-tushum" type="number" min="0" step="1000"
                    id="doc-tushum-${doc.id}"
                    value="${entry.tushum || ''}" placeholder="0"
                    oninput="ReceptionDaily.updateTotals()" />
                </div>
              </div>
              <div class="form-group">
                <label class="label">🔧 Texnik</label>
                <div class="input-prefix-wrap">
                  <span class="input-prefix" style="font-size:10px">so'm</span>
                  <input class="input" type="number" min="0" step="1000"
                    id="doc-texnik-${doc.id}"
                    value="${entry.texnik || ''}" placeholder="0"
                    oninput="ReceptionDaily.updateTotals()" />
                </div>
              </div>
              ${showImplant ? `
              <div class="form-group">
                <label class="label">🦷 ${implantLabel} soni</label>
                <input class="input" type="number" min="0"
                  id="doc-implant-count-${doc.id}"
                  value="${entry.implantCount || ''}" placeholder="0"
                  oninput="ReceptionDaily.updateTotals()" />
              </div>` : ''}
              <div class="form-group">
                <label class="label">💸 Avans oldi</label>
                <div class="input-prefix-wrap">
                  <span class="input-prefix" style="font-size:10px">so'm</span>
                  <input class="input" type="number" min="0" step="1000"
                    id="doc-avans-${doc.id}"
                    value="${entry.avans || ''}" placeholder="0"
                    oninput="ReceptionDaily.updateTotals()" />
                </div>
              </div>
              ${this.customFields.map(cf => `
              <div class="form-group">
                <label class="label" style="color:var(--brand-primary)">
                  ${cf.type === 'currency' ? '💳' : cf.type === 'number' ? '🔢' : '📝'} ${cf.name}
                </label>
                ${cf.type === 'currency' ? `
                  <div class="input-prefix-wrap">
                    <span class="input-prefix" style="font-size:10px">so'm</span>
                    <input class="input" type="number" min="0" step="1000"
                      id="doc-cf-${cf.id}-${doc.id}"
                      value="${cfVals[cf.id] || ''}" placeholder="0"
                      oninput="ReceptionDaily.updateTotals()" />
                  </div>` : cf.type === 'number' ? `
                  <input class="input" type="number" min="0"
                    id="doc-cf-${cf.id}-${doc.id}"
                    value="${cfVals[cf.id] || ''}" placeholder="0"
                    oninput="ReceptionDaily.updateTotals()" />` : `
                  <input class="input" type="text"
                    id="doc-cf-${cf.id}-${doc.id}"
                    value="${cfVals[cf.id] || ''}" placeholder="..." />`}
              </div>`).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('') || `<div class="empty-state"><div class="empty-title">Vrachlar yo'q</div></div>`;
  },

  renderNurseRows() {
    return this.nurses.map(nurse => {
      const entry = (this.report.nurses || {})[nurse.id] || {};
      return `
        <div class="nurse-row-card">
          <div class="nurse-name">👩‍⚕️ ${nurse.name}
            <span style="font-size:var(--text-xs);color:var(--text-muted);margin-left:var(--sp-2)">
              Oylik: ${Utils.formatMoneyShort(nurse.baseSalary)}
            </span>
          </div>
          <div class="form-group" style="margin:0;min-width:160px">
            <label class="label" style="font-size:10px">Avans (bugun)</label>
            <div class="input-prefix-wrap">
              <span class="input-prefix" style="font-size:10px">so'm</span>
              <input class="input nurse-avans-input" type="number" min="0" step="10000"
                id="nurse-avans-${nurse.id}"
                value="${entry.avans || ''}"
                placeholder="0" style="padding:var(--sp-2)"
                oninput="ReceptionDaily.updateTotals()" />
            </div>
          </div>
          <div class="form-group" style="margin:0;min-width:130px">
            <label class="label" style="font-size:10px">Izoh</label>
            <input class="input" type="text" id="nurse-comment-${nurse.id}"
              value="${entry.comment || ''}" placeholder="ixtiyoriy" style="padding:var(--sp-2)"/>
          </div>
        </div>
      `;
    }).join('') || `<div class="empty-state" style="padding:var(--sp-4)"><div class="empty-title">Hamshiralar yo'q</div></div>`;
  },

  renderExpenses() {
    if (!this.report.expenses?.length) return '';
    return this.report.expenses.map((exp, i) => `
      <div class="expense-item" id="expense-item-${i}">
        <div class="form-group" style="margin:0">
          <select class="select" id="exp-cat-${i}" style="padding:var(--sp-2)">
            ${this.expenseCategories.map(c => `<option value="${c.id}" ${exp.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            <option value="boshqa" ${!exp.categoryId || exp.categoryId === 'boshqa' ? 'selected' : ''}>Boshqa</option>
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <input class="input" type="text" id="exp-desc-${i}" value="${exp.description || ''}"
            placeholder="Tavsif" style="padding:var(--sp-2)" />
        </div>
        <div class="form-group" style="margin:0">
          <div class="input-prefix-wrap">
            <span class="input-prefix" style="font-size:10px">so'm</span>
            <input class="input" type="number" id="exp-amount-${i}" value="${exp.amount || ''}"
              min="0" step="1000" placeholder="0" style="padding:var(--sp-2)"
              oninput="ReceptionDaily.updateTotals()"/>
          </div>
        </div>
        <button class="btn btn-danger btn-sm btn-icon" onclick="ReceptionDaily.removeExpense(${i})">
          ${Utils.icon('trash', 14)}
        </button>
      </div>
    `).join('');
  },

  // ========== ASOSIY HISOBLASH ==========
  _calcTotals() {
    // 1. Vrachlar tushumi va avanslari
    let jami_tushum = 0, jami_avans = 0, jami_texnik = 0;
    this.doctors.forEach(doc => {
      jami_tushum += Utils.num(document.getElementById(`doc-tushum-${doc.id}`)?.value);
      jami_avans  += Utils.num(document.getElementById(`doc-avans-${doc.id}`)?.value);
      jami_texnik += Utils.num(document.getElementById(`doc-texnik-${doc.id}`)?.value);
    });

    // Hamshiralar avansi
    let hamshira_avans = 0;
    this.nurses.forEach(n => {
      hamshira_avans += Utils.num(document.getElementById(`nurse-avans-${n.id}`)?.value);
    });
    const umumiy_avans = jami_avans + hamshira_avans;

    // 2. Naqt bo'lmagan to'lovlar (hammasi)
    const nonCash = {};
    let nonCash_total = 0;
    this.paymentTypes.forEach(pt => {
      const val = Utils.num(document.getElementById(`pay-${pt.id}`)?.value);
      nonCash[pt.id] = val;
      nonCash_total += val;
    });

    // 3. Kassadagi naqt pul = Jami tushum - barcha naqt bo'lmagan to'lovlar
    const kassa_naqd = jami_tushum - nonCash_total;

    // 4. Xarajatlar
    let jami_xarajat = 0;
    (this.report.expenses || []).forEach((exp, i) => {
      jami_xarajat += Utils.num(document.getElementById(`exp-amount-${i}`)?.value);
    });

    // 5. BERILISHI KERAK = Kassadagi naqt pul − (Avans vrachlar + Avans hamshiralar + Xarajatlar)
    const berilishi_kerak = kassa_naqd - umumiy_avans - jami_xarajat;

    return {
      jami_tushum,
      jami_avans,
      hamshira_avans,
      umumiy_avans,
      jami_texnik,
      nonCash,
      nonCash_total,
      kassa_naqd,
      jami_xarajat,
      berilishi_kerak
    };
  },

  updateTotals() {
    const t = this._calcTotals();

    // Doktor tushum badge yangilash
    this.doctors.forEach(doc => {
      const val = Utils.num(document.getElementById(`doc-tushum-${doc.id}`)?.value);
      const badge = document.getElementById(`tushum-badge-${doc.id}`);
      if (badge) badge.textContent = val > 0 ? Utils.formatMoneyShort(val) : '';
    });

    // Yig'indi qatorlar
    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = Utils.formatMoneyFull(val);
    };

    setEl('total-doctor-tushum', t.jami_tushum);
    setEl('sum-tushum', t.jami_tushum);

    const avansEl = document.getElementById('sum-avans');
    if (avansEl) avansEl.innerHTML = Utils.formatMoneyFull(t.umumiy_avans);

    const texnikEl = document.getElementById('sum-texnik');
    if (texnikEl) texnikEl.innerHTML = Utils.formatMoneyFull(t.jami_texnik);

    // Kassadagi naqt pul
    const kassaEl = document.getElementById('kassa-naqd');
    if (kassaEl) {
      kassaEl.innerHTML = Utils.formatMoneyFull(t.kassa_naqd, t.kassa_naqd >= 0 ? 'var(--brand-success)' : 'var(--brand-danger)');
    }

    // Summary panel
    const summaryEl = document.getElementById('daily-summary');
    if (summaryEl) summaryEl.innerHTML = this.renderSummary(t);
  },

  renderSummary(t = null) {
    if (!t) t = this._calcTotals();

    // Naqt bo'lmagan to'lovlar (faqat kiritilganlari)
    const nonCashRows = this.paymentTypes.map(pt => {
      const val = t.nonCash[pt.id] || 0;
      return val > 0 ? `
        <div class="summary-row">
          <span class="summary-row-label" style="padding-left:var(--sp-3)">${pt.icon || ''} ${pt.name}</span>
          <span class="summary-row-val" style="color:var(--brand-danger);font-family:var(--font-mono)">${Utils.formatMoneyShort(val)}</span>
        </div>
      ` : '';
    }).join('');

    // Dual format helper (kichik ko'rsatkich uchun)
    const dualSmall = (val, color = 'var(--text-primary)') => {
      const n = Number(val) || 0;
      const exact = n.toLocaleString('ru-RU').replace(/,/g, ' ');
      return `<div style="text-align:right">
        <div style="font-family:var(--font-mono);font-weight:700;color:${color}">${Utils.formatMoneyShort(n)}</div>
        <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">${exact}</div>
      </div>`;
    };

    return `
      <div class="summary-title">📊 Kun xulosasi</div>

      <!-- JAMI TUSHUM -->
      <div class="summary-row" style="align-items:flex-start;">
        <span class="summary-row-label" style="font-weight:700;padding-top:2px">💰 Jami tushum</span>
        ${dualSmall(t.jami_tushum, 'var(--brand-primary)')}
      </div>

      ${nonCashRows ? `
        <div style="font-size:10px;color:var(--text-muted);margin:var(--sp-2) 0 2px;padding-left:2px;">Naqt bo'lmagan to'lovlar:</div>
        ${nonCashRows}
      ` : ''}

      <!-- KASSADAGI NAQT PUL -->
      <div style="padding:var(--sp-3) var(--sp-4);background:rgba(16,185,129,0.06);border:2px solid rgba(16,185,129,0.22);border-radius:var(--r-lg);margin:var(--sp-3) 0;">
        <div style="font-size:10px;font-weight:700;color:var(--brand-success);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">
          💵 Kassadagi naqt pul
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;">
          <div style="font-size:10px;color:var(--text-muted);">= Tushum − naqtsizlar</div>
          ${dualSmall(t.kassa_naqd, t.kassa_naqd >= 0 ? 'var(--brand-success)' : 'var(--brand-danger)')}
        </div>
      </div>

      <!-- AYIRMALAR -->
      <div style="display:flex;flex-direction:column;gap:var(--sp-2);">
        <div class="summary-row" style="align-items:flex-start;">
          <span class="summary-row-label">💸 Avans (vrachlar)</span>
          ${dualSmall(t.jami_avans, 'var(--brand-warning)')}
        </div>
        <div class="summary-row" style="align-items:flex-start;">
          <span class="summary-row-label">💸 Avans (hamshiralar)</span>
          ${dualSmall(t.hamshira_avans, 'var(--brand-warning)')}
        </div>
        <div class="summary-row" style="align-items:flex-start;">
          <span class="summary-row-label">📋 Xarajatlar</span>
          ${dualSmall(t.jami_xarajat, 'var(--brand-danger)')}
        </div>
      </div>

      <!-- BERILISHI KERAK — ENG MUHIM -->
      <div style="margin-top:var(--sp-3);padding:var(--sp-4);
        background:${t.berilishi_kerak >= 0 ? 'rgba(99,102,241,0.1)' : 'rgba(239,68,68,0.1)'};
        border:2px solid ${t.berilishi_kerak >= 0 ? 'rgba(99,102,241,0.4)' : 'rgba(239,68,68,0.4)'};
        border-radius:var(--r-lg);">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:var(--sp-2);">
          📌 Berilishi kerak
        </div>
        <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:var(--sp-3);line-height:1.5;">
          Kassa − avans − xarajat
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
          <div style="font-family:var(--font-mono);font-size:1.7em;font-weight:900;
            color:${t.berilishi_kerak >= 0 ? 'var(--brand-primary)' : 'var(--brand-danger)'};">
            ${Utils.formatMoneyShort(Math.abs(t.berilishi_kerak))}${t.berilishi_kerak < 0 ? ' ⚠️' : ''}
          </div>
          <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);">
            ${Math.abs(t.berilishi_kerak).toLocaleString('ru-RU').replace(/,/g, ' ')} so'm
          </div>
        </div>
        ${t.berilishi_kerak < 0 ? '<div style="font-size:11px;color:var(--brand-danger);margin-top:var(--sp-2);">Avans/xarajat kassadan oshib ketdi!</div>' : ''}
      </div>

      <!-- Qo'shimcha ma'lumot -->
      <div class="divider" style="margin:var(--sp-4) 0"></div>
      <div class="summary-row" style="align-items:flex-start;">
        <span class="summary-row-label" style="font-size:11px">🔧 Texnik jami</span>
        ${dualSmall(t.jami_texnik)}
      </div>
      <div class="summary-row" style="margin-top:var(--sp-1)">
        <span class="summary-row-label" style="font-size:11px">💳 Naqtsizlar jami</span>
        <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">${Utils.formatMoneyShort(t.nonCash_total)}</span>
      </div>
    `;
  },

  // ========== QOLGAN FUNKSIYALAR ==========

  toggleDoctor(docId) {
    const body = document.getElementById(`doc-body-${docId}`);
    const icon = document.getElementById(`expand-${docId}`);
    if (!body) return;
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : '';
    if (icon) icon.className = `history-expand-icon ${!isOpen ? 'open' : ''}`;
  },

  // DOM dan joriy expense qiymatlarni o'qib report.expenses ni yangilash
  _syncExpensesFromDOM() {
    if (!this.report.expenses) return;
    this.report.expenses = this.report.expenses.map((exp, i) => ({
      ...exp,
      categoryId: document.getElementById(`exp-cat-${i}`)?.value || exp.categoryId,
      description: document.getElementById(`exp-desc-${i}`)?.value ?? exp.description,
      amount: Utils.num(document.getElementById(`exp-amount-${i}`)?.value) || exp.amount
    }));
  },

  addExpense() {
    // Avval DOM dagi qiymatlarni saqlab ol
    this._syncExpensesFromDOM();
    if (!this.report.expenses) this.report.expenses = [];
    this.report.expenses.push({ categoryId: '', description: '', amount: 0 });
    const expList = document.getElementById('expense-list');
    if (expList) expList.innerHTML = this.renderExpenses();
    // Bo'sh state yashirish
    const emptyEl = document.getElementById('expense-empty');
    if (emptyEl) emptyEl.style.display = 'none';
    this.updateTotals();
    // So'nggi qo'shilgan satriga fokus
    const lastIdx = this.report.expenses.length - 1;
    setTimeout(() => document.getElementById(`exp-desc-${lastIdx}`)?.focus(), 50);
  },

  removeExpense(idx) {
    // Avval DOM dan o'qi
    this._syncExpensesFromDOM();
    if (!this.report.expenses) return;
    this.report.expenses.splice(idx, 1);
    const expList = document.getElementById('expense-list');
    if (expList) expList.innerHTML = this.renderExpenses();
    this.updateTotals();
  },

  // So'nggi 10 kun eng ko'p ishlatilanlar
  renderExpenseQuickSuggestions() {
    const today = new Date();
    const suggestions = {};

    for (let i = 1; i <= 10; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const r = DB.getDailyReport(this.clinicId, dateStr);
      if (!r) continue;
      (r.expenses || []).forEach(exp => {
        if (!exp.description) return;
        const key = exp.description.toLowerCase().trim();
        if (!suggestions[key]) suggestions[key] = { description: exp.description, categoryId: exp.category || exp.categoryId || '', count: 0, lastAmt: 0 };
        suggestions[key].count++;
        suggestions[key].lastAmt = exp.amount;
      });
    }

    const top = Object.values(suggestions).sort((a, b) => b.count - a.count).slice(0, 6);
    if (!top.length) return '';

    return `
      <div style="margin-bottom:var(--sp-2);">
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:var(--sp-2);text-transform:uppercase;letter-spacing:0.05em;">⚡ So'nggi 10 kun eng ko'p</div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);">
          ${top.map(s => `
            <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 10px;border:1px solid var(--border-subtle);"
              onclick="ReceptionDaily.addQuickExpense(${JSON.stringify(s).replace(/"/g,'&quot;')})"
              title="${s.count} marta · so'nggi: ${Utils.formatMoneyShort(s.lastAmt)}">
              ${s.description} <span style="color:var(--text-muted);margin-left:3px">${s.count}×</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  addQuickExpense(suggestion) {
    this._syncExpensesFromDOM();
    if (!this.report.expenses) this.report.expenses = [];
    this.report.expenses.push({
      categoryId: suggestion.categoryId || '',
      description: suggestion.description,
      amount: suggestion.lastAmt || 0
    });
    const expList = document.getElementById('expense-list');
    if (expList) expList.innerHTML = this.renderExpenses();
    const emptyEl = document.getElementById('expense-empty');
    if (emptyEl) emptyEl.style.display = 'none';
    this.updateTotals();
  },

  async saveReport() {
    // To'lovlar (naqt bo'lmagan)
    const payments = {};
    this.paymentTypes.forEach(pt => {
      const val = Utils.num(document.getElementById(`pay-${pt.id}`)?.value);
      if (val) payments[pt.id] = val;
    });

    // Vrachlar
    const doctors = {};
    this.doctors.forEach(doc => {
      const tushum = Utils.num(document.getElementById(`doc-tushum-${doc.id}`)?.value);
      const texnik = Utils.num(document.getElementById(`doc-texnik-${doc.id}`)?.value);
      const implantCount = Utils.num(document.getElementById(`doc-implant-count-${doc.id}`)?.value);
      const avans = Utils.num(document.getElementById(`doc-avans-${doc.id}`)?.value);
      // Qo'shimcha maydonlar
      const customFields = {};
      this.customFields.forEach(cf => {
        const el = document.getElementById(`doc-cf-${cf.id}-${doc.id}`);
        if (el) {
          const val = cf.type === 'text' ? el.value : Utils.num(el.value);
          if (val) customFields[cf.id] = val;
        }
      });
      if (tushum || texnik || implantCount || avans || Object.keys(customFields).length) {
        doctors[doc.id] = { tushum, texnik, implantCount, avans, customFields };
      }
    });

    // Hamshiralar
    const nurses = {};
    this.nurses.forEach(nurse => {
      const avans = Utils.num(document.getElementById(`nurse-avans-${nurse.id}`)?.value);
      const comment = document.getElementById(`nurse-comment-${nurse.id}`)?.value || '';
      if (avans || comment) nurses[nurse.id] = { avans, comment };
    });

    // Xarajatlar
    const expenses = [];
    (this.report.expenses || []).forEach((exp, i) => {
      const amount = Utils.num(document.getElementById(`exp-amount-${i}`)?.value);
      const categoryId = document.getElementById(`exp-cat-${i}`)?.value || 'boshqa';
      const description = document.getElementById(`exp-desc-${i}`)?.value || '';
      if (amount) expenses.push({ categoryId, description, amount });
    });

    const notes = document.getElementById('report-notes')?.value || '';

    // Hisoblangan qiymatlarni ham saqlash (hisobotlar uchun)
    const totals = this._calcTotals();

    const report = {
      date: this.currentDate,
      payments,
      doctors,
      nurses,
      expenses,
      notes,
      // Hisoblangan jami saqlash
      _jami_tushum: totals.jami_tushum,
      _kassa_naqd: totals.kassa_naqd,
      _umumiy_avans: totals.umumiy_avans,
      _jami_xarajat: totals.jami_xarajat,
      _berilishi_kerak: totals.berilishi_kerak,
      createdBy: Auth.getSession()?.userId,
      updatedAt: new Date().toISOString(),
      createdAt: this.report.createdAt || new Date().toISOString()
    };

    await DB.saveDailyReport(this.clinicId, report);
    this.report = report;
    Utils.toast('success', '✅ Saqlandi!', `${Utils.formatDate(this.currentDate)}`);
    this.updateTotals();
  },

  prevDay() {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() - 1);
    this.render({ date: d.toISOString().split('T')[0] });
  },

  nextDay() {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() + 1);
    if (d.toISOString().split('T')[0] <= Utils.getTodayStr()) {
      this.render({ date: d.toISOString().split('T')[0] });
    }
  },

  goToDate(date) {
    if (date) this.render({ date });
  },

  openAddPaymentType() {
    Utils.toast('info', 'Sozlamalarga o\'ting', 'To\'lov turlarini ⚙️ Klinika sozlamalari sahifasida boshqaring');
    setTimeout(() => Router.go('/admin/settings'), 1500);
  },

  // ===================== KUN YOPILDI =====================

  async closeDayModal() {
    // Avval saqlab olamiz
    await this.saveReport();

    const allUsers  = DB.getUsers().filter(u => u.clinicId === this.clinicId);
    const report    = this.report;
    const doctors   = this.doctors;
    const nurses    = this.nurses;

    const totals = this._calcTotals();

    // Xabar oladiganlar
    const docNotifications = doctors
      .map(doc => {
        const entry = (report.doctors || {})[doc.id] || {};
        const user  = allUsers.find(u => u.role === 'doctor' && u.linkedId === doc.id);
        if (!entry.tushum && !entry.avans && !entry.implantCount) return null;
        return { doc, entry, user };
      })
      .filter(Boolean);

    const nurseNotifications = nurses
      .map(nurse => {
        const entry = (report.nurses || {})[nurse.id] || {};
        const user  = allUsers.find(u => u.role === 'nurse' && u.linkedId === nurse.id);
        if (!entry.avans) return null;   // faqat avans olganlarga
        return { nurse, entry, user };
      })
      .filter(Boolean);

    Utils.openModal(`
      <div class="modal-header">
        <div class="modal-title">⛔ Kun yopildi — Tasdiqlash</div>
        <button class="modal-close" onclick="Utils.closeModal()">${Utils.icon('x')}</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--sp-4);">

        <!-- KUNLIK XULOSA -->
        <div style="padding:var(--sp-4);background:var(--bg-elevated);border-radius:var(--r-lg);">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:var(--sp-3);text-transform:uppercase;letter-spacing:0.05em;">📊 Kun xulosasi</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2);">
            ${[
              ['💰 Jami tushum', Utils.formatMoneyShort(totals.jami_tushum), 'var(--brand-primary)'],
              ['💵 Kassadagi naqt', Utils.formatMoneyShort(totals.kassa_naqd), 'var(--brand-success)'],
              ['💸 Jami avans', Utils.formatMoneyShort(totals.umumiy_avans), 'var(--brand-warning)'],
              ['📋 Xarajatlar', Utils.formatMoneyShort(totals.jami_xarajat), 'var(--brand-danger)'],
            ].map(([l, v, c]) => `
              <div style="padding:var(--sp-2) var(--sp-3);background:var(--bg-card);border-radius:var(--r-md);">
                <div style="font-size:11px;color:var(--text-muted);">${l}</div>
                <div style="font-size:var(--text-sm);font-weight:700;color:${c};">${v}</div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:var(--sp-3);padding:var(--sp-3);background:rgba(99,102,241,0.1);border-radius:var(--r-md);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:var(--text-muted);">📌 Berilishi kerak</span>
            <span style="font-family:var(--font-mono);font-weight:900;font-size:var(--text-md);color:${totals.berilishi_kerak >= 0 ? 'var(--brand-primary)' : 'var(--brand-danger)'};">${ Utils.formatMoneyShort(Math.abs(totals.berilishi_kerak)) }</span>
          </div>
        </div>

        <!-- TELEGRAM BILDIRISHNOMALAR -->
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:var(--sp-3);text-transform:uppercase;letter-spacing:0.05em;">✈️ Telegram bildirishnomalar</div>

          ${docNotifications.length ? `
            <div style="font-size:12px;font-weight:600;color:#22d3ee;margin-bottom:var(--sp-2);">👨‍⚕️ Vrachlar (${docNotifications.length} ta):</div>
            <div style="display:flex;flex-direction:column;gap:var(--sp-2);margin-bottom:var(--sp-3);">
              ${docNotifications.map(({ doc, entry, user }) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--sp-2) var(--sp-3);background:var(--bg-elevated);border-radius:var(--r-md);">
                  <div>
                    <span style="font-size:12px;font-weight:600;">${doc.name}</span>
                    <span style="font-size:11px;color:var(--text-muted);margin-left:var(--sp-2);">Tushum: ${Utils.formatMoneyShort(entry.tushum||0)}, Avans: ${Utils.formatMoneyShort(entry.avans||0)}</span>
                  </div>
                  ${user?.telegramId
                    ? `<span style="font-size:11px;color:#22d3ee;">✈️ ${user.telegramId}</span>`
                    : `<span style="font-size:11px;color:var(--brand-warning);">⚠️ TG yo'q</span>`
                  }
                </div>
              `).join('')}
            </div>
          ` : `<div style="font-size:12px;color:var(--text-muted);margin-bottom:var(--sp-3);">👨‍⚕️ Bugun hech bir vrach ma'lumot kiritilmagan</div>`}

          ${nurseNotifications.length ? `
            <div style="font-size:12px;font-weight:600;color:#ec4899;margin-bottom:var(--sp-2);">👩‍⚕️ Hamshiralar (avans olganlari — ${nurseNotifications.length} ta):</div>
            <div style="display:flex;flex-direction:column;gap:var(--sp-2);">
              ${nurseNotifications.map(({ nurse, entry, user }) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--sp-2) var(--sp-3);background:var(--bg-elevated);border-radius:var(--r-md);">
                  <div>
                    <span style="font-size:12px;font-weight:600;">${nurse.name}</span>
                    <span style="font-size:11px;color:var(--text-muted);margin-left:var(--sp-2);">Avans: ${Utils.formatMoneyShort(entry.avans)}</span>
                  </div>
                  ${user?.telegramId
                    ? `<span style="font-size:11px;color:#22d3ee;">✈️ ${user.telegramId}</span>`
                    : `<span style="font-size:11px;color:var(--brand-warning);">⚠️ TG yo'q</span>`
                  }
                </div>
              `).join('')}
            </div>
          ` : '<div style="font-size:12px;color:var(--text-muted);">👩‍⚕️ Hech bir hamshira bugun avans olmagan</div>'}
        </div>

        <div style="padding:var(--sp-3);background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:var(--r-md);font-size:12px;color:var(--brand-warning);">
          ⚠️ Telegram bot integratsiyasi keyingi bosqichda faollashadi. Hozir kun yopildi belgisi qo'yiladi.
        </div>

      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Bekor</button>
        <button class="btn btn-danger" onclick="ReceptionDaily.closeDay()">
          ⛔ Kunni yopish va bildirishnoma yuborish
        </button>
      </div>
    `);
  },

  closeDay() {
    // Report yopilgan deb belgilanadi
    const report = { ...this.report, _closed: true, _closedAt: new Date().toISOString() };
    DB.saveDailyReport(this.clinicId, report);
    this.report = report;

    // Notification state saqlash (kelgusida bot integratsiyasi uchun)
    const notifKey = `da_notif_${this.clinicId}_${this.currentDate}`;
    localStorage.setItem(notifKey, JSON.stringify({
      date: this.currentDate,
      closedAt: report._closedAt,
      status: 'pending_bot'
    }));

    Utils.closeModal();
    Utils.toast('success', '⛔ Kun yopildi!', 'Bildirishnomalar bot orqali yuboriladi (keyingi bosqich)');
    // UI yangilash
    this.render({ date: this.currentDate });
  }
};
