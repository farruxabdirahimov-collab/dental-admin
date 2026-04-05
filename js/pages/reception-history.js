/**
 * Reception History Page
 */

const ReceptionHistory = {
  render(params = {}) {
    const session = Auth.requireAuth(['admin', 'receptionist', 'super_admin']);
    if (!session) return;

    const clinicId = session.clinicId;
    const now = Utils.getCurrentMonth();
    const year = parseInt(params.year) || now.year;
    const month = parseInt(params.month) || now.month;

    const reports = DB.getMonthlyReports(clinicId, year, month)
      .sort((a, b) => b.date.localeCompare(a.date));

    const paymentTypes = DB.getPaymentTypes(clinicId).filter(p => p.active);
    const doctors = DB.getDoctors(clinicId);

    const content = `
      ${Components.renderPageHeader(
        '📅 Kunlar tarixi',
        `${Utils.getMonthName(month, year)} — ${reports.length} kun`,
        `<div class="date-nav">
          <button class="date-nav-btn" onclick="ReceptionHistory.prevMonth(${year},${month})">${Utils.icon('chevron_left')}</button>
          <span class="date-nav-label">${Utils.getMonthName(month)} ${year}</span>
          <button class="date-nav-btn" onclick="ReceptionHistory.nextMonth(${year},${month})">${Utils.icon('chevron_right')}</button>
        </div>`
      )}
      <div class="page-body">
        ${reports.length ? reports.map(r => {
          const tushum = paymentTypes.reduce((s, pt) => s + (Number((r.payments||{})[pt.id])||0), 0);
          const xarajat = (r.expenses||[]).reduce((s,e) => s + (Number(e.amount)||0), 0);

          const payRow = paymentTypes.filter(pt => (r.payments||{})[pt.id]).map(pt => `
            <span class="badge badge-neutral">${pt.icon||''} ${pt.name}: ${Utils.formatMoneyShort((r.payments||{})[pt.id])}</span>
          `).join('');

          const docRows = doctors.map(doc => {
            const entry = (r.doctors||{})[doc.id];
            if (!entry?.tushum && !entry?.texnik) return '';
            const vu = FormulaEngine.calcVU(doc, { tushum: entry.tushum||0, texnik: entry.texnik||0, implantCount: entry.implantCount||0, avans: 0 });
            return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:var(--sp-2);">
                    <div class="doctor-avatar" style="width:24px;height:24px;font-size:10px;background:${doc.color||'var(--grad-brand)'};">${Utils.getInitials(doc.name)}</div>
                    ${doc.name}
                  </div>
                </td>
                <td class="right mono">${Utils.formatMoneyShort(entry.tushum||0)}</td>
                <td class="right mono">${Utils.formatMoneyShort(entry.texnik||0)}</td>
                <td class="center">${entry.implantCount||0}</td>
                <td class="right mono" style="color:var(--brand-success)">${Utils.formatMoneyShort(vu)}</td>
                <td class="right mono" style="color:var(--brand-warning)">${Utils.formatMoneyShort(entry.avans||0)}</td>
              </tr>
            `;
          }).filter(Boolean).join('');

          return `
            <div class="history-day">
              <div class="history-day-header" onclick="ReceptionHistory.toggleDay('${r.date}')">
                <div>
                  <div class="history-day-date">📅 ${Utils.formatDate(r.date)}</div>
                  <div style="margin-top:4px;" class="chip-list">${payRow}</div>
                </div>
                <div style="display:flex;align-items:center;gap:var(--sp-5);">
                  <span class="history-day-total">${Utils.formatMoneyShort(tushum)}</span>
                  <div style="display:flex;gap:var(--sp-3);">
                    <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();Router.go('/reception/daily?date=${r.date}')">
                      ${Utils.icon('edit',14)} Tahrirlash
                    </button>
                    <button class="btn btn-danger btn-sm btn-icon" onclick="event.stopPropagation();ReceptionHistory.deleteDay('${r.date}')">
                      ${Utils.icon('trash',14)}
                    </button>
                  </div>
                  <span class="history-expand-icon" id="exp-icon-${r.date}">${Utils.icon('chevron_down')}</span>
                </div>
              </div>
              <div class="history-day-body" id="day-body-${r.date}" style="display:none;">
                ${docRows ? `
                <div style="margin-bottom:var(--sp-4);">
                  <div class="settings-section-title" style="padding:0;border:none;margin-bottom:var(--sp-3);font-size:var(--text-sm)">Vrachlar</div>
                  <div class="table-wrap">
                    <table class="table">
                      <thead><tr>
                        <th>Vrach</th>
                        <th class="right">Tushum</th>
                        <th class="right">Texnik</th>
                        <th class="center">Implant</th>
                        <th class="right">VU</th>
                        <th class="right">Avans</th>
                      </tr></thead>
                      <tbody>${docRows}</tbody>
                    </table>
                  </div>
                </div>` : ''}
                ${(r.expenses||[]).length ? `
                <div>
                  <div class="settings-section-title" style="padding:0;border:none;margin-bottom:var(--sp-3);font-size:var(--text-sm)">Xarajatlar</div>
                  <div class="table-wrap">
                    <table class="table">
                      <thead><tr><th>Kategoriya</th><th>Tavsif</th><th class="right">Summa</th></tr></thead>
                      <tbody>
                        ${(r.expenses||[]).map(e => `<tr>
                          <td>${e.categoryId}</td>
                          <td>${e.description||'—'}</td>
                          <td class="right mono">${Utils.formatMoneyShort(e.amount)}</td>
                        </tr>`).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>` : ''}
                ${r.notes ? `<div style="margin-top:var(--sp-4);padding:var(--sp-3);background:var(--bg-elevated);border-radius:var(--r-md);font-size:var(--text-sm);color:var(--text-secondary)">📝 ${r.notes}</div>` : ''}
              </div>
            </div>
          `;
        }).join('') : `
          <div class="empty-state">
            <div class="empty-icon">📅</div>
            <div class="empty-title">Bu oyda hisobot yo'q</div>
            <div class="empty-sub">Kunlik hisobot kiritish uchun qabulxona sahifasiga o'ting</div>
            <button class="btn btn-primary" onclick="Router.go('/reception/daily')">Kunlik hisobot kiritish</button>
          </div>
        `}
      </div>
    `;

    document.getElementById('app').innerHTML = Components.renderLayout(session, '/reception/history', content);
    this._currentYear = year;
    this._currentMonth = month;
  },

  toggleDay(date) {
    const body = document.getElementById(`day-body-${date}`);
    const icon = document.getElementById(`exp-icon-${date}`);
    if (body) {
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : '';
      if (icon) icon.className = `history-expand-icon ${!isOpen ? 'open' : ''}`;
    }
  },

  async deleteDay(date) {
    const ok = await Utils.confirm(`${Utils.formatDate(date)} kunning hisobotini o'chirishni tasdiqlaysizmi?`);
    if (!ok) return;
    const session = Auth.getSession();
    DB.deleteDailyReport(session.clinicId, date);
    Utils.toast('success', 'O\'chirildi');
    this.render({ year: this._currentYear, month: this._currentMonth });
  },

  prevMonth(year, month) {
    let m = month - 1, y = year;
    if (m <= 0) { m = 12; y -= 1; }
    this.render({ year: y, month: m });
  },

  nextMonth(year, month) {
    let m = month + 1, y = year;
    if (m > 12) { m = 1; y += 1; }
    const now = Utils.getCurrentMonth();
    if (y > now.year || (y === now.year && m > now.month)) return;
    this.render({ year: y, month: m });
  }
};
