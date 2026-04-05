/**
 * Yearly Report Page with Charts
 */

const AdminYearly = {
  year: null,

  async render(params = {}) {
    const session = Auth.requireAuth(['admin', 'super_admin']);
    if (!session) return;

    this.year = parseInt(params.year) || new Date().getFullYear();
    const clinicId = session.clinicId;

    const monthlyData = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        FormulaEngine.calcMonthlyTotal(clinicId, this.year, i + 1)
          .then(data => ({ month: i + 1, ...data }))
      )
    );

    const totalTushum = monthlyData.reduce((s, d) => s + d.tushum, 0);
    const totalFoyda = monthlyData.reduce((s, d) => s + d.foyda, 0);
    const totalVU = monthlyData.reduce((s, d) => s + d.totalVU, 0);
    const maxTushum = Math.max(...monthlyData.map(d => d.tushum), 1);

    const curMonth = new Date().getMonth() + 1;
    const curYear = new Date().getFullYear();

    const monthCards = monthlyData.map(d => {
      const isCurrentMonth = this.year === curYear && d.month === curMonth;
      const bar = Math.round((d.tushum / maxTushum) * 100);
      return `
        <div class="month-card ${isCurrentMonth ? 'current' : ''}"
             onclick="Router.go('/admin/monthly?year=${this.year}&month=${d.month}')">
          <div class="month-card-name">${Utils.getMonthName(d.month)}${isCurrentMonth ? ' 📍' : ''}</div>
          <div class="month-card-tushum">${Utils.formatMoneyShort(d.tushum)}</div>
          <div class="month-card-foyda ${d.foyda >= 0 ? 'pos' : 'neg'}">
            Foyda: ${d.foyda >= 0 ? '+' : ''}${Utils.formatMoneyShort(d.foyda)}
          </div>
          <div class="progress-bar" style="margin-top:var(--sp-3);">
            <div class="progress-fill ${d.foyda >= 0 ? '' : 'danger'}" style="width:${bar}%"></div>
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${d.reportCount} kun</div>
        </div>
      `;
    }).join('');

    const content = `
      ${Components.renderPageHeader(
        '📈 Yillik tahlil',
        `${this.year} yil bo'yicha moliyaviy ko'rsatkichlar`,
        `<div class="date-nav">
          <button class="date-nav-btn" onclick="AdminYearly.render({year:${this.year - 1}})">${Utils.icon('chevron_left')}</button>
          <span class="date-nav-label">${this.year} yil</span>
          <button class="date-nav-btn" onclick="AdminYearly.render({year:${this.year + 1}})">${Utils.icon('chevron_right')}</button>
        </div>`
      )}
      <div class="page-body dashboard-grid">

        <!-- Yillik jami -->
        <div class="stats-grid stats-grid-3">
          <div class="stat-card" style="--stat-color:var(--grad-brand)">
            <div class="stat-label">Yillik jami tushum</div>
            <div class="stat-value">${Utils.formatMoneyShort(totalTushum)}</div>
            <div class="stat-icon">${Utils.icon('money', 20)}</div>
          </div>
          <div class="stat-card" style="--stat-color:var(--grad-success)">
            <div class="stat-label">Yillik foyda</div>
            <div class="stat-value" style="color:${totalFoyda >= 0 ? 'var(--brand-success)' : 'var(--brand-danger)'}">${Utils.formatMoneyShort(totalFoyda)}</div>
            <div class="stat-icon">${Utils.icon('trend', 20)}</div>
          </div>
          <div class="stat-card" style="--stat-color:var(--grad-warning)">
            <div class="stat-label">Vrachlar jami VU</div>
            <div class="stat-value">${Utils.formatMoneyShort(totalVU)}</div>
            <div class="stat-icon">${Utils.icon('users', 20)}</div>
          </div>
        </div>

        <!-- Charts -->
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--sp-6);">
          <div class="chart-container">
            <div class="chart-header">
              <div class="card-title">Oylar bo'yicha tushum va foyda</div>
            </div>
            <div class="chart-canvas-wrap">
              <canvas id="yearly-main-chart"></canvas>
            </div>
          </div>
          <div class="chart-container">
            <div class="chart-header">
              <div class="card-title">Tushum taqsimoti</div>
            </div>
            <div class="chart-canvas-wrap">
              <canvas id="yearly-pie-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Oylik kartochkalar -->
        <div class="section">
          <div class="section-header">
            <div class="section-title">Oylar bo'yicha ko'rsatkichlar</div>
            <div class="hint">Oyni bosib batafsil ko'ring</div>
          </div>
          <div class="yearly-overview">${monthCards}</div>
        </div>

        <!-- Yillik jadval -->
        <div class="section">
          <div class="section-title" style="margin-bottom:var(--sp-4)">📋 Yillik jadval</div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Oy</th>
                  <th class="right">Tushum</th>
                  <th class="right">Xarajat</th>
                  <th class="right">Vrachlar VU</th>
                  <th class="right">Foyda</th>
                  <th class="right">O'sish</th>
                  <th class="center">Kunlar</th>
                </tr>
              </thead>
              <tbody>
                ${monthlyData.map((d, i) => {
                  const prev = i > 0 ? monthlyData[i - 1].tushum : 0;
                  const growth = prev > 0 ? (((d.tushum - prev) / prev) * 100).toFixed(1) : '—';
                  const totalExp = d.totalXarajat + (d.arenda || 0) + (d.kommunal || 0);
                  return `<tr ${this.year === curYear && d.month === curMonth ? 'style="background:rgba(99,102,241,0.06)"' : ''}>
                    <td><strong>${Utils.getMonthName(d.month)}</strong></td>
                    <td class="right mono">${Utils.formatMoneyShort(d.tushum)}</td>
                    <td class="right mono" style="color:var(--brand-danger)">-${Utils.formatMoneyShort(totalExp)}</td>
                    <td class="right mono">${Utils.formatMoneyShort(d.totalVU)}</td>
                    <td class="right">
                      <span class="${d.foyda >= 0 ? 'money positive' : 'money negative'}">
                        ${d.foyda >= 0 ? '+' : ''}${Utils.formatMoneyShort(d.foyda)}
                      </span>
                    </td>
                    <td class="right">
                      ${growth !== '—' ? `<span class="badge ${parseFloat(growth) >= 0 ? 'badge-success' : 'badge-danger'}">${parseFloat(growth) >= 0 ? '+' : ''}${growth}%</span>` : '<span class="badge badge-neutral">—</span>'}
                    </td>
                    <td class="center">${d.reportCount}</td>
                  </tr>`;
                }).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td><strong>YILLIK</strong></td>
                  <td class="right mono"><strong>${Utils.formatMoneyShort(totalTushum)}</strong></td>
                  <td class="right mono"><strong>—</strong></td>
                  <td class="right mono"><strong>${Utils.formatMoneyShort(totalVU)}</strong></td>
                  <td class="right"><strong class="${totalFoyda >= 0 ? 'money positive' : 'money negative'}">${Utils.formatMoneyShort(totalFoyda)}</strong></td>
                  <td></td>
                  <td class="center"><strong>${monthlyData.reduce((s,d) => s + d.reportCount, 0)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('app').innerHTML = Components.renderLayout(session, '/admin/yearly', content);

    // Charts
    setTimeout(() => {
      // Main bar+line chart
      const mainCtx = document.getElementById('yearly-main-chart');
      if (mainCtx && window.Chart) {
        new Chart(mainCtx, {
          data: {
            labels: monthlyData.map(d => Utils.getMonthName(d.month).slice(0, 3)),
            datasets: [
              {
                type: 'bar',
                label: 'Tushum',
                data: monthlyData.map(d => d.tushum),
                backgroundColor: monthlyData.map((d, i) => `rgba(99,102,241,${0.4 + i*0.04})`),
                borderColor: '#6366f1',
                borderWidth: 2,
                borderRadius: 6,
              },
              {
                type: 'line',
                label: 'Foyda',
                data: monthlyData.map(d => d.foyda),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16,185,129,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: monthlyData.map(d => d.foyda >= 0 ? '#10b981' : '#ef4444'),
                pointRadius: 4,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: '#a0a0c0', font: { family: 'Inter' } } },
              tooltip: { callbacks: { label: c => Utils.formatMoney(c.raw) } }
            },
            scales: {
              x: { grid: { color: 'rgba(99,102,241,0.06)' }, ticks: { color: '#a0a0c0' } },
              y: { grid: { color: 'rgba(99,102,241,0.06)' }, ticks: { color: '#a0a0c0', callback: v => Utils.formatMoneyShort(v) } }
            }
          }
        });
      }

      // Pie chart — top months by tushum
      const pieCtx = document.getElementById('yearly-pie-chart');
      if (pieCtx && window.Chart) {
        const activeMonths = monthlyData.filter(d => d.tushum > 0);
        new Chart(pieCtx, {
          type: 'doughnut',
          data: {
            labels: activeMonths.map(d => Utils.getMonthName(d.month).slice(0, 3)),
            datasets: [{
              data: activeMonths.map(d => d.tushum),
              backgroundColor: [
                '#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#84cc16','#f97316','#3b82f6','#14b8a6','#a855f7'
              ],
              borderColor: '#16162a',
              borderWidth: 3,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: { position: 'bottom', labels: { color: '#a0a0c0', font: { family: 'Inter', size: 10 }, padding: 8 } },
              tooltip: { callbacks: { label: c => `${c.label}: ${Utils.formatMoney(c.raw)}` } }
            }
          }
        });
      }
    }, 100);
  }
};
