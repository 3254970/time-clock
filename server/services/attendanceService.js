import { db, FieldValue } from '../firebase/firebaseAdmin.js';
import { AppError } from '../utils/AppError.js';
import { listDepartments, getDepartmentById } from './departmentService.js';
import {
  nowInZone,
  toJSDate,
  formatTimeHM,
  formatDateDMY,
  formatHebrewDayName,
  diffMinutes,
  minutesToHHMM,
} from '../utils/timeUtils.js';

const sessionsCollection = db.collection('attendanceSessions');
const eventsCollection = db.collection('attendanceEvents');
const changesCollection = db.collection('attendanceChanges');

/**
 * שירות מרכזי לכל לוגיקת הנוכחות. גם ה-Web וגם ה-IVR (ימות המשיח) חייבים
 * לעבור דרך הפונקציות האלה בלבד - אין לשכפל לוגיקת כניסה/יציאה.
 */

function sessionToDTO(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    employeeId: data.employeeId,
    clockIn: data.clockIn ? data.clockIn.toDate().toISOString() : null,
    clockOut: data.clockOut ? data.clockOut.toDate().toISOString() : null,
    departmentId: data.departmentId || null,
    status: data.status,
    clockInSource: data.clockInSource || null,
    clockOutSource: data.clockOutSource || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

async function getOpenSession(employeeId) {
  const snapshot = await sessionsCollection
    .where('employeeId', '==', employeeId)
    .where('status', '==', 'OPEN')
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, doc: snapshot.docs[0], ...sessionToDTO(snapshot.docs[0]) };
}

async function logEvent({ employeeId, sessionId, type, timestamp, source, createdBy, metadata = {} }) {
  await eventsCollection.add({
    employeeId,
    sessionId,
    type,
    timestamp,
    source,
    createdBy: createdBy || null,
    metadata,
  });
}

/** כניסה לעבודה. אין לקבל שעה מהקליינט - השרת קובע את הזמן. */
export async function clockIn({ employeeId, source, createdBy }) {
  const existingOpen = await getOpenSession(employeeId);
  if (existingOpen) {
    throw new AppError('אתה כבר רשום כנוכח בעבודה.', 409);
  }

  const now = nowInZone().toJSDate();

  const docRef = await sessionsCollection.add({
    employeeId,
    clockIn: now,
    clockOut: null,
    departmentId: null,
    status: 'OPEN',
    clockInSource: source,
    clockOutSource: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logEvent({ employeeId, sessionId: docRef.id, type: 'CLOCK_IN', timestamp: now, source, createdBy });

  const doc = await docRef.get();
  return sessionToDTO(doc);
}

/** יציאה מהעבודה. חובה לבחור מחלקה. */
export async function clockOut({ employeeId, departmentId, source, createdBy }) {
  const openSession = await getOpenSession(employeeId);
  if (!openSession) {
    throw new AppError('לא נמצאה כניסה פתוחה. יש לבצע כניסה לעבודה קודם.', 400);
  }

  if (!departmentId) {
    throw new AppError('חובה לבחור מחלקה ביציאה', 400);
  }

  const department = await getDepartmentById(departmentId);
  if (!department.isActive) {
    throw new AppError('לא ניתן לשייך למחלקה לא פעילה', 400);
  }

  const now = nowInZone().toJSDate();

  await sessionsCollection.doc(openSession.id).update({
    clockOut: now,
    departmentId,
    status: 'COMPLETE',
    clockOutSource: source,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logEvent({
    employeeId,
    sessionId: openSession.id,
    type: 'CLOCK_OUT',
    timestamp: now,
    source,
    createdBy,
    metadata: { departmentId },
  });

  const doc = await sessionsCollection.doc(openSession.id).get();
  return sessionToDTO(doc);
}

/** סטטוס נוכחות נוכחי של עובד, לשימוש במסך הבית. */
export async function getEmployeeStatus(employeeId) {
  const openSession = await getOpenSession(employeeId);
  if (!openSession) {
    return { status: 'OUT', session: null };
  }

  const minutes = diffMinutes(openSession.clockIn, nowInZone());
  return {
    status: 'IN',
    session: openSession,
    clockInTime: formatTimeHM(openSession.clockIn),
    workedSoFar: minutesToHHMM(minutes),
  };
}

export async function getSessionRaw(sessionId) {
  const doc = await sessionsCollection.doc(sessionId).get();
  if (!doc.exists) {
    throw new AppError('רשומת הנוכחות לא נמצאה', 404);
  }
  return { id: doc.id, doc, ...sessionToDTO(doc) };
}

/** מעשיר session גולמי בשדות תצוגה מעוצבים, כולל שם מחלקה. */
export function buildDisplayRow(session, departmentsMap) {
  const totalMinutes = diffMinutes(session.clockIn, session.clockOut);
  return {
    id: session.id,
    employeeId: session.employeeId,
    dateFormatted: formatDateDMY(session.clockIn),
    dayName: formatHebrewDayName(session.clockIn),
    clockIn: session.clockIn,
    clockOut: session.clockOut,
    clockInTime: formatTimeHM(session.clockIn),
    clockOutTime: formatTimeHM(session.clockOut),
    departmentId: session.departmentId,
    departmentName: session.departmentId ? departmentsMap.get(session.departmentId) || '—' : null,
    totalMinutes: session.status === 'COMPLETE' ? totalMinutes : null,
    totalFormatted: session.status === 'COMPLETE' ? minutesToHHMM(totalMinutes) : null,
    status: session.status,
    clockInSource: session.clockInSource,
    clockOutSource: session.clockOutSource,
  };
}

export async function getDepartmentsMap() {
  const departments = await listDepartments({ activeOnly: false });
  return new Map(departments.map((d) => [d.id, d.name]));
}

/** כל רשומות הנוכחות של עובד בטווח תאריכים נתון (Date עד Date), מהחדש לישן. */
export async function listSessionsForEmployee(employeeId, { start, end } = {}) {
  let query = sessionsCollection.where('employeeId', '==', employeeId);
  if (start) query = query.where('clockIn', '>=', start);
  if (end) query = query.where('clockIn', '<=', end);
  const snapshot = await query.orderBy('clockIn', 'desc').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...sessionToDTO(doc) }));
}

/** כל רשומות הנוכחות בטווח תאריכים, על פני כל העובדים (לדוחות ולניהול). */
export async function listSessionsInRange({ start, end }) {
  let query = sessionsCollection;
  if (start) query = query.where('clockIn', '>=', start);
  if (end) query = query.where('clockIn', '<=', end);
  const snapshot = await query.orderBy('clockIn', 'desc').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...sessionToDTO(doc) }));
}

