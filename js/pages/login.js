/**
 * Login Page
 */

const LoginPage = {
  render() {
    // Login sahifasida klinikalar ro'yxati API dan emas, demo uchun bitta klinikani ko'rsatamiz
    const clinics = [];   // Login da clinic tanlash kerak emas — username/parol yetarli
    const clinicList = clinics.length ? clinics.map(c => `
      <div class="clinic-option ${clinics.length === 1 ? 'selected' : ''}" data-id="${c.id}" onclick="LoginPage.selectClinic('${c.id}')">
        <div class="clinic-option-dot" style="background:${c.color || 'var(--brand-primary)'}"></div>
        <span class="clinic-option-name">${c.name}</span>
      </div>
    `).join('') : `<div style="color:var(--text-muted);font-size:var(--text-sm);">Hech qanday filial yo\'q</div>`;

    document.getElementById('app').innerHTML = `
      <div class="login-page">
        <div class="login-bg"></div>
        <div class="login-card">
          <div class="login-logo">
            <div class="login-logo-icon">
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                <path d="M14 24C14 18.477 18.477 14 24 14C29.523 14 34 18.477 34 24" stroke="white" stroke-width="3" stroke-linecap="round"/>
                <circle cx="24" cy="30" r="6" fill="white" fill-opacity="0.9"/>
              </svg>
            </div>
            <div class="login-logo-text">
              <div class="title">DentAdmin</div>
              <div class="sub">Stomatologiya tizimi</div>
            </div>
          </div>

          <h2 class="login-form-title">Kirish</h2>
          <p class="login-form-sub">Hisob ma'lumotlaringizni kiriting</p>

          ${clinics.length ? `
          <div class="clinic-selector">
            <div class="clinic-selector-label">Filial tanlang</div>
            <div class="clinic-list" id="clinic-list">${clinicList}</div>
          </div>` : ''}

          <div style="display:flex;flex-direction:column;gap:var(--sp-4);">
            <input type="hidden" id="selected-clinic-id" value="${clinics.length === 1 ? clinics[0].id : ''}">
            <div class="form-group">
              <label class="label">Foydalanuvchi nomi</label>
              <input class="input" id="login-username" type="text" placeholder="username" autocomplete="username"
                onkeydown="if(event.key==='Enter')document.getElementById('login-password').focus()" />
            </div>
            <div class="form-group">
              <label class="label">Parol</label>
              <input class="input" id="login-password" type="password" placeholder="••••••••"
                onkeydown="if(event.key==='Enter')LoginPage.submit()" />
            </div>
            <div id="login-error" style="color:var(--brand-danger);font-size:var(--text-sm);display:none;"></div>
            <button class="btn btn-primary btn-lg btn-full" id="login-btn" onclick="LoginPage.submit()">
              Kirish →
            </button>
          </div>

          <div style="margin-top:var(--sp-6);text-align:center;color:var(--text-muted);font-size:var(--text-xs);">
            <div>Demo: <strong style="color:var(--text-secondary)">rahbar / rahbar123</strong> yoki <strong style="color:var(--text-secondary)">kassir / kassir123</strong></div>
          </div>
        </div>
      </div>
    `;

    // Focus
    setTimeout(() => document.getElementById('login-username')?.focus(), 100);
  },

  selectClinic(id) {
    document.getElementById('selected-clinic-id').value = id;
    document.querySelectorAll('.clinic-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.id === id);
    });
  },

  async submit() {
    const username = document.getElementById('login-username')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    const clinicId = document.getElementById('selected-clinic-id')?.value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    if (!username || !password) {
      errorEl.textContent = 'Foydalanuvchi nomi va parol kiritilishi shart';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Tekshirilmoqda...';
    errorEl.style.display = 'none';

    const result = await Auth.login(username, password, clinicId || null);
    if (result.ok) {
      const session = result.session;
      if (session.role === 'super_admin') Router.go('/super/clinics');
      else if (session.role === 'admin') Router.go('/admin/dashboard');
      else Router.go('/reception/daily');
    } else {
      errorEl.textContent = result.error;
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Kirish →';
    }
  }
};
