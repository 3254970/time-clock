import { db, authAdmin, FieldValue } from '../firebase/firebaseAdmin.js';
import { AppError } from '../utils/AppError.js';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';
import { setUserRole } from './userService.js';

const employeesCollection = db.collection('employees');

function toDTO(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    employeeNumber: data.employeeNumber,
    firstName: data.firstName,
    lastName: data.lastName,
    fullName: data.fullName,
    phone: data.phone,
    phones: data.phones || [],
    status: data.status,
    firebaseUid: data.firebaseUid || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listEmployees({ status } = {}) {
  let query = employeesCollection;
  if (status && status !== 'ALL') {
    query = query.where('status', '==', status);
  }
  const snapshot = await query.get();
  return snapshot.docs.map(toDTO);
}

export async function getEmployeeById(employeeId) {
  const doc = await employeesCollection.doc(employeeId).get();
  if (!doc.exists) {
    throw new AppError('העובד לא נמצא', 404);
  }
  return toDTO(doc);
}

/** מחפש עובד לפי מספר טלפון מנורמל. משמש בעיקר את ה-IVR. */
export async function findEmployeeByPhone(rawPhone) {
  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized) return null;

  const snapshot = await employeesCollection.where('phoneNumbers', 'array-contains', normalized).limit(1).get();
  if (snapshot.empty) return null;
  return toDTO(snapshot.docs[0]);
}

/** מחפש עובד לפי מספר עובד + PIN, לזיהוי טלפוני חלופי. */
export async function findEmployeeByNumberAndPin(employeeNumber, pin) {
  const snapshot = await employeesCollection
    .where('employeeNumber', '==', String(employeeNumber))
    .where('pin', '==', String(pin))
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return toDTO(snapshot.docs[0]);
}

async function assertEmployeeNumberAvailable(employeeNumber, excludeId = null) {
  const snapshot = await employeesCollection.where('employeeNumber', '==', String(employeeNumber)).get();
  const conflict = snapshot.docs.find((doc) => doc.id !== excludeId);
  if (conflict) {
    throw new AppError('מספר עובד זה כבר קיים במערכת', 409);
  }
}

async function assertPhoneAvailable(normalizedPhone, excludeId = null) {
  if (!normalizedPhone) return;
  const snapshot = await employeesCollection.where('phoneNumbers', 'array-contains', normalizedPhone).get();
  const conflict = snapshot.docs.find((doc) => doc.id !== excludeId);
  if (conflict) {
    throw new AppError('מספר טלפון זה כבר משויך לעובד אחר', 409);
  }
}

export async function createEmployee({ firstName, lastName, employeeNumber, phone, pin, email }) {
  if (!firstName || !lastName || !employeeNumber || !phone) {
    throw new AppError('חובה למלא שם פרטי, שם משפחה, מספר עובד וטלפון', 400);
  }

  const normalizedPhone = normalizePhoneNumber(phone);
  await assertEmployeeNumberAvailable(employeeNumber);
  await assertPhoneAvailable(normalizedPhone);

  const fullName = `${firstName} ${lastName}`.trim();
  let firebaseUid = null;
  let resetLink = null;

  if (email) {
    const tempPassword = Math.random().toString(36).slice(-10) + 'Aa1!';
    const authUser = await authAdmin.createUser({ email, password: tempPassword, displayName: fullName });
    firebaseUid = authUser.uid;
    try {
      resetLink = await authAdmin.generatePasswordResetLink(email);
    } catch {
      resetLink = null;
    }
  }

  const docRef = await employeesCollection.add({
    employeeNumber: String(employeeNumber),
    firstName,
    lastName,
    fullName,
    phone: normalizedPhone,
    phones: [{ phone: normalizedPhone, isPrimary: true, canClock: true }],
    phoneNumbers: [normalizedPhone],
    pin: pin ? String(pin) : null,
    status: 'ACTIVE',
    firebaseUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (firebaseUid) {
    await setUserRole(firebaseUid, { role: 'EMPLOYEE', employeeId: docRef.id, email });
  }

  const created = await getEmployeeById(docRef.id);
  return { ...created, resetLink };
}

export async function updateEmployee(employeeId, updates) {
  const existing = await getEmployeeById(employeeId);

  const patch = { updatedAt: FieldValue.serverTimestamp() };

  if (updates.employeeNumber && updates.employeeNumber !== existing.employeeNumber) {
    await assertEmployeeNumberAvailable(updates.employeeNumber, employeeId);
    patch.employeeNumber = String(updates.employeeNumber);
  }

  if (updates.firstName) patch.firstName = updates.firstName;
  if (updates.lastName) patch.lastName = updates.lastName;
  if (updates.firstName || updates.lastName) {
    patch.fullName = `${updates.firstName || existing.firstName} ${updates.lastName || existing.lastName}`.trim();
  }

  if (updates.phone) {
    const normalizedPhone = normalizePhoneNumber(updates.phone);
    if (normalizedPhone !== existing.phone) {
      await assertPhoneAvailable(normalizedPhone, employeeId);
    }
    const otherPhones = (existing.phones || []).filter((p) => !p.isPrimary);
    patch.phone = normalizedPhone;
    patch.phones = [{ phone: normalizedPhone, isPrimary: true, canClock: true }, ...otherPhones];
    patch.phoneNumbers = patch.phones.map((p) => p.phone);
  }

  if (updates.pin !== undefined) patch.pin = updates.pin ? String(updates.pin) : null;
  if (updates.status && ['ACTIVE', 'INACTIVE'].includes(updates.status)) patch.status = updates.status;

  await employeesCollection.doc(employeeId).update(patch);
  return getEmployeeById(employeeId);
}

/**
 * מוחק עובד לצמיתות, כולל כל היסטוריית הנוכחות שלו (attendanceSessions,
 * attendanceEvents, attendanceChanges) ומשתמש ה-Authentication שלו.
 * פעולה בלתי הפיכה - האדמין מקבל אזהרה מפורשת על כך בצד הלקוח לפני האישור.
 */
export async function deleteEmployee(employeeId) {
  const employee = await getEmployeeById(employeeId);

  // ייבוא מאוחר כדי למנוע תלות מעגלית בין השירותים
  const { deleteAllDataForEmployee } = await import('./attendanceService.js');
  const deletedCounts = await deleteAllDataForEmployee(employeeId);

  if (employee.firebaseUid) {
    await authAdmin.deleteUser(employee.firebaseUid).catch(() => {});
    await db.collection('users').doc(employee.firebaseUid).delete().catch(() => {});
  }

  await employeesCollection.doc(employeeId).delete();
  return deletedCounts;
}
