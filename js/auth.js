/**
 * DentAdmin — Auth System
 */

const Auth = {
  SESSION_KEY: 'da_session',

  login(username, password, clinicId) {
    const user = DB.findUserByLogin(username, clinicId);
    if (!user) return { ok: false, error: 'Foydalanuvchi topilmadi' };
    if (user.password !== password) return { ok: false, error: 'Parol noto\'g\'ri' };
    if (!user.active && user.active !== undefined) return { ok: false, error: 'Hisob bloklangan' };

    const session = {
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      clinicId: user.role === 'super_admin' ? null : user.clinicId,
      loginAt: new Date().toISOString()
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return { ok: true, session };
  },

  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    window.location.hash = '#/login';
  },

  getSession() {
    return JSON.parse(localStorage.getItem(this.SESSION_KEY) || 'null');
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  requireAuth(allowedRoles = []) {
    const session = this.getSession();
    if (!session) {
      window.location.hash = '#/login';
      return null;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
      window.location.hash = '#/login';
      return null;
    }
    return session;
  },

  isSuperAdmin() {
    const s = this.getSession();
    return s && s.role === 'super_admin';
  },

  isAdmin() {
    const s = this.getSession();
    return s && (s.role === 'admin' || s.role === 'super_admin');
  },

  isReceptionist() {
    const s = this.getSession();
    return s && s.role === 'receptionist';
  },

  getClinicId() {
    const s = this.getSession();
    return s ? s.clinicId : null;
  },

  getRoleLabel(role) {
    const labels = {
      super_admin: '🔑 Super Admin',
      admin: '👔 Rahbar',
      receptionist: '🏥 Qabulxona'
    };
    return labels[role] || role;
  }
};
