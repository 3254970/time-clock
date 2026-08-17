import 'dotenv/config';
import { db, authAdmin, FieldValue } from '../firebase/firebaseAdmin.js';
import { setUserRole } from '../services/userService.js';
import { createDepartment, listDepartments } from '../services/departmentService.js';
import { createEmployee, listEmployees } from '../services/employeeService.js';
import { nowInZone } from '../utils/timeUtils.js';

/**
 * יוצר נתוני דוגמה ב-Firestore: אדמין, מנהל, 3 עובדים, 4 מחלקות,
 * ומספר רשומות נוכחות לדוגמה (תקינה / פתוחה / MISSING_CLOCK_OUT).
 * ניתן להריץ שוב בבטחה - הסקריפט מדלג על נתונים שכבר קיימים.
 */

async function ensureBackofficeUser({ email, password, role, displayName }) {
  let user;
  try {
    user = await authAdmin.getUserByEmail(email);
    console.log(`↷ משתמש ${email} כבר קיים, מדלג על יצירה`);
  } catch {
    user = await authAdmin.createUser({ email, password, displayName });
    console.log(`✓ נוצר משתמש ${role}: ${email} / ${password}`);
  }
  await setUserRole(user.uid, { role, employeeId: null, email });
  return user;
}

async function ensureDepartment(name) {
  const existing = await listDepartments({ activeOnly: false });
  const found = existing.find((d) => d.name === name);
  if (found) {
    console.log(`↷ מחלקה "${name}" כבר קיימת, מדלג`);
    return found;
  }
  const dep = await createDepartment({ name });
  console.log(`✓ נוצרה מחלקה: ${name}`);
  return dep;
}

async function ensureEmployee({ firstName, lastName, employeeNumber, phone, pin, email }) {
  const existing = await listEmployees({ status: 'ALL' });
  const found = existing.find((e) => e.employeeNumber === employeeNumber);
  if (found) {
    console.log(`↷ עובד ${employeeNumber} כבר קיים, מדלג`);
    return found;
  }
  const employee = await createEmployee({ firstName, lastName, employeeNumber, phone, pin, email });
  console.log(`✓ נוצר עובד: ${employee.fullName} (${employeeNumber}) / ${email}`);
  return employee;
}

async function createSession({ employeeId, clockIn, clockOut, departmentId, status, clockInSource = 'WEB', clockOutSource }) {
  const sessionsCollection = db.collection('attendanceSessions');
  await sessionsCollection.add({
    employeeId,
    clockIn,
    clockOut: clockOut || null,
    departmentId: departmentId || null,
    status,
    clockInSource,
    clockOutSource: clockOutSource || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function main() {
  console.log('--- יצירת נתוני דוגמה ---');

  await ensureBackofficeUser({
    email: 'admin@example.com',
    password: 'Admin123!',
    role: 'ADMIN',
    displayName: 'מנהל מערכת',
  });

  await ensureBackofficeUser({
    email: 'manager@example.com',
    password: 'Manager123!',
    role: 'MANAGER',
    displayName: 'מנהל משמרת',
  });

  const departments = await Promise.all(
    ['משרדים', 'תחזוקה', 'מטבח', 'אבטחה'].map((name) => ensureDepartment(name))
  );
  const maintenanceDept = departments[1];

  const employees = await Promise.all([
    ensureEmployee({
      firstName: 'דוד',
      lastName: 'כהן',
      employeeNumber: '1001',
      phone: '0501234561',
      pin: '1111',
      email: 'emp1@example.com',
    }),
    ensureEmployee({
      firstName: 'רותי',
      lastName: 'לוי',
      employeeNumber: '1002',
      phone: '0501234562',
      pin: '2222',
      email: 'emp2@example.com',
    }),
    ensureEmployee({
      firstName: 'משה',
      lastName: 'פרץ',
      employeeNumber: '1003',
      phone: '0501234563',
      pin: '3333',
      email: 'emp3@example.com',
    }),
  ]);
  const [emp1, emp2, emp3] = employees;

  const now = nowInZone();

  // Session תקין (COMPLETE) לעובד 1 - אתמול
  const yesterday = now.minus({ days: 1 });
  await createSession({
    employeeId: emp1.id,
    clockIn: yesterday.set({ hour: 8, minute: 3 }).toJSDate(),
    clockOut: yesterday.set({ hour: 17, minute: 12 }).toJSDate(),
    departmentId: maintenanceDept.id,
    status: 'COMPLETE',
    clockOutSource: 'WEB',
  });

  // Session פתוח (OPEN) לעובד 2 - היום
  await createSession({
    employeeId: emp2.id,
    clockIn: now.set({ hour: 8, minute: 0 }).toJSDate(),
    status: 'OPEN',
  });

  // Session עם MISSING_CLOCK_OUT לעובד 3 - לפני יומיים
  const twoDaysAgo = now.minus({ days: 2 });
  await createSession({
    employeeId: emp3.id,
    clockIn: twoDaysAgo.set({ hour: 8, minute: 7 }).toJSDate(),
    status: 'MISSING_CLOCK_OUT',
  });

  console.log('--- סיום. פרטי התחברות לדוגמה: ---');
  console.log('אדמין: admin@example.com / Admin123!');
  console.log('מנהל: manager@example.com / Manager123!');
  console.log('עובד 1: emp1@example.com / (סיסמה זמנית - יש לאפס דרך "שכחתי סיסמה")');
  console.log('עובד 1 מספר עובד: 1001, PIN: 1111, טלפון: 0501234561');
  console.log('עובד 2 מספר עובד: 1002, PIN: 2222, טלפון: 0501234562');
  console.log('עובד 3 מספר עובד: 1003, PIN: 3333, טלפון: 0501234563');
  process.exit(0);
}

main().catch((err) => {
  console.error('שגיאה בהרצת seed:', err);
  process.exit(1);
});
