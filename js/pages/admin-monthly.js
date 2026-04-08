/**
 * Monthly Report — To'liq oylik hisobot
 *
 * Formulalar:
 *   JTS  = Jami Texnik Summasi (barcha kunlar texnik yig'indisi)
 *   JIS  = Jami Implant Summasi = implant_soni × implant_value
 *   VU   = (Jami tushum - JTS) × foiz% + JIS
 *   JVB  = VU + JTS - Jami avans   (Jami Vrachga Beriladigan)
 */

const AdminMonthly = {
  year: null,
  month: null,
  clinicId: null,
  _data: null,   // cache

  async render(params = {}) {
    const session = Auth.requireAuth(['admin', 'super_admin']);
    if (!session) return;

    const now = Utils.getCurrentMonth();
    this.year     = parseInt(params.year)  || now.year;
    this.month    = parseInt(params.month) || now.month;
    this.clinicId = session.clinicId;

    this._data = await this._loadData();
    const d = this._data;

    const content = `
      ${Components.renderPageHeader(
        '📊 Oylik hisobot',
        `${Utils.getMonthName(d.month, d.year)} — ${d.monthly.reportCount} kun kiritilgan`,
        `<div class="date-nav">
          <button class="date-nav-btn" onclick="AdminMonthly.prevMonth()">${Utils.icon('chevron_left')}</button>
          <span class="date-nav-label">${Utils.getMonthName(d.month, d.year)}</span>
          <button class="date-nav-btn" onclick="AdminMonthly.nextMonth()">${Utils.icon('chevron_right')}</button>
        </div>
        <div style="display:flex;gap:var(--sp-2);">
          <button class="btn btn-secondary btn-sm" onclick="AdminMonthly.exportCSV()">📥 CSV</button>
          <button class="btn btn-primary btn-sm" onclick="AdminMonthly.printReport()">🖨️ Chop etish</button>
        </div>`
      )}

      <div class="page-body" style="display:flex;flex-direction:column;gap:var(--sp-6);" id="monthly-content">

        <!-- 1. UMUMIY STATISTIKA -->
        ${this._renderStats()}

        <!-- 2. MOLIYAVIY XULOSA (2 ustunli jadval) -->
        ${this._renderFinancialSummary()}

        <!-- 3. VRACHLAR BATAFSIL (har bir doktor uchun jadval) -->
        ${this._renderDoctorTables()}

        <!-- 4. HAMSHIRALAR -->
        ${this._renderNurses()}

        <!-- 5. KUNLIK HISOBOTLAR (umumiy ko'rinish) -->
        ${this._renderDailyList()}

        <!-- 6. XARAJATLAR TAHLILI -->
        ${this._renderExpenseAnalysis()}

      </div>
    `;

    document.getElementById('app').innerHTML = Components.renderLayout(session, '/admin/monthly', content);
  },

  // ========== MA'LUMOTLARNI YUKLASH ==========
  async _loadData() {
    const [monthly, reports] = await Promise.all([
      FormulaEngine.calcMonthlyTotal(this.clinicId, this.year, this.month),
      DB.getMonthlyReports(this.clinicId, this.year, this.month),
    ]);
    const doctors   = DB.getDoctors(this.clinicId);
    const nurses    = DB.getNurses(this.clinicId);
    const settings  = DB.getSettings(this.clinicId);
    const payTypes  = DB.getPaymentTypes(this.clinicId).filter(p => p.active && p.id !== 'naqd');
    const activeVars = DB.getDailyVars(this.clinicId).filter(v => v.active);

    const doctorDetails = {};
    doctors.forEach(doc => {
      const days = [];
      const varTotals = {};
      activeVars.forEach(v => { varTotals[v.id] = 0; });

      reports.forEach(r => {
        const e = (r.doctors || {})[doc.id] || {};
        const dayEntry = { date: r.date };
        let hasData = false;
        activeVars.forEach(v => {
          const val = Number(e[v.id]) || 0;
          dayEntry[v.id] = val;
          varTotals[v.id] = (varTotals[v.id] || 0) + val;
          if (val) hasData = true;
        });
        if (hasData) days.push(dayEntry);
      });

      // FormulaEngine ga barcha var totals uzatiladi
      const stepResults = FormulaEngine.calcSteps(this.clinicId, {
        ...varTotals,
        doctor: doc,
      });

      const finalStep = stepResults.find(s => s.type === 'result') || stepResults[stepResults.length - 1];
      const JVB = finalStep ? finalStep.value : 0;

      doctorDetails[doc.id] = {
        days, varTotals, activeVars, stepResults, JVB,
        implantValue: doc.implantValue || 300000,
        percent: doc.percent || 35,
      };
    });

    return {
      year: this.year, month: this.month,
      monthly, reports, doctors, nurses, settings, payTypes, doctorDetails, activeVars
    };
  },

  // 1 — UMUMIY STATISTIKA KARTOCHKALARI
  _renderStats() {
    const { monthly, settings } = this._data;
    const totalKassa = monthly.kassaNaqd;

    return `
      <div class="stats-grid stats-grid-4">
        <div class="stat-card" style="--stat-color:var(--grad-brand)">
          <div class="stat-label">Jami tushum</div>
          <div class="stat-value sm">${Utils.formatMoneyShort(monthly.tushum)}</div>
          <div class="stat-sub">${monthly.tushum.toLocaleString('ru-RU').replace(/,/g,' ')} so'm</div>
          <div class="stat-icon">${Utils.icon('money',20)}</div>
        </div>
        <div class="stat-card" style="--stat-color:var(--grad-success)">
          <div class="stat-label">💵 Kassadagi naqt</div>
          <div class="stat-value sm" style="color:${totalKassa>=0?'var(--brand-success)':'var(--brand-danger)'}">${Utils.formatMoneyShort(totalKassa)}</div>
          <div class="stat-sub">${totalKassa.toLocaleString('ru-RU').replace(/,/g,' ')} so'm</div>
          <div class="stat-icon">${Utils.icon('money',20)}</div>
        </div>
        <div class="stat-card" style="--stat-color:var(--grad-warning)">
          <div class="stat-label">📌 Berilishi kerak</div>
          <div class="stat-value sm" style="color:${monthly.berilishiKerak>=0?'var(--brand-primary)':'var(--brand-danger)'}">${Utils.formatMoneyShort(Math.abs(monthly.berilishiKerak))}</div>
          <div class="stat-sub">${Math.abs(monthly.berilishiKerak).toLocaleString('ru-RU').replace(/,/g,' ')} so'm</div>
          <div class="stat-icon">${Utils.icon('trend',20)}</div>
        </div>
        <div class="stat-card" style="--stat-color:${monthly.foyda>=0?'var(--grad-success)':'var(--grad-danger)'}">
          <div class="stat-label">Oylik foyda</div>
          <div class="stat-value sm" style="color:${monthly.foyda>=0?'var(--brand-success)':'var(--brand-danger)'}">${Utils.formatMoneyShort(monthly.foyda)}</div>
          <div class="stat-sub">${monthly.foyda.toLocaleString('ru-RU').replace(/,/g,' ')} so'm</div>
          <div class="stat-icon">${Utils.icon('trend',20)}</div>
        </div>
      </div>
    `;
  },

  // 2 — MOLIYAVIY XULOSA
  _renderFinancialSummary() {
    const { monthly, settings, payTypes, nurses } = this._data;

    const ptRows = payTypes.map(pt => {
      const amt = monthly.payments[pt.id] || 0;
      if (!amt) return '';
      const pct = monthly.tushum ? ((amt / monthly.tushum)*100).toFixed(1) : 0;
      return `<tr>
        <td>${pt.icon||''} ${pt.name}</td>
        <td class="right mono">${Utils.formatMoney(amt, false)}</td>
        <td class="right"><span class="badge badge-neutral">${pct}%</span></td>
      </tr>`;
    }).join('');

    const nurseRows = nurses.map(n => {
      const avans = Object.values(this._data.reports).reduce((s, r) => {
        return s + (Number(((r.nurses||{})[n.id]||{}).avans)||0);
      }, 0);
      return `<tr>
        <td>${n.name}</td>
        <td class="right mono" style="color:var(--brand-warning)">-${Utils.formatMoney(avans, false)}</td>
        <td class="right"><span style="font-size:11px;color:var(--text-muted)">Oylik: ${Utils.formatMoneyShort(n.baseSalary)}</span></td>
      </tr>`;
    }).join('');

    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);">

        <!-- Tushum taqsimoti -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">💳 Tushum taqsimoti</div>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>To'lov turi</th><th class="right">Summa</th><th class="right">%</th></tr></thead>
              <tbody>
                <tr>
                  <td style="font-weight:600">💰 Vrachlar tushumi (naqt)</td>
                  <td class="right mono" style="color:var(--brand-primary)">${Utils.formatMoney(monthly.tushum, false)}</td>
                  <td class="right"><span class="badge badge-primary">100%</span></td>
                </tr>
                ${ptRows}
                <tr style="border-top:1px solid rgba(99,102,241,0.2)">
                  <td style="font-weight:700;color:var(--brand-success)">💵 Kassadagi naqt</td>
                  <td class="right mono" style="color:var(--brand-success);font-weight:700">${Utils.formatMoney(monthly.kassaNaqd, false)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Foyda hisobi -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">📌 Moliyaviy xulosa</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:var(--sp-2);padding:var(--sp-2) 0;">
            ${this._summaryRow('💰 Jami tushum', monthly.tushum, 'var(--brand-primary)', true)}
            <div style="height:1px;background:var(--border-color);margin:var(--sp-1) 0;"></div>
            ${this._summaryRow('💵 Kassadagi naqt', monthly.kassaNaqd, 'var(--brand-success)')}
            <div style="height:1px;background:var(--border-color);margin:var(--sp-1) 0;"></div>
            <div style="font-size:11px;color:var(--text-muted);padding:0 var(--sp-1)">Ayirmalar:</div>
            ${this._summaryRow('💸 Vrachlar avansi', monthly.doctorAvansTotal, 'var(--brand-warning)', false, true)}
            ${this._summaryRow('💸 Hamshiralar avansi', monthly.nurseTotal, 'var(--brand-warning)', false, true)}
            ${this._summaryRow('📋 Kunlik xarajatlar', monthly.totalXarajat, 'var(--brand-danger)', false, true)}

            <div style="padding:var(--sp-3) var(--sp-4);background:rgba(99,102,241,0.08);border:2px solid rgba(99,102,241,0.3);border-radius:var(--r-lg);margin-top:var(--sp-2)">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:var(--sp-2)">📌 BERILISHI KERAK</div>
              <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:var(--sp-2)">Kassa − avans − xarajat</div>
              <div style="font-family:var(--font-mono);font-size:1.4em;font-weight:900;color:${monthly.berilishiKerak>=0?'var(--brand-primary)':'var(--brand-danger)'}">
                ${Utils.formatMoneyShort(Math.abs(monthly.berilishiKerak))}
              </div>
              <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">${Math.abs(monthly.berilishiKerak).toLocaleString('ru-RU').replace(/,/g,' ')} so'm</div>
            </div>

            <div style="height:1px;background:var(--border-color);margin:var(--sp-2) 0;"></div>
            <div style="font-size:11px;color:var(--text-muted);padding:0 var(--sp-1)">Foyda hisobi:</div>
            ${this._summaryRow('Arenda', settings.arenda||0, 'var(--brand-danger)', false, true)}
            ${this._summaryRow('Kommunal', settings.kommunal||0, 'var(--brand-danger)', false, true)}
            ${this._summaryRow('Vrachlar VU', monthly.totalVU, 'var(--brand-danger)', false, true)}
            <div style="padding:var(--sp-3) var(--sp-4);background:${monthly.foyda>=0?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)'};border:2px solid ${monthly.foyda>=0?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'};border-radius:var(--r-lg);margin-top:var(--sp-2)">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">OYLIK FOYDA</div>
              <div style="font-family:var(--font-mono);font-size:1.4em;font-weight:900;color:${monthly.foyda>=0?'var(--brand-success)':'var(--brand-danger)'}">
                ${Utils.formatMoneyShort(monthly.foyda)}
              </div>
              <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">${monthly.foyda.toLocaleString('ru-RU').replace(/,/g,' ')} so'm</div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _summaryRow(label, val, color='var(--text-primary)', bold=false, minus=false) {
    const n = Number(val)||0;
    const dispVal = minus ? `-${Utils.formatMoney(n, false)}` : Utils.formatMoney(n, false);
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:2px var(--sp-1);">
      <span style="font-size:var(--text-sm);color:var(--text-secondary)${bold?';font-weight:700':''}">${label}</span>
      <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:${color};font-weight:${bold?'700':'500'}">${dispVal}</span>
    </div>`;
  },

  // 3 — HAR BIR DOKTOR UCHUN KUNLIK JADVAL
  _renderDoctorTables() {
    const { doctors, doctorDetails } = this._data;

    return `
      <div class="section">
        <div class="section-header">
          <div class="section-title">👨‍⚕️ Vrachlar batafsil hisobi</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--sp-6);">
          ${doctors.map(doc => this._renderOneDoctorTable(doc, doctorDetails[doc.id])).join('')}
        </div>
      </div>
    `;
  },

  _renderOneDoctorTable(doc, detail) {
    if (!detail || !detail.days || detail.days.length === 0) {
      return `
        <div class="card" style="opacity:0.5">
          <div class="card-header">
            <div style="display:flex;align-items:center;gap:var(--sp-3)">
              <div class="doctor-avatar" style="background:${doc.color||'var(--grad-brand)'}; width:32px; height:32px; font-size:12px">${Utils.getInitials(doc.name)}</div>
              <div class="card-title">${doc.name}</div>
            </div>
            <span style="font-size:var(--text-xs);color:var(--text-muted)">Bu oy hisobot yo'q</span>
          </div>
        </div>`;
    }

    const avs = detail.activeVars || [];
    const pct = detail.percent;
    const impVal = detail.implantValue;

    const dayRows = detail.days.map(day => {
      const cells = avs.map(v => {
        const val = day[v.id] || 0;
        const color = v.id === 'avans' ? 'var(--brand-warning)' :
                      v.id === 'tushum' ? '' : '#22d3ee';
        const fmt = v.type === 'number' ? (val || '—') :
                    (val ? val.toLocaleString('ru-RU').replace(/,/g,' ') : '—');
        return `<td class="right${v.type !== 'number' ? ' mono' : ''}"${color ? ` style="color:${color}"` : ''}>${fmt}</td>`;
      }).join('');
      return `<tr><td style="white-space:nowrap">${Utils.formatDateShort(day.date)}</td>${cells}</tr>`;
    }).join('');

    const headerCells = avs.map(v => `<th class="right">${v.label}</th>`).join('');
    const footerCells = avs.map(v => {
      const total = detail.varTotals[v.id] || 0;
      const color = v.id === 'avans' ? 'var(--brand-warning)' :
                    v.id === 'tushum' ? 'var(--brand-primary)' : '#22d3ee';
      const fmt = v.type === 'number' ? total :
                  total.toLocaleString('ru-RU').replace(/,/g,' ');
      return `<td class="right mono" style="color:${color};font-weight:700">${fmt}</td>`;
    }).join('');

    return `
      <div class="card doctor-monthly-card" data-docid="${doc.id}">
        <div class="card-header" style="padding-bottom:var(--sp-4);border-bottom:1px solid var(--border-color);margin-bottom:var(--sp-4)">
          <div style="display:flex;align-items:center;gap:var(--sp-3)">
            <div class="doctor-avatar" style="background:${doc.color||'var(--grad-brand)'}; width:40px; height:40px; font-size:14px">${Utils.getInitials(doc.name)}</div>
            <div>
              <div style="font-size:var(--text-md);font-weight:700">${doc.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">Foiz: ${pct}% · Implant: ${Utils.formatMoneyShort(impVal)}/ta</div>
            </div>
          </div>
          <div style="display:flex;gap:var(--sp-3);">
            <button class="btn btn-ghost btn-sm" onclick="AdminMonthly.printDoctorReport('${doc.id}')">🖨️ Chop</button>
          </div>
        </div>

        <div class="table-wrap" style="margin-bottom:var(--sp-4)">
          <table class="table" style="font-size:var(--text-sm)">
            <thead><tr><th>Sana</th>${headerCells}</tr></thead>
            <tbody>${dayRows}</tbody>
            <tfoot>
              <tr style="background:rgba(99,102,241,0.06)">
                <td><strong>JAMI</strong></td>${footerCells}
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="display:grid;grid-template-columns:repeat(${detail.stepResults.length || 4},1fr);gap:var(--sp-3);padding:var(--sp-4);background:var(--bg-elevated);border-radius:var(--r-lg);">
          ${this._renderStepBoxes(detail.stepResults)}
        </div>
      </div>
    `;
  },

  // Dynamic formula boxes from FormulaEngine.calcSteps()
  _renderStepBoxes(stepResults) {
    const typeColors = { sum: '#22d3ee', formula: 'var(--brand-primary)', result: 'var(--brand-success)' };
    return (stepResults || []).map(s => {
      const color = typeColors[s.type] || 'var(--brand-primary)';
      const n = Number(s.value) || 0;
      return `
        <div style="padding:var(--sp-3);border:1px solid ${color}33;border-radius:var(--r-md);background:${color}0d;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${color};margin-bottom:var(--sp-1)">${s.emoji || '📌'} ${s.id}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:var(--sp-2)">${s.label}</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-md);font-weight:800;color:${color}">${Utils.formatMoneyShort(n)}</div>
          <div style="font-size:9px;color:var(--text-muted);font-family:var(--font-mono);margin-top:4px;line-height:1.4">${s.exprText}</div>
        </div>`;
    }).join('');
  },

  // 4 — HAMSHIRALAR
  _renderNurses() {
    const { nurses, reports, monthly } = this._data;
    if (!nurses.length) return '';

    const nurseAvans = {};
    nurses.forEach(n => { nurseAvans[n.id] = 0; });
    reports.forEach(r => {
      nurses.forEach(n => {
        nurseAvans[n.id] += Number(((r.nurses||{})[n.id]||{}).avans)||0;
      });
    });

    return `
      <div class="card">
        <div class="card-header"><div class="card-title">👩‍⚕️ Hamshiralar hisobi</div></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Hamshira</th><th class="right">Oylik maoshi</th><th class="right">Berilgan avans</th><th class="right">Qolgan</th></tr></thead>
            <tbody>
              ${nurses.map(n => {
                const av = nurseAvans[n.id] || 0;
                const qolgan = (n.baseSalary||0) - av;
                return `<tr>
                  <td>👩‍⚕️ ${n.name}</td>
                  <td class="right mono">${Utils.formatMoney(n.baseSalary||0, false)}</td>
                  <td class="right mono" style="color:var(--brand-warning)">-${Utils.formatMoney(av, false)}</td>
                  <td class="right mono" style="color:${qolgan>=0?'var(--brand-success)':'var(--brand-danger)'}">${Utils.formatMoney(qolgan, false)}</td>
                </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>JAMI</strong></td>
                <td class="right mono"><strong>${Utils.formatMoney(nurses.reduce((s,n)=>s+(n.baseSalary||0),0), false)}</strong></td>
                <td class="right mono" style="color:var(--brand-warning)"><strong>-${Utils.formatMoney(monthly.nurseTotal, false)}</strong></td>
                <td class="right mono"><strong>${Utils.formatMoney(nurses.reduce((s,n)=>s+(n.baseSalary||0),0) - monthly.nurseTotal, false)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  },

  // 5 — KUNLIK HISOBOTLAR RO'YHATI
  _renderDailyList() {
    const { reports, doctors, payTypes, monthly } = this._data;

    const rows = reports.map(r => {
      const dayTushum = doctors.reduce((s, doc) => {
        return s + (Number(((r.doctors||{})[doc.id]||{}).tushum)||0);
      }, 0);
      const dayXarajat = (r.expenses||[]).reduce((s,e) => s + (Number(e.amount)||0), 0);
      const dayNaqt = dayTushum - payTypes.reduce((s,pt) => s + (Number((r.payments||{})[pt.id])||0), 0);
      const dayAvans = doctors.reduce((s, doc) => s + (Number(((r.doctors||{})[doc.id]||{}).avans)||0), 0)
                     + Object.values(r.nurses||{}).reduce((s, ne) => s + (Number(ne.avans)||0), 0);
      return `<tr>
        <td style="white-space:nowrap">${Utils.formatDateShort(r.date)}</td>
        <td class="right mono">${dayTushum.toLocaleString('ru-RU').replace(/,/g,' ')}</td>
        <td class="right mono" style="color:var(--brand-success)">${dayNaqt.toLocaleString('ru-RU').replace(/,/g,' ')}</td>
        <td class="right mono" style="color:var(--brand-warning)">-${dayAvans.toLocaleString('ru-RU').replace(/,/g,' ')}</td>
        <td class="right mono" style="color:var(--brand-danger)">-${dayXarajat.toLocaleString('ru-RU').replace(/,/g,' ')}</td>
        <td class="center">
          <button class="btn btn-ghost btn-sm" onclick="Router.go('/reception/daily?date=${r.date}')">Ko'r</button>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="6" style="text-align:center;padding:var(--sp-8);color:var(--text-muted)">Bu oy hisobot yo'q</td></tr>`;

    return `
      <div class="card">
        <div class="card-header"><div class="card-title">📅 Kunlik hisobotlar</div></div>
        <div class="table-wrap">
          <table class="table" style="font-size:var(--text-sm)">
            <thead>
              <tr>
                <th>Sana</th>
                <th class="right">Tushum</th>
                <th class="right">Kassadagi naqt</th>
                <th class="right">Avanslar</th>
                <th class="right">Xarajatlar</th>
                <th class="center">Amal</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td><strong>JAMI</strong></td>
                <td class="right mono"><strong>${monthly.tushum.toLocaleString('ru-RU').replace(/,/g,' ')}</strong></td>
                <td class="right mono" style="color:var(--brand-success)"><strong>${monthly.kassaNaqd.toLocaleString('ru-RU').replace(/,/g,' ')}</strong></td>
                <td class="right mono" style="color:var(--brand-warning)"><strong>-${monthly.umumiyAvans.toLocaleString('ru-RU').replace(/,/g,' ')}</strong></td>
                <td class="right mono" style="color:var(--brand-danger)"><strong>-${monthly.totalXarajat.toLocaleString('ru-RU').replace(/,/g,' ')}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  },

  // 6 — XARAJATLAR CHUQUR TAHLILI
  _renderExpenseAnalysis() {
    const { reports, clinicId, month, year } = this._data;
    const expenseCats = DB.getExpenseCategories(this._data.clinicId || this.clinicId);
    const catMap = {};
    expenseCats.forEach(c => { catMap[c.id] = { name: c.name, total: 0, count: 0, days: [] }; });
    catMap['__other__'] = { name: 'Boshqa', total: 0, count: 0, days: [] };

    let grandTotal = 0;
    reports.forEach(r => {
      (r.expenses || []).forEach(exp => {
        const amt = Number(exp.amount) || 0;
        const catId = exp.categoryId || exp.category || '__other__';
        const target = catMap[catId] || catMap['__other__'];
        target.total += amt;
        target.count += 1;
        target.days.push({ date: r.date, desc: exp.description || '—', amt });
        grandTotal += amt;
      });
    });

    const sorted = Object.entries(catMap)
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => b[1].total - a[1].total);

    if (!sorted.length) {
      return `
        <div class="card">
          <div class="card-header"><div class="card-title">📂 Xarajatlar tahlili</div></div>
          <div class="empty-state" style="padding:var(--sp-8)"><div class="empty-title">Bu oy xarajatlar yo'q</div></div>
        </div>
      `;
    }

    const maxVal = sorted[0][1].total;
    const topCat = sorted[0];
    const topPct = grandTotal > 0 ? ((topCat[1].total / grandTotal) * 100).toFixed(1) : 0;

    // Tavsiyalar tizimi
    const recommendations = [];
    if (topPct > 40) {
      recommendations.push({ icon: '⚠️', text: `"${topCat[1].name}" kategoriyasi umumiy xarajatlarning ${topPct}% ini tashkil etmoqda. Bu juda yuqori. Ushbu sohadagi xarajatlarni kamaytirish yo'llarini ko'rib chiqing.`, level: 'danger' });
    }
    if (sorted.length >= 3 && sorted[2][1].total / grandTotal > 0.25) {
      recommendations.push({ icon: '📊', text: `Top 3 kategoriya umumiy xarajatlarning ${Math.round((sorted[0][1].total + sorted[1][1].total + sorted[2][1].total) / grandTotal * 100)}% ini tashkil etmoqda. Xarajatlarni diversifikatsiya qilish tavsiya etiladi.`, level: 'warning' });
    }
    if (grandTotal > 5000000) {
      recommendations.push({ icon: '💡', text: `Bu oy umumiy xarajat ${Utils.formatMoneyShort(grandTotal)}. Material va texnik xarajatlarni optimallashtirish uchun yetkazib beruvchilardan raqobatbardosh narxlarni so'rab ko'ring.`, level: 'info' });
    }
    const dayCount = reports.length || 1;
    const avgPerDay = Math.round(grandTotal / dayCount);
    recommendations.push({ icon: '📅', text: `Kunlik o'rtacha xarajat: ${Utils.formatMoneyShort(avgPerDay)}. Oylik rejaga nisbatan taqqoslang.`, level: 'info' });

    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📂 Xarajatlar chuqur tahlili</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--brand-danger);font-weight:700">
            Jami: ${grandTotal.toLocaleString('ru-RU').replace(/,/g,' ')} so'm
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);">

          <!-- Kategoriyalar breakdown -->
          <div>
            <div style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-3);color:var(--text-secondary)">Kategoriyalar bo'yicha</div>
            <div style="display:flex;flex-direction:column;gap:var(--sp-3);">
              ${sorted.map(([catId, data], i) => {
                const pct = grandTotal > 0 ? ((data.total / grandTotal) * 100).toFixed(1) : 0;
                const barW = maxVal > 0 ? ((data.total / maxVal) * 100).toFixed(1) : 0;
                const colors = ['var(--brand-danger)', 'var(--brand-warning)', 'var(--brand-primary)', '#22d3ee', '#a855f7', '#10b981'];
                const color = colors[i % colors.length];
                return `
                  <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <span style="font-size:var(--text-sm);font-weight:${i===0?700:500}">${data.name}</span>
                      <div style="text-align:right">
                        <span style="font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;color:${color}">${Utils.formatMoneyShort(data.total)}</span>
                        <span style="font-size:10px;color:var(--text-muted);margin-left:4px">${pct}%</span>
                      </div>
                    </div>
                    <div style="height:8px;background:var(--bg-elevated);border-radius:4px;overflow:hidden;">
                      <div style="height:100%;width:${barW}%;background:${color};border-radius:4px;transition:width 0.5s;"></div>
                    </div>
                    <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${data.count} marta · ${data.total.toLocaleString('ru-RU').replace(/,/g,' ')} so'm</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Tafsiyalar + pie-like summary -->
          <div>
            <div style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-3);color:var(--text-secondary)">🤖 Tizim tavsiyalari</div>
            <div style="display:flex;flex-direction:column;gap:var(--sp-3);">
              ${recommendations.map(r => `
                <div style="padding:var(--sp-3) var(--sp-4);
                  background:${{ danger:'rgba(239,68,68,0.08)', warning:'rgba(245,158,11,0.08)', info:'rgba(99,102,241,0.08)' }[r.level]};
                  border-left:3px solid ${{ danger:'var(--brand-danger)', warning:'var(--brand-warning)', info:'var(--brand-primary)' }[r.level]};
                  border-radius:0 var(--r-md) var(--r-md) 0;">
                  <div style="font-size:var(--text-sm);line-height:1.5;">${r.icon} ${r.text}</div>
                </div>
              `).join('')}
            </div>

            <!-- Top kategoriya highlight -->
            ${topCat ? `
              <div style="margin-top:var(--sp-4);padding:var(--sp-4);background:rgba(239,68,68,0.06);border:2px solid rgba(239,68,68,0.2);border-radius:var(--r-lg);">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--brand-danger);margin-bottom:var(--sp-2)">🔥 Eng katta xarajat</div>
                <div style="font-size:var(--text-md);font-weight:700;">${topCat[1].name}</div>
                <div style="font-family:var(--font-mono);font-size:1.2em;font-weight:800;color:var(--brand-danger);">${Utils.formatMoneyShort(topCat[1].total)}</div>
                <div style="font-size:10px;color:var(--text-muted)">Umumiy xarajatlarning ${topPct}%i</div>
              </div>
            ` : ''}
          </div>

        </div>

        <!-- Batafsil kunlik xarajatlar jadvali -->
        <div style="margin-top:var(--sp-5);border-top:1px solid var(--border-subtle);padding-top:var(--sp-4);">
          <div style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-3);color:var(--text-secondary)">📋 Batafsil xarajatlar ro'yxati</div>
          <div class="table-wrap">
            <table class="table" style="font-size:var(--text-sm);">
              <thead><tr><th>Sana</th><th>Kategoriya</th><th>Tavsif</th><th class="right">Summa</th></tr></thead>
              <tbody>
                ${reports.flatMap(r =>
                  (r.expenses || []).map(exp => {
                    const catName = catMap[exp.categoryId || exp.category]?.name || 'Boshqa';
                    return `<tr>
                      <td style="white-space:nowrap">${Utils.formatDateShort(r.date)}</td>
                      <td><span class="badge badge-neutral">${catName}</span></td>
                      <td style="color:var(--text-secondary)">${exp.description || '—'}</td>
                      <td class="right mono" style="color:var(--brand-danger)">-${(Number(exp.amount)||0).toLocaleString('ru-RU').replace(/,/g,' ')}</td>
                    </tr>`;
                  })
                ).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Xarajatlar yo\'q</td></tr>'}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3"><strong>JAMI XARAJAT</strong></td>
                  <td class="right mono" style="color:var(--brand-danger)"><strong>-${grandTotal.toLocaleString('ru-RU').replace(/,/g,' ')}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // ========== PRINT FUNCTIONS ==========

  printReport() {
    const { doctors, doctorDetails, monthly, settings, nurses, reports, payTypes } = this._data;
    const clinicName = settings.clinicName || 'FDC Stomatologiya';
    const monthLabel = Utils.getMonthName(this.month, this.year);

    const doctorPrintSections = doctors.map(doc => {
      const detail = doctorDetails[doc.id];
      if (!detail || (!detail.jTushum && !detail.jImplant)) return '';
      return this._printDoctorSection(doc, detail, clinicName, monthLabel);
    }).filter(Boolean).join('<div style="page-break-after:always"></div>');

    const overallSection = this._printOverallSection(monthly, settings, nurses, payTypes, clinicName, monthLabel);

    this._openPrintWindow(overallSection + '<div style="page-break-after:always"></div>' + doctorPrintSections);
  },

  printDoctorReport(docId) {
    const doc = this._data.doctors.find(d => d.id === docId);
    const detail = this._data.doctorDetails[docId];
    if (!doc || !detail) return;
    const clinicName = this._data.settings.clinicName || 'FDC Stomatologiya';
    const monthLabel = Utils.getMonthName(this.month, this.year);
    this._openPrintWindow(this._printDoctorSection(doc, detail, clinicName, monthLabel));
  },

  _printDoctorSection(doc, detail, clinicName, monthLabel) {
    const dayRows = detail.days.map((d, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${Utils.formatDateShort(d.date)}</td>
        <td style="text-align:right">${d.tushum ? d.tushum.toLocaleString('ru-RU').replace(/,/g,' ') : '—'}</td>
        <td style="text-align:right">${d.texnik ? d.texnik.toLocaleString('ru-RU').replace(/,/g,' ') : '—'}</td>
        <td style="text-align:right">${d.implant || '—'}</td>
        <td style="text-align:right">${d.avans ? d.avans.toLocaleString('ru-RU').replace(/,/g,' ') : '—'}</td>
      </tr>
    `).join('');

    return `
      <div class="print-section">
        <div class="print-clinic">${clinicName}</div>
        <h2 class="print-title">${doc.name} — ${monthLabel} oy hisobi</h2>
        <p class="print-subtitle">Foiz: ${detail.percent}% · Implant narxi: ${detail.implantValue.toLocaleString('ru-RU').replace(/,/g,' ')} so'm/ta</p>

        <table class="print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Sana</th>
              <th>Tushum</th>
              <th>Texnik</th>
              <th>Implant (soni)</th>
              <th>Avans</th>
            </tr>
          </thead>
          <tbody>
            ${dayRows}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2"><strong>JAMI</strong></td>
              <td style="text-align:right"><strong>${detail.jTushum.toLocaleString('ru-RU').replace(/,/g,' ')}</strong></td>
              <td style="text-align:right"><strong>${detail.jTexnik.toLocaleString('ru-RU').replace(/,/g,' ')}</strong></td>
              <td style="text-align:right"><strong>${detail.jImplant}</strong></td>
              <td style="text-align:right"><strong>${detail.jAvans.toLocaleString('ru-RU').replace(/,/g,' ')}</strong></td>
            </tr>
          </tfoot>
        </table>

        <div class="print-formula-grid" style="grid-template-columns:repeat(${Math.min(detail.stepResults.length || 4, 4)}, 1fr)">
          ${this._printStepBoxes(detail.stepResults)}
        </div>

        <div class="print-signatures">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Direktor imzosi</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Kassir imzosi</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Vrach imzosi: ${doc.name}</div>
          </div>
        </div>

        <div class="print-date">Sana: ________ / _________ / 2026</div>
      </div>
    `;
  },

  // Dynamic print formula boxes using FormulaEngine.calcSteps results
  _printStepBoxes(stepResults) {
    if (!stepResults || !stepResults.length) return '';
    return stepResults.map((s, i) => {
      const isLast = i === stepResults.length - 1;
      const isResult = s.type === 'result';
      const highlight = isResult || isLast ? ' highlight' : '';
      const val = Number(s.value) || 0;
      return `
        <div class="print-formula-box${highlight}">
          <div class="pfb-label">${s.emoji || ''} ${s.id} — ${s.label}</div>
          <div class="pfb-formula">${s.exprText}</div>
          <div class="pfb-value"${isResult || isLast ? ' style="font-size:1.3em"' : ''}>${val.toLocaleString('ru-RU').replace(/,/g,' ')} so'm</div>
        </div>`;
    }).join('');
  },

  _printOverallSection(monthly, settings, nurses, payTypes, clinicName, monthLabel) {
    const ptRows = payTypes.map(pt => {
      const amt = monthly.payments[pt.id] || 0;
      if (!amt) return '';
      return `<tr><td>${pt.name}</td><td style="text-align:right">${amt.toLocaleString('ru-RU').replace(/,/g,' ')}</td></tr>`;
    }).join('');

    return `
      <div class="print-section">
        <div class="print-clinic">${clinicName}</div>
        <h2 class="print-title">${monthLabel} — Oylik moliyaviy hisobot</h2>

        <table class="print-table" style="margin-bottom:16px">
          <thead><tr><th>Ko'rsatkich</th><th style="text-align:right">Summa (so'm)</th></tr></thead>
          <tbody>
            <tr><td><strong>Jami tushum</strong></td><td style="text-align:right"><strong>${monthly.tushum.toLocaleString('ru-RU').replace(/,/g,' ')}</strong></td></tr>
            ${ptRows}
            <tr><td>💵 Kassadagi naqt pul</td><td style="text-align:right">${monthly.kassaNaqd.toLocaleString('ru-RU').replace(/,/g,' ')}</td></tr>
            <tr><td>💸 Umumiy avans (vrach)</td><td style="text-align:right">-${monthly.doctorAvansTotal.toLocaleString('ru-RU').replace(/,/g,' ')}</td></tr>
            <tr><td>💸 Umumiy avans (hamshira)</td><td style="text-align:right">-${monthly.nurseTotal.toLocaleString('ru-RU').replace(/,/g,' ')}</td></tr>
            <tr><td>📋 Kunlik xarajatlar</td><td style="text-align:right">-${monthly.totalXarajat.toLocaleString('ru-RU').replace(/,/g,' ')}</td></tr>
            <tr class="total-row"><td><strong>📌 BERILISHI KERAK</strong></td><td style="text-align:right"><strong>${monthly.berilishiKerak.toLocaleString('ru-RU').replace(/,/g,' ')}</strong></td></tr>
            <tr><td>Arenda</td><td style="text-align:right">-${(settings.arenda||0).toLocaleString('ru-RU').replace(/,/g,' ')}</td></tr>
            <tr><td>Kommunal</td><td style="text-align:right">-${(settings.kommunal||0).toLocaleString('ru-RU').replace(/,/g,' ')}</td></tr>
            <tr><td>Vrachlar VU jami</td><td style="text-align:right">-${monthly.totalVU.toLocaleString('ru-RU').replace(/,/g,' ')}</td></tr>
            <tr class="total-row"><td><strong>OYLIK FOYDA</strong></td><td style="text-align:right"><strong>${monthly.foyda.toLocaleString('ru-RU').replace(/,/g,' ')}</strong></td></tr>
          </tbody>
        </table>

        <div class="print-signatures">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Direktor imzosi</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Kassir imzosi</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Bosh vrach imzosi</div>
          </div>
        </div>
        <div class="print-date">Sana: ________ / _________ / 2026</div>
      </div>
    `;
  },

  _openPrintWindow(bodyContent) {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="uz"><head>
      <meta charset="utf-8">
      <title>DentAdmin — Oylik hisobot</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 20px; }
        .print-section { max-width: 800px; margin: 0 auto 40px; }
        .print-clinic { font-size: 13pt; font-weight: bold; color: #444; margin-bottom: 4px; }
        .print-title { font-size: 16pt; font-weight: bold; margin-bottom: 4px; }
        .print-subtitle { font-size: 10pt; color: #666; margin-bottom: 16px; }

        .print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .print-table th, .print-table td { border: 1px solid #ccc; padding: 6px 10px; font-size: 10pt; }
        .print-table th { background: #f0f0f0; font-weight: bold; text-align: left; }
        .print-table tfoot td, .total-row td { background: #e8f0ff; font-weight: bold; }

        .print-formula-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
        .print-formula-box { border: 1.5px solid #ccc; border-radius: 8px; padding: 12px; }
        .print-formula-box.highlight { border-color: #3b4ed8; background: #eef0ff; }
        .pfb-label { font-weight: bold; font-size: 10pt; margin-bottom: 4px; color: #333; }
        .pfb-formula { font-size: 9pt; color: #666; font-family: monospace; margin-bottom: 8px; }
        .pfb-value { font-size: 14pt; font-weight: bold; font-family: monospace; color: #111; }
        .print-formula-box.highlight .pfb-value { color: #2233cc; }

        .print-signatures { display: flex; gap: 40px; margin-top: 32px; margin-bottom: 12px; }
        .sig-block { flex: 1; text-align: center; }
        .sig-line { border-bottom: 1.5px solid #333; height: 40px; margin-bottom: 6px; }
        .sig-label { font-size: 9pt; color: #555; }

        .print-date { font-size: 10pt; color: #555; margin-top: 8px; }

        @media print {
          body { padding: 10px; }
          button { display: none; }
        }
      </style>
    </head><body>
      <div style="text-align:right;margin-bottom:20px;position:fixed;top:10px;right:20px;z-index:999">
        <button onclick="window.print()" style="padding:8px 16px;background:#3b4ed8;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12pt;">🖨️ Chop etish</button>
        <button onclick="window.close()" style="padding:8px 16px;background:#888;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12pt;margin-left:8px;">✕ Yopish</button>
      </div>
      <div style="margin-top:50px">${bodyContent}</div>
    </body></html>`);
    w.document.close();
  },

  // ========== NAVIGATION & EXPORT ==========
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

  exportCSV() {
    const { reports, doctors, payTypes } = this._data;
    const headers = ['Sana', 'Jami tushum', ...payTypes.map(p=>p.name), 'Xarajat', 'Kassadagi naqt'];
    const rows = reports.map(r => {
      const dayT = doctors.reduce((s,d)=>s+(Number(((r.doctors||{})[d.id]||{}).tushum)||0),0);
      const ptVals = payTypes.map(pt => (r.payments||{})[pt.id]||0);
      const naqt = dayT - ptVals.reduce((a,b)=>a+b,0);
      const xarajat = (r.expenses||[]).reduce((s,e)=>s+(Number(e.amount)||0),0);
      return [Utils.formatDateShort(r.date), dayT, ...ptVals, xarajat, naqt];
    });
    Utils.exportCSV([headers, ...rows], `hisobot-${this.year}-${this.month}.csv`);
    Utils.toast('success', 'CSV yuklab olindi');
  }
};
