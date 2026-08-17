import { authAdmin, db } from '../firebase/firebaseAdmin.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * מאמת Firebase ID Token מה-Header: Authorization: Bearer TOKEN
 * לאחר האימות טוען את המשתמש מ-Firestore (users/{uid}) וממלא את req.user
 * עם uid, email, role, employeeId.
 */
export const verifyFirebaseToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('נדרשת התחברות למערכת', 401);
  }

  let decoded;
  try {
    decoded = await authAdmin.verifyIdToken(token);
  } catch {
    throw new AppError('פג תוקף החיבור, יש להתחבר מחדש', 401);
  }

  const userDoc = await db.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists) {
    throw new AppError('המשתמש אינו רשום במערכת', 403);
  }

  const userData = userDoc.data();

  req.user = {
    uid: decoded.uid,
    email: decoded.email || userData.email || null,
    role: userData.role,
    employeeId: userData.employeeId || null,
  };

  next();
});
