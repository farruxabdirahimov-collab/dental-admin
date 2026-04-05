/**
 * Admin Dashboard
 */

const AdminDashboard = {
  async render() {
    const session = Auth.requireAuth(['admin', 'super_admin']);
    if (!session) return;

    const clinicId = session.clinicId;
    const { year, month } = Utils.getCurrentMonth();

    // Joriy oy + oxirgi 6 oy parallel yuklash
    const months = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i, y = year;
      if (m <= 0) { m += 12; y -= 1; }
      months.push({ y, m, label: Utils.getMonthName(m) });
    }

    const [monthly, ...last5] = await Promise.all([
      FormulaEngine.calcMonthlyTotal(clinicId, year, month),
      ...months.map(x => FormulaEngine.calcMonthlyTotal(clinicId, x.y, x.m))
    ]);

    const last6 = months.map((x, i) => ({ label: x.label, tushum: last5[i].tushum, foyda: last5[i].foyda }));

    const settings = DB.getSettings(clinicId);
    const paymentTypes = DB.getPaymentTypes(clinicId).filter(p => p.active && p.id !== 'naqd');
    const doctors = DB.getDoctors(clinicId);

    const chartData = {
      labels: last6.map(d => d.label),
      tushum: last6.map(d => d.tushum),
      foyda: last6.map(d => d.foyda)
    };

    // To'lov turlari taqsimoti
    const paymentRows = paymentTypes.map(pt => {
      const amt = monthly.payments[pt.id] || 0;
      const pct = monthly.tushum ? Math.round((amt / monthly.tushum) * 100) : 0;
      return `
        <div class="summary-row">
          <span class="summary-row-label">${pt.icon || ''} ${pt.name}</span>
          <span class="summary-row-val">${Utils.formatMoneyShort(amt)}</span>
        </div>
      `;
    }).join('');

    // Top vrachlar
    const topDoctors = doctors.map(d => ({
      doctor: d,
      stats: monthly.doctorStats[d.id] || {}
    })).sort((a, b) => (b.stats.totalTushum || 0) - (a.stats.totalTushum || 0)).slice(0, 5);

    const topDocRows = topDoctors.map((td, i) => `
      <tr>
        <td><div style="display:flex;align-items:center;gap:var(--sp-3);">
          <div class="doctor-avatar" style="background:${td.doctor.color || 'var(--grad-brand)'}; width:32px; height:32px; font-size:12px;">${Utils.getInitials(td.doctor.name)}</div>
          ${td.doctor.name}
        </div></td>
        <td class="right"><span class="mono">${Utils.formatMoneyShort(td.stats.totalTushum || 0)}</span></td>
        <td class="right"><span class="mono positive" style="color:var(--brand-success)">${Utils.formatMoneyShort(td.stats.totalVU || 0)}</span></td>
        <td class="right"><span class="badge ${(td.stats.berilishiKerak || 0) >= 0 ? 'badge-success' : 'badge-danger'}">${Utils.formatMoneyShort(Math.abs(td.stats.berilishiKerak || 0))}</span></td>
      </tr>
    `).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:var(--sp-6)">Bu oy ma'lumot yo'q</td></tr>`;

    const todayStr = Utils.getTodayStr();
    const todayReport = DB.getDailyReport(clinicId, todayStr);
    // Bugungi tushum = vrachlar tushumi yig'indisi
    const todayTushum = todayReport ? doctors.reduce((s, doc) => {
      const e = (todayReport.doctors || {})[doc.id] || {};
      return s + (Number(e.tushum) || 0);
    }, 0) : 0;
    const todayKassa = todayReport ? todayTushum - paymentTypes.reduce((s, pt) => s + (Number((todayReport.payments||{})[pt.id])||0), 0) : 0;

    const content = `
      ${Components.renderPageHeader(
        `${Utils.getMonthName(month, year)} — Dashboard`,
        `Bugun: ${Utils.formatDate(todayStr)}`,
        `<button class="btn btn-primary" onclick="Router.go('/reception/daily')">
          ${Utils.icon('plus', 14)} Kunlik hisobot
        </button>`
      )}
      <div class="page-body dashboard-grid">

        <!-- Top Stats -->
        <div class="stats-grid stats-grid-4">
          <div class="stat-card" style="--stat-color: var(--grad-brand)">
            <div class="stat-label">Oylik jami tushum</div>
            <div class="stat-value sm">${Utils.formatMoneyShort(monthly.tushum)}</div>
            <div class="stat-change up">${Utils.icon('trend', 12)} ${monthly.reportCount} kun hisoboti</div>
            <div class="stat-icon">${Utils.icon('money', 20)}</div>
          </div>
          <div class="stat-card" style="--stat-color: var(--grad-success)">
            <div class="stat-label">💵 Oylik kassadagi naqt</div>
            <div class="stat-value sm" style="color:${monthly.kassaNaqd >= 0 ? 'var(--brand-success)' : 'var(--brand-danger)'}">
              ${Utils.formatMoneyShort(monthly.kassaNaqd)}
            </div>
            <div class="stat-change">= Tushum - Naqt bo'lmagan</div>
            <div class="stat-icon">${Utils.icon('trend', 20)}</div>
          </div>
          <div class="stat-card" style="--stat-color: var(--grad-cyan)">
            <div class="stat-label">📌 Oylik berilishi kerak</div>
            <div class="stat-value sm" style="color:${monthly.berilishiKerak >= 0 ? 'var(--brand-primary)' : 'var(--brand-danger)'}">
              ${Utils.formatMoneyShort(Math.abs(monthly.berilishiKerak))}
            </div>
            <div class="stat-change">${monthly.berilishiKerak >= 0 ? 'Kassa qoldig\'i' : '⚠️ Ortiqcha sarflangan'}</div>
            <div class="stat-icon">${Utils.icon('calendar', 20)}</div>
          </div>
          <div class="stat-card" style="--stat-color: var(--grad-warning)">
            <div class="stat-label">Bugungi kassa</div>
            <div class="stat-value sm">${Utils.formatMoneyShort(todayKassa)}</div>
            <div class="stat-change">${todayReport ? `Tushum: ${Utils.formatMoneyShort(todayTushum)}` : '⏳ Kiritilmagan'}</div>
            <div class="stat-icon">${Utils.icon('users', 20)}</div>
          </div>
        </div>

        <!-- Chart + Payment breakdown -->
        <div class="dashboard-mid">
          <div class="chart-container">
            <div class="chart-header">
              <div class="card-title">📈 6 oylik tushum va foyda</div>
              <button class="btn btn-ghost btn-sm" onclick="Router.go('/admin/yearly')">Batafsil →</button>
            </div>
            <div class="chart-canvas-wrap">
              <canvas id="dashboard-chart"></canvas>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">💳 Naqt bo'lmagan to'lovlar</div></div>
            <div class="summary-row">
              <span class="summary-row-label" style="font-weight:700">Jami tushum</span>
              <span class="summary-row-val" style="color:var(--brand-primary);font-size:var(--text-md)">${Utils.formatMoneyShort(monthly.tushum)}</span>
            </div>
            <div class="divider" style="margin:var(--sp-3) 0"></div>
            ${paymentTypes.map(pt => {
              const amt = monthly.payments[pt.id] || 0;
              return amt > 0 ? `<div class="summary-row"><span class="summary-row-label">${pt.icon||''} ${pt.name}</span><span class="summary-row-val money negative">-${Utils.formatMoneyShort(amt)}</span></div>` : '';
            }).join('')}
            <div class="divider" style="margin:var(--sp-3) 0"></div>
            <div class="summary-row">
              <span class="summary-row-label" style="font-weight:700">💵 Kassadagi naqt</span>
              <span class="summary-row-val" style="color:var(--brand-success);font-weight:800">${Utils.formatMoneyShort(monthly.kassaNaqd)}</span>
            </div>
          </div>
        </div>

        <!-- Doctors table -->
        <div class="section">
          <div class="section-header">
            <div class="section-title">👨‍⚕️ Vrachlar — ${Utils.getMonthName(month)} hisobi</div>
            <button class="btn btn-secondary btn-sm" onclick="Router.go('/admin/salary')">Batafsil →</button>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Vrach</th>
                  <th class="right">Tushum</th>
                  <th class="right">VU (ulush)</th>
                  <th class="right">Berilishi kerak</th>
                </tr>
              </thead>
              <tbody>${topDocRows}</tbody>
              <tfoot>
                <tr>
                  <td><strong>JAMI</strong></td>
                  <td class="right"><span class="mono">${Utils.formatMoneyShort(Object.values(monthly.doctorStats).reduce((s,d) => s + (d.totalTushum||0), 0))}</span></td>
                  <td class="right"><span class="mono">${Utils.formatMoneyShort(monthly.totalVU)}</span></td>
                  <td class="right"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Xarajatlar + Berilishi kerak -->
        <div class="dashboard-bot">
          <div class="card">
            <div class="card-header"><div class="card-title">📌 Oylik kassa holati</div></div>
            <div class="summary-row" style="font-weight:700">
              <span class="summary-row-label">Jami tushum</span>
              <span class="summary-row-val" style="color:var(--brand-primary)">${Utils.formatMoneyShort(monthly.tushum)}</span>
            </div>
            <div class="divider" style="margin:var(--sp-3) 0"></div>
            <div class="summary-row">
              <span class="summary-row-label">Umumiy avans (vrach)</span>
              <span class="summary-row-val money negative">-${Utils.formatMoneyShort(monthly.doctorAvansTotal)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-row-label">Umumiy avans (hamshira)</span>
              <span class="summary-row-val money negative">-${Utils.formatMoneyShort(monthly.nurseTotal)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-row-label">Kunlik xarajatlar</span>
              <span class="summary-row-val money negative">-${Utils.formatMoneyShort(monthly.totalXarajat)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-row-label">Bank/inkassa</span>
              <span class="summary-row-val money negative">-${Utils.formatMoneyShort(monthly.bankTotal)}</span>
            </div>
            <div style="padding:var(--sp-4);background:rgba(99,102,241,0.08);border:2px solid rgba(99,102,241,0.25);border-radius:var(--r-lg);margin-top:var(--sp-3);">
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;">📌 BERILISHI KERAK (oylik)</div>
              <div style="font-family:var(--font-mono);font-size:var(--text-xl);font-weight:900;color:${monthly.berilishiKerak>=0?'var(--brand-primary)':'var(--brand-danger)'}">
                ${monthly.berilishiKerak >= 0 ? '' : '−'}${Utils.formatMoneyShort(Math.abs(monthly.berilishiKerak))}
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">💰 Foyda hisobi</div></div>
            <div class="summary-row"><span class="summary-row-label">Jami tushum</span><span class="summary-row-val" style="color:var(--brand-primary)">${Utils.formatMoneyShort(monthly.tushum)}</span></div>
            <div class="summary-row"><span class="summary-row-label">Arenda</span><span class="summary-row-val money negative">-${Utils.formatMoneyShort(settings.arenda||0)}</span></div>
            <div class="summary-row"><span class="summary-row-label">Kommunal</span><span class="summary-row-val money negative">-${Utils.formatMoneyShort(settings.kommunal||0)}</span></div>
            <div class="summary-row"><span class="summary-row-label">Kunlik xarajatlar</span><span class="summary-row-val money negative">-${Utils.formatMoneyShort(monthly.totalXarajat)}</span></div>
            <div class="summary-row"><span class="summary-row-label">Vrachlar VU</span><span class="summary-row-val money negative">-${Utils.formatMoneyShort(monthly.totalVU)}</span></div>
            <div class="divider" style="margin:var(--sp-3) 0;"></div>
            <div class="summary-row">
              <span class="summary-row-label" style="font-weight:700">Oylik foyda</span>
              <span class="summary-row-val" style="color:${monthly.foyda >= 0 ? 'var(--brand-success)' : 'var(--brand-danger)'};font-size:var(--text-md);font-weight:800">${Utils.formatMoneyShort(monthly.foyda)}</span>
            </div>
          </div>
        </div>

      </div>
    `;

    document.getElementById('app').innerHTML = Components.renderLayout(session, '/admin/dashboard', content);

    // Chart
    setTimeout(() => {
      const ctx = document.getElementById('dashboard-chart');
      if (ctx && window.Chart) {
        if (ctx._chart) ctx._chart.destroy();
        ctx._chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: chartData.labels,
            datasets: [
              {
                label: 'Tushum',
                data: chartData.tushum,
                backgroundColor: 'rgba(99,102,241,0.6)',
                borderColor: '#6366f1',
                borderWidth: 2,
                borderRadius: 6,
              },
              {
                label: 'Foyda',
                data: chartData.foyda,
                backgroundColor: 'rgba(16,185,129,0.5)',
                borderColor: '#10b981',
                borderWidth: 2,
                borderRadius: 6,
                type: 'line',
                tension: 0.4,
                fill: false,
                pointBackgroundColor: '#10b981',
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: '#a0a0c0', font: { family: 'Inter' } } },
              tooltip: { callbacks: { label: ctx => Utils.formatMoney(ctx.raw) } }
            },
            scales: {
              x: { grid: { color: 'rgba(99,102,241,0.08)' }, ticks: { color: '#a0a0c0' } },
              y: {
                grid: { color: 'rgba(99,102,241,0.08)' },
                ticks: { color: '#a0a0c0', callback: v => Utils.formatMoneyShort(v) }
              }
            }
          }
        });
      }
    }, 100);
  }
};
