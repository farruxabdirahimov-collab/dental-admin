/**
 * Doctor Salary Detail Page
 * - Ekranda: oddiy kunlik jadval
 * - Chop etganda (print): kunlik jadval + formula qadamlari jadvali
 */

const AdminSalary = {
  year: null,
  month: null,
  clinicId: null,

  async render(params = {}) {
    const session = Auth.requireAuth(['admin', 'super_admin']);
    if (!session) return;

    const now = Utils.getCurrentMonth();
    this.year     = parseInt(params.year)  || now.year;
    this.month    = parseInt(params.month) || now.month;
    this.clinicId = session.clinicId;

    const doctors = DB.getDoctors(this.clinicId);
    const reports = await DB.getMonthlyReports(this.clinicId, this.year, this.month);

    const content = `
      ${Components.renderPageHeader(
        '💰 Vrachlar ish haqi hisob-kitobi',
        `${Utils.getMonthName(this.month, this.year)}`,
        `<div class="date-nav">
          <button class="date-nav-btn" onclick="AdminSalary.prevMonth()">${Utils.icon('chevron_left')}</button>
          <span class="date-nav-label">${Utils.getMonthName(this.month)} ${this.year}</span>
          <button class="date-nav-btn" onclick="AdminSalary.nextMonth()">${Utils.icon('chevron_right')}</button>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="AdminSalary.exportSalary()">🖨️ Chop etish</button>`
      )}
      <div class="page-body" id="salary-page-body">
        ${(await Promise.all(doctors.map(doc => this.renderDoctorCard(doc, reports)))).join('')}
        ${!doctors.length ? `<div class="empty-state"><div class="empty-icon">👨‍⚕️</div><div class="empty-title">Vrachlar yo'q</div></div>` : ''}
      </div>
    `;

    document.getElementById('app').innerHTML = Components.renderLayout(session, '/admin/salary', content);
    this._injectPrintStyles();
  },

  // ── VRACH KARTOCHKASI ──────────────────────────────────────────────────────
  async renderDoctorCard(doc, reports) {
    const clinicId    = this.clinicId;
    const monthStats  = FormulaEngine.calcMonthlyDoctorSteps(clinicId, doc, reports);
    const stepResults = monthStats.stepResults;

    // Ish qilgan kunlar
    const days = reports.filter(r => {
      const entry = (r.doctors || {})[doc.id] || {};
      return entry.tushum || entry.texnik || entry.implantCount;
    });

    // Kunlik jadval qatorlari
    const settings    = DB.getSettings(clinicId);
    const implantLabel = settings.implantLabel || 'Implant';
    const showImplant  = settings.showImplant !== false;

    const dayRows = days.map(r => {
      const entry = (r.doctors || {})[doc.id] || {};
      return `<tr>
        <td>${Utils.formatDateShort(r.date)}</td>
        <td class="right mono">${Utils.formatMoneyShort(entry.tushum || 0)}</td>
        <td class="right mono">${Utils.formatMoneyShort(entry.texnik || 0)}</td>
        ${showImplant ? `<td class="right center">${entry.implantCount || 0}</td>` : ''}
        <td class="right mono" style="color:var(--brand-warning)">${Utils.formatMoneyShort(entry.avans || 0)}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="${showImplant ? 5 : 4}" style="text-align:center;color:var(--text-muted);padding:var(--sp-5)">Bu oy ish yo'q</td></tr>`;

    // Natija qiymati — oxirgi "result" yoki oxirgi qadam
    const finalStep   = stepResults.find(s => s.type === 'result') || stepResults[stepResults.length - 1];
    const finalValue  = finalStep ? finalStep.value : 0;
    const berilishi   = finalValue - monthStats.totalAvans;

    // Formula qadamlari jadvali (chop etish uchun)
    const formulaTable = this._renderFormulaStepsTable(stepResults, monthStats);

    return `
      <div class="card salary-doctor-card" data-doc-id="${doc.id}" style="margin-bottom:var(--sp-6)">
        <!-- Ekran: Vrach sarlavhasi -->
        <div class="card-header no-print">
          <div style="display:flex;align-items:center;gap:var(--sp-4)">
            <div class="doctor-avatar" style="width:48px;height:48px;font-size:16px;background:${doc.color || 'var(--grad-brand)'}">
              ${Utils.getInitials(doc.name)}
            </div>
            <div>
              <div style="font-size:var(--text-lg);font-weight:700">${doc.name}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);font-family:var(--font-mono)">${doc.formula || 'formula'}</div>
            </div>
          </div>
          <div style="display:flex;gap:var(--sp-8)">
            <div class="salary-item" style="text-align:right">
              <div class="salary-item-label">Moy maoshi</div>
              <div style="font-size:var(--text-xl);font-weight:800;font-family:var(--font-mono);color:var(--brand-success)">
                ${Utils.formatMoneyShort(finalValue)}
              </div>
            </div>
            <div class="salary-item" style="text-align:right">
              <div class="salary-item-label">Avans</div>
              <div style="font-size:var(--text-xl);font-weight:700;font-family:var(--font-mono);color:var(--brand-warning)">
                ${Utils.formatMoneyShort(monthStats.totalAvans)}
              </div>
            </div>
            <div class="salary-item" style="text-align:right">
              <div class="salary-item-label">Berilishi kerak</div>
              <div style="font-size:var(--text-xl);font-weight:800;font-family:var(--font-mono);color:${berilishi >= 0 ? 'var(--brand-success)' : 'var(--brand-danger)'}">
                ${berilishi >= 0 ? '' : '-'}${Utils.formatMoneyShort(Math.abs(berilishi))}
              </div>
            </div>
          </div>
        </div>

        <!-- Ekran: Stats -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sp-3);margin-bottom:var(--sp-5)" class="no-print">
          ${[
            ['Tushum',     monthStats.totalTushum],
            ['Texnik',     monthStats.totalTexnik],
            ['Implant',    `${monthStats.totalImplantCount} ta`, true],
            ['Ish kunlari',`${days.length} kun`, true],
          ].map(([lbl, val, isText]) => `
            <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--r-md);padding:var(--sp-3);text-align:center">
              <div style="font-size:var(--text-xs);color:var(--text-muted)">${lbl}</div>
              <div style="font-family:var(--font-mono);font-weight:700">${isText ? val : Utils.formatMoneyShort(val)}</div>
            </div>`).join('')}
        </div>

        <!-- Ekran: Kunlik jadval -->
        <div class="table-wrap no-print">
          <table class="table">
            <thead>
              <tr>
                <th>Sana</th>
                <th class="right">Tushum</th>
                <th class="right">Texnik</th>
                ${showImplant ? `<th class="center">${implantLabel}</th>` : ''}
                <th class="right">Avans</th>
              </tr>
            </thead>
            <tbody>${dayRows}</tbody>
            <tfoot>
              <tr>
                <td><strong>JAMI</strong></td>
                <td class="right mono"><strong>${Utils.formatMoneyShort(monthStats.totalTushum)}</strong></td>
                <td class="right mono"><strong>${Utils.formatMoneyShort(monthStats.totalTexnik)}</strong></td>
                ${showImplant ? `<td class="center"><strong>${monthStats.totalImplantCount} ta</strong></td>` : ''}
                <td class="right mono" style="color:var(--brand-warning)"><strong>${Utils.formatMoneyShort(monthStats.totalAvans)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Ekran: Formula qadamlar (collapsible) -->
        <div class="no-print" style="margin-top:var(--sp-4)">
          <button class="btn btn-ghost btn-sm" onclick="AdminSalary.toggleFormulaPreview('${doc.id}')"
            style="font-size:12px;color:var(--brand-primary)">
            💡 Formula hisob-kitobini ko'rish
          </button>
          <div id="formula-preview-${doc.id}" style="display:none;margin-top:var(--sp-3)">
            ${formulaTable}
          </div>
        </div>

        <!-- PRINT ONLY: To'liq chop etish versiyasi -->
        <div class="print-only salary-print-block">
          ${this._renderPrintHeader(doc, this.year, this.month, DB.getClinicById(this.clinicId))}
          ${this._renderPrintDailyTable(days, doc, settings)}
          ${this._renderPrintFormulaSection(stepResults, monthStats, berilishi, doc)}
          ${this._renderPrintSignature(doc)}
        </div>
      </div>
    `;
  },

  // ── EKRANDA FORMULA PREVIEW ────────────────────────────────────────────────
  toggleFormulaPreview(docId) {
    const el = document.getElementById(`formula-preview-${docId}`);
    if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
  },

  _renderFormulaStepsTable(stepResults, monthStats) {
    if (!stepResults || !stepResults.length) return '';
    const typeColors = { sum: '#22d3ee', formula: 'var(--brand-primary)', result: 'var(--brand-success)' };
    return `
      <div style="border:1px solid var(--border-subtle);border-radius:var(--r-lg);overflow:hidden">
        <table class="table" style="font-size:13px;margin:0">
          <thead style="background:rgba(99,102,241,0.06)">
            <tr>
              <th style="width:120px">Qadam</th>
              <th>Nom</th>
              <th>Hisob</th>
              <th class="right">Natija</th>
            </tr>
          </thead>
          <tbody>
            ${stepResults.map(s => `
              <tr style="${s.type === 'result' ? 'background:rgba(16,185,129,0.06);font-weight:700;border-top:2px solid rgba(16,185,129,0.3)' : ''}">
                <td><code style="color:${typeColors[s.type] || 'var(--brand-primary)'};font-weight:800;font-size:13px">${s.emoji} ${s.id}</code></td>
                <td style="font-weight:${s.type === 'result' ? '700' : '500'}">${s.label}</td>
                <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${s.exprText}</td>
                <td class="right" style="font-family:var(--font-mono);font-weight:700;color:${typeColors[s.type] || 'var(--text-primary)'}">
                  ${s.value < 0 ? '−' : ''}${Utils.formatMoneyShort(Math.abs(s.value))}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // ── PRINT: SARLAVHA ────────────────────────────────────────────────────────
  _renderPrintHeader(doc, year, month, clinic) {
    return `
      <div class="print-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #000">
        <div>
          <div style="font-size:18px;font-weight:900">${clinic?.name || 'Klinika'}</div>
          <div style="font-size:12px;color:#555">${clinic?.address || ''} ${clinic?.phone || ''}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:15px;font-weight:800">💰 Ish haqi hisob-kitobi</div>
          <div style="font-size:13px;font-weight:700;color:#333">${Utils.getMonthName(month)} ${year}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;font-weight:800">${doc.name}</div>
          <div style="font-size:11px;color:#666">Vrach</div>
        </div>
      </div>
    `;
  },

  // ── PRINT: KUNLIK JADVAL ───────────────────────────────────────────────────
  _renderPrintDailyTable(days, doc, settings) {
    const implantLabel = settings.implantLabel || 'Implant';
    const showImplant  = settings.showImplant !== false;

    const rows = days.map(r => {
      const entry = (r.doctors || {})[doc.id] || {};
      return `<tr>
        <td>${Utils.formatDateShort(r.date)}</td>
        <td style="text-align:right">${(entry.tushum || 0).toLocaleString('ru-RU')}</td>
        <td style="text-align:right">${(entry.texnik || 0).toLocaleString('ru-RU')}</td>
        ${showImplant ? `<td style="text-align:center">${entry.implantCount || 0}</td>` : ''}
        <td style="text-align:right">${(entry.avans || 0).toLocaleString('ru-RU')}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="${showImplant ? 5 : 4}" style="text-align:center;color:#999;padding:12px">Bu oy ish yo'q</td></tr>`;

    const totals = days.reduce((acc, r) => {
      const e = (r.doctors || {})[doc.id] || {};
      acc.tushum       += Number(e.tushum)       || 0;
      acc.texnik       += Number(e.texnik)        || 0;
      acc.implantCount += Number(e.implantCount)  || 0;
      acc.avans        += Number(e.avans)         || 0;
      return acc;
    }, { tushum: 0, texnik: 0, implantCount: 0, avans: 0 });

    return `
      <div style="margin-bottom:20px">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;border-left:3px solid #6366f1;padding-left:8px">
          📅 Kunlik hisobot (${days.length} ish kuni)
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="${thStyle}">Sana</th>
              <th style="${thStyle} text-align:right">Tushum (so'm)</th>
              <th style="${thStyle} text-align:right">Texnik (so'm)</th>
              ${showImplant ? `<th style="${thStyle} text-align:center">${implantLabel}</th>` : ''}
              <th style="${thStyle} text-align:right">Avans (so'm)</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#f9fafb;font-weight:800;border-top:2px solid #374151">
              <td style="${tdStyle}"><strong>JAMI</strong></td>
              <td style="${tdStyle} text-align:right"><strong>${totals.tushum.toLocaleString('ru-RU')}</strong></td>
              <td style="${tdStyle} text-align:right"><strong>${totals.texnik.toLocaleString('ru-RU')}</strong></td>
              ${showImplant ? `<td style="${tdStyle} text-align:center"><strong>${totals.implantCount} ta</strong></td>` : ''}
              <td style="${tdStyle} text-align:right"><strong>${totals.avans.toLocaleString('ru-RU')}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },

  // ── PRINT: FORMULA QADAMLARI ──────────────────────────────────────────────
  _renderPrintFormulaSection(stepResults, monthStats, berilishi, doc) {
    if (!stepResults || !stepResults.length) return '';

    const typeColors = {
      sum:     { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
      formula: { bg: '#f5f3ff', border: '#6366f1', text: '#4338ca' },
      result:  { bg: '#f0fdf4', border: '#16a34a', text: '#15803d' },
    };

    const rows = stepResults.map(s => {
      const clr = typeColors[s.type] || typeColors.formula;
      const isResult = s.type === 'result';
      return `<tr style="${isResult ? 'background:#f0fdf4;font-weight:800;border-top:2px solid #16a34a' : ''}">
        <td style="${tdStyle} white-space:nowrap">
          <span style="display:inline-flex;align-items:center;gap:4px">
            <span style="font-size:16px">${s.emoji}</span>
            <code style="background:${clr.bg};color:${clr.text};border:1px solid ${clr.border};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:800">${s.id}</code>
          </span>
        </td>
        <td style="${tdStyle}">${s.label}</td>
        <td style="${tdStyle} font-family:monospace;font-size:11px;color:#6b7280">${s.exprText}</td>
        <td style="${tdStyle} text-align:right;font-family:monospace;font-weight:800;color:${clr.text}">
          ${s.value < 0 ? '−' : ''}${Math.abs(s.value).toLocaleString('ru-RU')} so'm
        </td>
      </tr>`;
    }).join('');

    const berilishiColor = berilishi >= 0 ? '#16a34a' : '#dc2626';

    return `
      <div style="margin-bottom:20px">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;border-left:3px solid #16a34a;padding-left:8px">
          💡 Maosh hisob-kitobi formulasi
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="${thStyle} width:110px">Qadam</th>
              <th style="${thStyle}">Nom</th>
              <th style="${thStyle}">Hisob iborasi</th>
              <th style="${thStyle} text-align:right">Natija</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <!-- Yakuniy summa box -->
        <div style="margin-top:16px;padding:14px 18px;border:2px solid ${berilishiColor};border-radius:8px;background:${berilishi >= 0 ? '#f0fdf4' : '#fef2f2'};display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:2px">Oylik yakuniy summa (berilishi kerak)</div>
            <div style="font-size:11px;font-family:monospace;color:#9ca3af">
              = Moy maoshi ${berilishi < 0 ? '+' : '−'} Avans (${monthStats.totalAvans.toLocaleString('ru-RU')} so'm)
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:26px;font-weight:900;font-family:monospace;color:${berilishiColor}">
              ${berilishi < 0 ? '−' : ''}${Math.abs(berilishi).toLocaleString('ru-RU')}
            </div>
            <div style="font-size:12px;color:#6b7280">so'm</div>
            ${berilishi < 0 ? '<div style="font-size:11px;color:#dc2626;margin-top:2px">⚠️ Ortiqcha avans bor</div>' : ''}
          </div>
        </div>
      </div>
    `;
  },

  // ── PRINT: IMZOLAR ────────────────────────────────────────────────────────
  _renderPrintSignature(doc) {
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:30px;padding-top:16px;border-top:1px solid #e5e7eb">
        <div>
          <div style="font-size:11px;color:#6b7280">Rahbar imzosi:</div>
          <div style="margin-top:30px;border-top:1px solid #374151;width:180px;padding-top:4px;font-size:10px;color:#9ca3af">Rahbar</div>
        </div>
        <div>
          <div style="font-size:11px;color:#6b7280">Vrach imzosi:</div>
          <div style="margin-top:30px;border-top:1px solid #374151;width:180px;padding-top:4px;font-size:10px;color:#9ca3af">${doc.name}</div>
        </div>
        <div style="font-size:10px;color:#9ca3af;text-align:right">
          Sana: _____________<br>
          DentAdmin tizimi
        </div>
      </div>
    `;
  },

  // ── PRINT CSS ──────────────────────────────────────────────────────────────
  _injectPrintStyles() {
    const existing = document.getElementById('salary-print-css');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = 'salary-print-css';
    style.textContent = `
      @media print {
        /* Hamma narsani yashirish */
        body > *:not(#app) { display: none !important; }
        .sidebar, .topbar, .page-header, nav,
        .no-print, [class*="no-print"] { display: none !important; }

        #app { padding: 0 !important; margin: 0 !important; }
        .layout-content, .page-body { padding: 0 !important; margin: 0 !important; }

        /* Kartochkalar */
        .salary-doctor-card {
          page-break-after: always;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .salary-doctor-card:last-child { page-break-after: auto; }

        /* Print bloki */
        .print-only { display: block !important; }

        /* Jadval uslubi */
        table { width: 100%; border-collapse: collapse; }
        th, td {
          border: 1px solid #d1d5db;
          padding: 6px 10px;
          font-size: 12px;
        }
        thead tr { background: #f3f4f6 !important; }

        @page {
          margin: 15mm 12mm;
          size: A4 portrait;
        }
      }

      /* Ekranda print-only yashirish */
      @media screen {
        .print-only { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  },

  // ── NAVIGATSIYA ───────────────────────────────────────────────────────────
  prevMonth() {
    let m = this.month - 1, y = this.year;
    if (m <= 0) { m = 12; y -= 1; }
    this.render({ year: y, month: m });
  },

  nextMonth() {
    let m = this.month + 1, y = this.year;
    if (m > 12) { m = 1; y += 1; }
    const now = Utils.getCurrentMonth();
    if (y > now.year || (y === now.year && m > now.month)) return;
    this.render({ year: y, month: m });
  },

  exportSalary() {
    window.print();
  }
};

// Jadval uslub konstantalari (print uchun inline stil)
const thStyle = 'border:1px solid #d1d5db;padding:6px 10px;font-size:12px;font-weight:700;text-align:left;';
const tdStyle = 'border:1px solid #e5e7eb;padding:6px 10px;font-size:12px;';
