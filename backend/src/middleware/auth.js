/**
 * Auth Middleware — JWT + Subscription check
 */

const jwt    = require('jsonwebtoken');
const { pool } = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'dentadmin_jwt_secret_2026';

/**
 * requireAuth(roles?)
 * JWT tekshiruvi + ixtiyoriy rol filtri
 */
function requireAuth(roles = []) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Token kerak (Authorization: Bearer <token>)' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;

      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({
          error: `Ruxsat yo'q. Kerakli rol: ${roles.join(' | ')}. Sizning rolingiz: ${decoded.role}`
        });
      }
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token muddati tugagan, qayta login qiling' });
      }
      return res.status(401).json({ error: 'Token yaroqsiz' });
    }
  };
}

/**
 * requireClinicAccess
 * Foydalanuvchi o'z klinikasiga kirishi tekshiriladi
 */
function requireClinicAccess(req, res, next) {
  const { clinicId } = req.params;
  if (req.user.role === 'super_admin') return next();
  if (req.user.clinicId !== clinicId) {
    return res.status(403).json({ error: 'Bu filialga kirish huquqi yo\'q' });
  }
  next();
}

/**
 * checkSubscription
 * Klinikaning abonement muddatini tekshiradi.
 * Muddati tugagan yoki nofaol klinikalar blokladi.
 * Super admin har doim o'tadi.
 */
async function checkSubscription(req, res, next) {
  try {
    if (req.user.role === 'super_admin') return next();

    const clinicId = req.params.clinicId || req.user.clinicId;
    if (!clinicId) return next();

    const { rows } = await pool.query(
      'SELECT active, expires_at FROM clinics WHERE id=$1',
      [clinicId]
    );
    if (!rows[0]) return next(); // klinika topilmasa o'tkazib yuborish

    const clinic = rows[0];

    // Nofaol klinika
    if (clinic.active === false) {
      return res.status(403).json({
        error: 'CLINIC_INACTIVE',
        message: 'Filial nofaollashtirilgan. Administrator bilan bog\'laning.'
      });
    }

    // Muddati tugagan klinika
    if (clinic.expires_at && new Date() > new Date(clinic.expires_at)) {
      const expiredDaysAgo = Math.floor(
        (new Date() - new Date(clinic.expires_at)) / (1000 * 60 * 60 * 24)
      );
      return res.status(403).json({
        error: 'SUBSCRIPTION_EXPIRED',
        message: `Abonement muddati ${expiredDaysAgo} kun oldin tugagan. Administrator bilan bog\`laning.`,
        expiredAt: clinic.expires_at
      });
    }

    next();
  } catch (err) {
    next(); // tekshiruv xatosi bo'lsa bloklamaydi
  }
}

module.exports = { requireAuth, requireClinicAccess, checkSubscription };