/**
 * עריכת רשומת נוכחות (ע"י עובד או מנהל). כל עריכה יוצרת רשומת Audit
 * ב-attendanceChanges ולעולם לא נמחקת.
 */
export async function updateSession(sessionId, updates, { changedByUid, changedByRole, source }) {
  const existing = await getSessionRaw(sessionId);

  const newClockIn = updates.clockIn !== undefined ? toJSDate(updates.clockIn) : toJSDate(existing.clockIn);
  const newClockOut = updates.clockOut !== undefined ? toJSDate(updates.clockOut) : toJSDate(existing.clockOut);
  const newDepartmentId = updates.departmentId !== undefined ? updates.departmentId : existing.departmentId;

  if (!newClockIn) {
    throw new AppError('שעת כניסה היא שדה חובה', 400);
  }
  if (newClockOut && newClockOut < newClockIn) {
    throw new AppError('שעת יציאה לא יכולה להיות לפני שעת הכניסה', 400);
  }
  if (newDepartmentId) {
    await getDepartmentById(newDepartmentId);
  }

  const newStatus = newClockOut ? 'COMPLETE' : 'OPEN';

  const oldValues = {
    clockIn: existing.clockIn,
    clockOut: existing.clockOut,
    departmentId: existing.departmentId,
    status: existing.status,
  };
  const newValues = {
    clockIn: newClockIn.toISOString(),
    clockOut: newClockOut ? newClockOut.toISOString() : null,
    departmentId: newDepartmentId || null,
    status: newStatus,
  };

  await sessionsCollection.doc(sessionId).update({
    clockIn: newClockIn,
    clockOut: newClockOut || null,
    departmentId: newDepartmentId || null,
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await changesCollection.add({
    attendanceSessionId: sessionId,
    employeeId: existing.employeeId,
    changedByUid,
    changedByRole,
    changedAt: FieldValue.serverTimestamp(),
    oldValues,
    newValues,
    source,
  });

  return getSessionRaw(sessionId);
}

/** מסמן session פתוח כ-MISSING_CLOCK_OUT, ללא המצאת שעת יציאה. משמש את ה-Job הלילי. */
export async function markSessionMissing(sessionId) {
  const existing = await getSessionRaw(sessionId);

  await sessionsCollection.doc(sessionId).update({
    status: 'MISSING_CLOCK_OUT',
    updatedAt: FieldValue.serverTimestamp(),
  });

  await changesCollection.add({
    attendanceSessionId: sessionId,
    employeeId: existing.employeeId,
    changedByUid: 'SYSTEM',
    changedByRole: 'SYSTEM',
    changedAt: FieldValue.serverTimestamp(),
    oldValues: { status: 'OPEN' },
    newValues: { status: 'MISSING_CLOCK_OUT' },
    source: 'SYSTEM',
  });
}

export async function listAllOpenSessions() {
  const snapshot = await sessionsCollection.where('status', '==', 'OPEN').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...sessionToDTO(doc) }));
}

/** בודק אם לעובד יש בכלל דיווחי נוכחות - משמש למניעת מחיקת עובד עם היסטוריה. */
export async function hasAnySessions(employeeId) {
  const snapshot = await sessionsCollection.where('employeeId', '==', employeeId).limit(1).get();
  return !snapshot.empty;
}
