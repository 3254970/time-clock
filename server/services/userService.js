import { db, authAdmin } from '../firebase/firebaseAdmin.js';

const usersCollection = db.collection('users');

/** טוען משתמש (role, employeeId) לפי Firebase uid. */
export async function getUserByUid(uid) {
  const doc = await usersCollection.doc(uid).get();
  if (!doc.exists) return null;
  return { uid: doc.id, ...doc.data() };
}

/** יוצר/מעדכן את מסמך ההרשאות של המשתמש. role: EMPLOYEE | MANAGER | ADMIN */
export async function setUserRole(uid, { role, employeeId = null, email = null }) {
  await usersCollection.doc(uid).set(
    {
      role,
      employeeId,
      email,
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

/**
 * מעדכן אימייל ו/או סיסמה של משתמש ב-Firebase Authentication.
 * updates: { email?, password? } - שדות ריקים לא נשלחים ל-Firebase.
 * מחזיר את רשומת המשתמש המעודכנת מ-Auth.
 */
export async function updateAuthCredentials(uid, { email, password } = {}) {
  const updates = {};
  if (email) updates.email = email;
  if (password) updates.password = password;
  if (Object.keys(updates).length === 0) {
    return authAdmin.getUser(uid);
  }
  return authAdmin.updateUser(uid, updates);
}
