/**
 * DentAdmin — Utility Functions
 */

const Utils = {
  // ========== FORMATLASH ==========
  formatMoney(amount, showSuffix = true) {
    if (!amount && amount !== 0) return '—';
    const n = Number(amount) || 0;
    const formatted = n.toLocaleString('uz-UZ').replace(/,/g, ' ');
    return showSuffix ? formatted + ' so\'m' : formatted;
  },

  formatMoneyShort(amount) {
    const n = Number(amount) || 0;
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + ' mln';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + ' ming';
    return n.toString();
  },

  /**
   * Qisqacha + aniq son birga: "2.9 mln" + "2,875,000 so'm"
   * summary panellar va muhim ko'rsatkichlar uchun
   */
  formatMoneyFull(amount, color = null) {
    const n = Number(amount) || 0;
    const exact = n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' so\'m';
    const short = this.formatMoneyShort(n);
    const colorStyle = color ? `color:${color}` : '';
    return `<span style="display:flex;flex-direction:column;align-items:flex-end;line-height:1.2;">
      <span style="font-size:1.15em;font-weight:800;font-family:var(--font-mono);${colorStyle}">${short}</span>
      <span style="font-size:10px;font-weight:400;color:var(--text-muted);font-family:var(--font-mono);letter-spacing:0.02em">${exact}</span>
    </span>`;
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
  },

  formatDateShort(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  getMonthName(month, year) {
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ];
    if (year) return `${months[month - 1]} ${year}`;
    return months[month - 1];
  },

  getTodayStr() {
    return new Date().toISOString().split('T')[0];
  },

  getCurrentMonth() {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  },

  // ========== DOM YORDAM FUNKSIYALARI ==========
  el(id) {
    return document.getElementById(id);
  },

  qs(selector, parent = document) {
    return parent.querySelector(selector);
  },

  qsa(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  },

  html(element, content) {
    if (typeof element === 'string') {
      const el = document.getElementById(element);
      if (el) el.innerHTML = content;
    } else if (element) {
      element.innerHTML = content;
    }
  },

  show(id) {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (el) el.style.display = '';
  },

  hide(id) {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (el) el.style.display = 'none';
  },

  // ========== TOAST NOTIFICATIONS ==========
  toast(type, title, text = '', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-msg">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        ${text ? `<div class="toast-text">${text}</div>` : ''}
      </div>
    `;
    container.appendChild(toast);
    toast.addEventListener('click', () => toast.remove());

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ========== MODAL ==========
  openModal(html, options = {}) {
    let overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal ${options.size || ''}">${html}</div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && !options.noClose) this.closeModal();
    });

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape' && !options.noClose) {
        Utils.closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });

    return overlay;
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();
  },

  // ========== CONFIRM ==========
  async confirm(message, title = 'Tasdiqlang') {
    return new Promise(resolve => {
      this.openModal(`
        <div class="modal-header">
          <div>
            <div class="modal-title">⚠️ ${title}</div>
          </div>
        </div>
        <p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--sp-6);">${message}</p>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirm-no">Bekor qilish</button>
          <button class="btn btn-danger" id="confirm-yes">Ha, o'chirish</button>
        </div>
      `);
      document.getElementById('confirm-yes').onclick = () => { this.closeModal(); resolve(true); };
      document.getElementById('confirm-no').onclick = () => { this.closeModal(); resolve(false); };
    });
  },

  // ========== ICONS (SVG inline) ==========
  icon(name, size = 16) {
    const icons = {
      dashboard: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      calendar: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      users: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      settings: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>`,
      chart: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      trend: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
      plus: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
      edit: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      trash: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
      save: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
      chevron_down: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`,
      chevron_left: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>`,
      chevron_right: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>`,
      logout: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
      money: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
      check: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      x: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      tooth: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2C8.5 2 5 5 5 8c0 2 .5 3.5 1 5l1 8c.2 1 .8 1 1 0l1-5h6l1 5c.2 1 .8 1 1 0l1-8c.5-1.5 1-3 1-5 0-3-3.5-6-7-6z"/></svg>`,
      building: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="2" width="16" height="20"/><line x1="9" y1="22" x2="9" y2="12"/><line x1="15" y1="22" x2="15" y2="12"/><rect x="9" y="12" width="6" height="4"/><line x1="9" y1="7" x2="9" y2="7"/><line x1="15" y1="7" x2="15" y2="7"/><line x1="12" y1="7" x2="12" y2="7"/></svg>`,
      history: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>`,
      formula: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>`,
      nurse: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="18" y1="8" x2="18" y2="14"/><line x1="15" y1="11" x2="21" y2="11"/></svg>`,
      payment: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
      expense: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
      report: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    };
    return icons[name] || '';
  },

  // ========== BOSHQA ==========
  debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  },

  num(val) {
    const n = parseFloat(String(val).replace(/\s/g, '').replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  },

  clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  },

  getInitials(name) {
    return (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  // Export CSV
  exportCSV(data, filename) {
    const csv = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }
};
