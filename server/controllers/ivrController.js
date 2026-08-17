import * as employeeService from '../services/employeeService.js';
import * as attendanceService from '../services/attendanceService.js';
import * as ivrService from '../services/ivrService.js';
import { formatTimeHM, diffMinutes, minutesToHHMM } from '../utils/timeUtils.js';

/**
 * זרימת שיחה מלאה מול ימות המשיח (באמצעות ספריית yemot-router2 שמממשת את
 * פרוטוקול ה-API הרשמי: פרמטרים כגון ApiPhone מגיעים ב-call.values,
 * ותשובות נשלחות באמצעות call.read / call.id_list_message / call.hangup).
 *
 * כל פעולת כניסה/יציאה עוברת דרך attendanceService המרכזי בדיוק כמו באתר -
 * אין כאן לוגיקה עסקית כפולה.
 */

function msg(text) {
  return { type: 'text', data: text };
}

async function playAndHangup(call, text) {
  await call.id_list_message([msg(text)]);
}

/** מזהה את העובד המתקשר: קודם לפי מספר הטלפון, ואם לא נמצא - הזדהות ידנית. */
async function identifyCaller(call) {
  const phone = call.values.ApiPhone;
  let employee = await ivrService.identifyByPhone(phone);
  if (employee) return employee;

  const choice = await call.read(
    [
      msg('מספר הטלפון שממנו חייגתם אינו משויך לעובד.'),
      msg('להזדהות באמצעות מספר עובד הקישו 1.'),
    ],
    'tap',
    { max_digits: 1, digits_allowed: [1], allow_empty: true, sec_wait: 7 }
  );

  if (choice !== '1') {
    return null;
  }

  const employeeNumber = await call.read([msg('נא הקישו מספר עובד')], 'tap', {
    max_digits: 9,
    min_digits: 1,
    sec_wait: 10,
  });
  const pin = await call.read([msg('נא הקישו קוד סודי')], 'tap', {
    max_digits: 6,
    min_digits: 1,
    sec_wait: 10,
  });

  employee = await ivrService.identifyByNumberAndPin(employeeNumber, pin);
  return employee;
}

async function handleClockIn(call, employee) {
  const session = await attendanceService.clockIn({
    employeeId: employee.id,
    source: 'PHONE',
    createdBy: employee.id,
  });
  await playAndHangup(call, `נרשמה כניסה לעבודה בשעה ${formatTimeHM(session.clockIn)}. תודה ולהתראות.`);
}

async function handleClockOut(call, employee) {
  const departments = await ivrService.getActiveDepartmentsForMenu();
  if (departments.length === 0) {
    await playAndHangup(call, 'לא נמצאו מחלקות פעילות במערכת. יש לפנות למנהל.');
    return;
  }

  const menuMessages = [msg('באיזו מחלקה עבדתם?')];
  departments.forEach((dep, index) => {
    menuMessages.push(msg(`ל${dep.name} הקישו ${index + 1}`));
  });

  const digitsAllowed = departments.map((_, index) => index + 1);
  const choice = await call.read(menuMessages, 'tap', {
    max_digits: 1,
    digits_allowed: digitsAllowed,
    sec_wait: 10,
  });

  const chosenDepartment = departments[Number(choice) - 1];
  if (!chosenDepartment) {
    await playAndHangup(call, 'לא זוהתה בחירה תקינה. להתראות.');
    return;
  }

  const confirm = await call.read(
    [msg(`ליציאה ושיוך השעות למחלקת ${chosenDepartment.name} הקישו 1`)],
    'tap',
    { max_digits: 1, digits_allowed: [1], allow_empty: true, sec_wait: 7 }
  );

  if (confirm !== '1') {
    await playAndHangup(call, 'הפעולה בוטלה. להתראות.');
    return;
  }

  const session = await attendanceService.clockOut({
    employeeId: employee.id,
    departmentId: chosenDepartment.id,
    source: 'PHONE',
    createdBy: employee.id,
  });

  const totalMinutes = diffMinutes(session.clockIn, session.clockOut);
  await playAndHangup(
    call,
    `נרשמה יציאה מהעבודה. סה"כ עבדת היום ${minutesToHHMM(totalMinutes)} שעות. תודה ולהתראות.`
  );
}

async function handleStatusInfo(call, employee) {
  const status = await attendanceService.getEmployeeStatus(employee.id);
  if (status.status === 'IN') {
    await playAndHangup(
      call,
      `אתה נמצא כרגע בעבודה. נכנסת בשעה ${status.clockInTime}. עבדת עד כה ${status.workedSoFar}.`
    );
  } else {
    await playAndHangup(call, 'אינך רשום כנוכח בעבודה כרגע.');
  }
}

async function handlePeriodTotal(call, employee) {
  const totalFormatted = await ivrService.getCurrentPeriodTotalFormatted(employee.id);
  await playAndHangup(call, `סה"כ שעות העבודה שלך בתקופה הנוכחית: ${totalFormatted}.`);
}

/** נקודת הכניסה הראשית לשיחה - מחוברת ל-router ב-ivrRoutes.js */
export async function handleIncomingCall(call) {
  try {
    const employee = await identifyCaller(call);

    if (!employee) {
      await playAndHangup(call, 'לא ניתן היה לזהות אותך במערכת. להתראות.');
      return;
    }

    if (employee.status !== 'ACTIVE') {
      await playAndHangup(call, 'חשבונך אינו פעיל במערכת. יש לפנות למנהל.');
      return;
    }

    const status = await attendanceService.getEmployeeStatus(employee.id);
    const isIn = status.status === 'IN';

    const greeting = isIn
      ? `שלום ${employee.fullName}. התחלת לעבוד בשעה ${status.clockInTime}. ליציאה מהעבודה הקישו 1.`
      : `שלום ${employee.fullName}. לכניסה לעבודה הקישו 1.`;

    const choice = await call.read(
      [
        msg(greeting),
        msg('לדיווח או תיקון שעות הקישו 2.'),
        msg('לשמיעת מצב נוכחות הקישו 3.'),
        msg('לשמיעת סה"כ שעות בתקופה הקישו 4.'),
      ],
      'tap',
      { max_digits: 1, digits_allowed: [1, 2, 3, 4], sec_wait: 10 }
    );

    switch (choice) {
      case '1':
        if (isIn) await handleClockOut(call, employee);
        else await handleClockIn(call, employee);
        break;
      case '2':
        await playAndHangup(call, 'לתיקון דיווחי נוכחות יש להיכנס לאתר האינטרנט של המערכת. להתראות.');
        break;
      case '3':
        await handleStatusInfo(call, employee);
        break;
      case '4':
        await handlePeriodTotal(call, employee);
        break;
      default:
        await playAndHangup(call, 'לא זוהתה בחירה תקינה. להתראות.');
    }
  } catch (err) {
    console.error('[ivrController] שגיאה בשיחת IVR:', err.message);
    try {
      await call.id_list_message([msg('אירעה שגיאה. נא לנסות שוב מאוחר יותר.')]);
    } catch {
      // השיחה כבר נותקה - אין מה לעשות
    }
  }
}
