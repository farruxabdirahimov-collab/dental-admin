/**
 * DentAdmin — API Communication Layer
 * Barcha server bilan muloqot shu yerdan o'tadi
 */

const API = {
  _base: '/api',
  _token: null,

  // ── Token boshqaruvi ──────────────────────────────────────────────────────
  setToken(t)   { this._token = t; localStorage.setItem('da_token', t); },
  loadToken()   { this._token = localStorage.getItem('da_token'); },
  clearToken()  { this._token = null; localStorage.removeItem('da_token'); },
  hasToken()    { return !!this._token; },

  // ── Asosiy so'rov yuboruvchi ──────────────────────────────────────────────
  async req(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (this._token) headers['Authorization'] = `Bearer ${this._token}`;

    const res = await fetch(this._base + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try { const j = await res.json(); errMsg = j.error || errMsg; } catch {}
      throw new Error(errMsg);
    }

    // 204 No Content
    if (res.status === 204) return { ok: true };
    return res.json();
  },

  // ── Qisqa metodlar ───────────────────────────────────────────────────────
  get:  (path)       => API.req('GET',    path),
  post: (path, body) => API.req('POST',   path, body),
  put:  (path, body) => API.req('PUT',    path, body),
  del:  (path)       => API.req('DELETE', path),
};
