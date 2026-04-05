/**
 * Doctor Salary Detail Page
 */

const AdminSalary = {
  year: null,
  month: null,

  render(params = {}) {
    const session = Auth.requireAuth(['admin', 'super_admin']);
    if (!session) return;

    const now = Utils.getCurrentMonth();
    this.year = parseInt(params.year) || now.year;
    this.month = parseInt(params.month) || now.month;
    const clinicId = session.clinicId;

    const doctors = DB.getDoctors(clinicId);
    const reports = DB.getMonthlyReports(clinicId, this.year, this.month);

    const content = `
      ${Components.renderPageHeader(
        '💰 Vrachlar ish haqi hisob-kitobi',
        `${Utils.getMonthName(this.month, this.year)}`,
        `<div class="date-nav">
          <button class="date-nav-btn" onclick="AdminSalary.prevMonth()">${Utils.icon('chevron_left')}</button>
          <span class="date-nav-label">${Utils.getMonthName(this.month)} ${this.year}</span>
          <button class="date-nav-btn" onclick="AdminSalary.nextMonth()">${Utils.icon('chevron_right')}</button>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="AdminSalary.exportSalary()">📥 Export</button>`
      )}
      <div class="page-body">
        ${doctors.map(doc => this.renderDoctorCard(doc, reports, clinicId)).join('')}
      </div>
    `;

    document.getElementById('app').innerHTML = Components.renderLayout(session, '/admin/salary', content);
  },

  renderDoctorCard(doc, reports, clinicId) {
    const stats = FormulaEngine.calcMonthlyDoctor(doc, reports);
    const days = reports.filter(r => {
      const entry = (r.doctors || {})[doc.id] || {};
      return entry.tushum || entry.texnik || entry.implantCount;
    });

    const dayRows = days.map(r => {
      const entry = (r.doctors || {})[doc.id] || {};
      const vu = FormulaEngine.calcVU(doc, {
        tushum: entry.tushum || 0,
        texnik: entry.texnik || 0,
        implantCount: entry.implantCount || 0,
        implantSum: entry.implantSum || 0,
        avans: 0
      });
      return `<tr>
        <td>${Utils.formatDateShort(r.date)}</td>
        <td class="right mono">${Utils.formatMoneyShort(entry.tushum || 0)}</td>
        <td class="right mono">${Utils.formatMoneyShort(entry.texnik || 0)}</td>
        <td class="right center">${entry.implantCount || 0}</td>
        <td class="right mono">${Utils.formatMoneyShort(vu)}</td>
        <td class="right mono" style="color:var(--brand-warning)">${Utils.formatMoneyShort(entry.avans || 0)}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:var(--sp-5)">Bu oy ish yo'q</td></tr>`;

    return `
      <div class="card" style="margin-bottom:var(--sp-6);">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:var(--sp-4);">
            <div class="doctor-avatar" style="width:48px;height:48px;font-size:16px;background:${doc.color || 'var(--grad-brand)'}">
              ${Utils.getInitials(doc.name)}
            </div>
            <div>
              <div style="font-size:var(--text-lg);font-weight:700;">${doc.name}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);font-family:var(--font-mono);">${doc.formula}</div>
            </div>
          </div>
          <div style="display:flex;gap:var(--sp-8);">
            <div class="salary-item" style="text-align:right">
              <div class="salary-item-label">Jami VU</div>
              <div style="font-size:var(--text-xl);font-weight:800;font-family:var(--font-mono);color:var(--brand-success)">
                ${Utils.formatMoneyShort(stats.totalVU)}
              </div>
            </div>
            <div class="salary-item" style="text-align:right">
              <div class="salary-item-label">Avans</div>
              <div style="font-size:var(--text-xl);font-weight:700;font-family:var(--font-mono);color:var(--brand-warning)">
                ${Utils.formatMoneyShort(stats.totalAvans)}
              </div>
            </div>
            <div class="salary-item" style="text-align:right">
              <div class="salary-item-label">Berilishi kerak</div>
              <div style="font-size:var(--text-xl);font-weight:800;font-family:var(--font-mono);color:${stats.berilishiKerak >= 0 ? 'var(--brand-success)' : 'var(--brand-danger)'}">
                ${stats.berilishiKerak >= 0 ? '' : '-'}${Utils.formatMoneyShort(Math.abs(stats.berilishiKerak))}
              </div>
            </div>
          </div>
        </div>

        <!-- Stats row -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sp-3);margin-bottom:var(--sp-5);">
          <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--r-md);padding:var(--sp-3);text-align:center;">
            <div style="font-size:var(--text-xs);color:var(--text-muted)">Tushum</div>
            <div style="font-family:var(--font-mono);font-weight:700">${Utils.formatMoneyShort(stats.totalTushum)}</div>
          </div>
          <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--r-md);padding:var(--sp-3);text-align:center;">
            <div style="font-size:var(--text-xs);color:var(--text-muted)">Texnik</div>
            <div style="font-family:var(--font-mono);font-weight:700">${Utils.formatMoneyShort(stats.totalTexnik)}</div>
          </div>
          <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--r-md);padding:var(--sp-3);text-align:center;">
            <div style="font-size:var(--text-xs);color:var(--text-muted)">Implant soni</div>
            <div style="font-family:var(--font-mono);font-weight:700">${stats.totalImplantCount} ta</div>
          </div>
          <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--r-md);padding:var(--sp-3);text-align:center;">
            <div style="font-size:var(--text-xs);color:var(--text-muted)">Ish kunlari</div>
            <div style="font-family:var(--font-mono);font-weight:700">${days.length} kun</div>
          </div>
        </div>

        <!-- Daily breakdown -->
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Sana</th>
                <th class="right">Tushum</th>
                <th class="right">Texnik</th>
                <th class="center">Implant</th>
                <th class="right">VU</th>
                <th class="right">Avans</th>
              </tr>
            </thead>
            <tbody>${dayRows}</tbody>
            <tfoot>
              <tr>
                <td><strong>JAMI</strong></td>
                <td class="right mono"><strong>${Utils.formatMoneyShort(stats.totalTushum)}</strong></td>
                <td class="right mono"><strong>${Utils.formatMoneyShort(stats.totalTexnik)}</strong></td>
                <td class="center"><strong>${stats.totalImplantCount} ta</strong></td>
                <td class="right mono" style="color:var(--brand-success)"><strong>${Utils.formatMoneyShort(stats.totalVU)}</strong></td>
                <td class="right mono" style="color:var(--brand-warning)"><strong>${Utils.formatMoneyShort(stats.totalAvans)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Imzo qatori -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:var(--sp-6);padding-top:var(--sp-5);border-top:1px solid var(--border-subtle);">
          <div>
            <div style="font-size:var(--text-sm);color:var(--text-muted)">Rahbar imzosi:</div>
            <div style="margin-top:var(--sp-8);border-top:1px solid var(--border-default);width:200px;padding-top:4px;font-size:var(--text-xs);color:var(--text-muted)">Rahbar</div>
          </div>
          <div>
            <div style="font-size:var(--text-sm);color:var(--text-muted)">Vrach imzosi:</div>
            <div style="margin-top:var(--sp-8);border-top:1px solid var(--border-default);width:200px;padding-top:4px;font-size:var(--text-xs);color:var(--text-muted)">${doc.name}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:var(--text-sm);color:var(--text-muted)">Oylik yakuniy summa:</div>
            <div style="font-size:var(--text-2xl);font-weight:800;font-family:var(--font-mono);color:${stats.berilishiKerak >= 0 ? 'var(--brand-success)' : 'var(--brand-danger)'}">
              ${Utils.formatMoney(Math.abs(stats.berilishiKerak))}
            </div>
            ${stats.berilishiKerak < 0 ? '<div style="font-size:11px;color:var(--brand-warning)">Ortiqcha avans bor</div>' : ''}
          </div>
        </div>
      </div>
    `;
  },

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
