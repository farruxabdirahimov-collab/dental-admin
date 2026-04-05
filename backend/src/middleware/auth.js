/**
 * JWT Auth Middleware
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET  || 'dentadmin_jwt_secret_2026';

/**
 * requireAuth(roles?)
 * Foydalanuvchini tekshirib, req.user ga JWT payload qo'yadi
 * @param {string[]} roles — ruxsat etilgan rollar (bo'sh = hammaga)
 */
function requireAuth(roles = []) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Token kerak (Authorization: Bearer <token>)' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;

      // Rol tekshiruvi
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
 * Klinikaga kirish huquqini tekshirish
 * req.user.clinicId === clinicId yoki super_admin
 */
function requireClinicAccess(req, res, next) {
  const { clinicId } = req.params;
  if (req.user.role === 'super_admin') return next();
  if (req.user.clinicId !== clinicId) {
    return res.status(403).json({ error: 'Bu filialga kirish huquqi yo\'q' });
  }
  next();
}

module.exports = { requireAuth, requireClinicAccess };
