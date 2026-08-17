import { test } from 'node:test';
import assert from 'node:assert/strict';

// בדיקות אלו רצות מול Firestore Emulator ולא מול פרויקט אמיתי.
// הרצה: firebase emulators:start --only firestore
// ואז:  FIRESTORE_EMULATOR_HOST=localhost:8080 npm test
// אם המשתנה לא מוגדר - הבדיקות מדולגות (כדי לא לדרוש חיבור אמיתי ל-Firebase בכל סביבה).
const emulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const skipReason = 'דורש Firestore Emulator - הגדירו FIRESTORE_EMULATOR_HOST כדי להריץ בדיקות אלו';

test('לוגיקת נוכחות מרכזית (attendanceService)', { skip: !emulatorAvailable && skipReason }, async (t) => {
  const attendanceService = await import('../services/attendanceService.js');
  const departmentService = await import('../services/departmentService.js');

  const employeeId = `test-employee-${Date.now()}`;
  const department = await departmentService.createDepartment({ name: `מחלקת בדיקה ${Date.now()}` });

  await t.test('כניסה לעבודה יוצרת session פתוח', async () => {
    const session = await attendanceService.clockIn({ employeeId, source: 'WEB' });
    assert.equal(session.status, 'OPEN');
    assert.equal(session.clockOut, null);
  });

  await t.test('כניסה כפולה נדחית', async () => {
    await assert.rejects(
      () => attendanceService.clockIn({ employeeId, source: 'WEB' }),
      /כבר רשום כנוכח/
    );
  });

  await t.test('יציאה מהעבודה סוגרת את ה-session ומשייכת מחלקה', async () => {
    const session = await attendanceService.clockOut({
      employeeId,
      departmentId: department.id,
      source: 'WEB',
    });
    assert.equal(session.status, 'COMPLETE');
    assert.equal(session.departmentId, department.id);
    assert.ok(session.clockOut);
  });

  await t.test('יציאה ללא כניסה פתוחה נדחית', async () => {
    await assert.rejects(
      () => attendanceService.clockOut({ employeeId, departmentId: department.id, source: 'WEB' }),
      /לא נמצאה כניסה פתוחה/
    );
  });

  await t.test('session שלא נסגר מסומן MISSING_CLOCK_OUT ולא ממציא שעת יציאה', async () => {
    const session = await attendanceService.clockIn({ employeeId, source: 'WEB' });
    await attendanceService.markSessionMissing(session.id);
    const updated = await attendanceService.getSessionRaw(session.id);
    assert.equal(updated.status, 'MISSING_CLOCK_OUT');
    assert.equal(updated.clockOut, null);
  });
});
