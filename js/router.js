/**
 * DentAdmin — Router (Hash-based SPA)
 */

const Router = {
  routes: {},
  currentRoute: null,

  register(path, handler) {
    this.routes[path] = handler;
  },

  navigate(path, params = {}) {
    window.location.hash = '#' + path;
  },

  go(path) {
    this.navigate(path);
  },

  init() {
    window.addEventListener('hashchange', () => this._handle());
    this._handle();
  },

  _handle() {
    const hash = window.location.hash.replace('#', '') || '/login';
    const [path, queryStr] = hash.split('?');
    const params = {};
    if (queryStr) {
      queryStr.split('&').forEach(p => {
        const [k, v] = p.split('=');
        params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }

    this.currentRoute = path;

    // Auth guard
    const session = Auth.getSession();
    const publicRoutes = ['/login'];

    if (!publicRoutes.includes(path) && !session) {
      this.navigate('/login');
      return;
    }

    // Role-based redirects from login
    if (path === '/login' && session) {
      if (session.role === 'super_admin') { this.navigate('/super/clinics'); return; }
      if (session.role === 'admin') { this.navigate('/admin/dashboard'); return; }
      if (session.role === 'receptionist') { this.navigate('/reception/daily'); return; }
    }

    // Kassir admin sahifalariga kira olmaydi
    if (session && session.role === 'receptionist' && path.startsWith('/admin')) {
      this.navigate('/reception/daily');
      return;
    }

    // Super admin check
    if (path.startsWith('/super') && session && session.role !== 'super_admin') {
      this.navigate('/admin/dashboard');
      return;
    }

    const handler = this.routes[path] || this.routes['*'];
    if (handler) {
      handler(params);
    } else {
      this._notFound();
    }
  },

  _notFound() {
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;">
          <div style="font-size:64px;">🦷</div>
          <div style="font-size:24px;font-weight:700;">404 — Sahifa topilmadi</div>
          <button class="btn btn-primary" onclick="Router.go('/login')">Bosh sahifaga</button>
        </div>
      `;
    }
  }
};
