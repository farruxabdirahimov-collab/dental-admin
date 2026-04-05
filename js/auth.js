/**
 * DentAdmin — Auth System (JWT bilan)
 */

const Auth = {
  SESSION_KEY: 'da_session',

  // ── LOGIN (async — API ga murojaat qiladi) ────────────────────────────────
  async login(username, password, clinicId) {
    try {
      const res = await API.post('/auth/login', { username, password, clinicId: clinicId || undefined });

      // JWT token saqlash
      API.setToken(res.token);

      // Session saqlash
      const session = res.user;
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

      // Barcha klinika ma'lumotlarini yuklash
      await DB.loadAll(session.clinicId);

      return { ok: true, session };
    } catch (err) {
      return { ok: false, error: err.message || 'Kirish xatosi' };
    }
  },

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  logout() {
    API.clearToken();
    localStorage.removeItem(this.SESSION_KEY);
    window.location.hash = '#/login';
  },

  // ── SESSION ───────────────────────────────────────────────────────────────
  getSession() {
    return JSON.parse(localStorage.getItem(this.SESSION_KEY) || 'null');
  },

  isLoggedIn() {
    return !!this.getSession() && API.hasToken();
  },

  // ── SAHIFA KIRISH TEKSHIRUVI ──────────────────────────────────────────────
  requireAuth(allowedRoles = []) {
    const session = this.getSession();
    if (!session || !API.hasToken()) {
      window.location.hash = '#/login';
      return null;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
      window.location.hash = '#/login';
      return null;
    }
    return session;
  },

  // ── ROL TEKSHIRUVLARI ─────────────────────────────────────────────────────
  isSuperAdmin() { const s = this.getSession(); return s && s.role === 'super_admin'; },
  isAdmin()      { const s = this.getSession(); return s && (s.role === 'admin' || s.role === 'super_admin'); },
  isReceptionist() { const s = this.getSession(); return s && s.role === 'receptionist'; },

  getClinicId() { const s = this.getSession(); return s ? s.clinicId : null; },

  getRoleLabel(role) {
    const labels = {
      super_admin:  '🔑 Super Admin',
      admin:        '👑 Rahbar',
      receptionist: '💼 Kassir',
      doctor:       '👨‍⚕️ Vrach',
      nurse:        '🩺 Hamshira',
    };
    return labels[role] || role;
  },

  // ── Sahifa yuklanishida token tiklanadi ───────────────────────────────────
  restore() {
    API.loadToken();
  },
};
