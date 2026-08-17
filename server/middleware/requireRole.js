import { AppError } from '../utils/AppError.js';

/**
 * requireRole("ADMIN") או requireRole(["ADMIN", "MANAGER"])
 * חייב לרוץ אחרי verifyFirebaseToken.
 */
export function requireRole(rolesInput) {
  const allowedRoles = Array.isArray(rolesInput) ? rolesInput : [rolesInput];

  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError('אין לך הרשאה לבצע פעולה זו', 403));
    }
    next();
  };
}
