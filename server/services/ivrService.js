import * as employeeService from './employeeService.js';
import * as attendanceService from './attendanceService.js';
import { listDepartments } from './departmentService.js';
import { getCurrentWorkPeriod, diffMinutes, minutesToHHMM } from '../utils/timeUtils.js';

/**
 * לוגיקת עזר ל-IVR (ימות המשיח). כל הפעולות העסקיות בפועל (כניסה/יציאה)
 * מתבצעות דרך attendanceService המרכזי - כאן רק זיהוי עובד ועזרי תצוגה לטלפון.
 */

export async function identifyByPhone(rawPhone) {
  return employeeService.findEmployeeByPhone(rawPhone);
}

export async function identifyByNumberAndPin(employeeNumber, pin) {
  return employeeService.findEmployeeByNumberAndPin(employeeNumber, pin);
}

export async function getActiveDepartmentsForMenu() {
  return listDepartments({ activeOnly: true });
}

/** סה"כ דקות עבודה של עובד בתקופה הנוכחית (16-15), לשמיעה בטלפון. */
export async function getCurrentPeriodTotalFormatted(employeeId) {
  const period = getCurrentWorkPeriod();
  const sessions = await attendanceService.listSessionsForEmployee(employeeId, {
    start: period.startDate,
    end: period.endDate,
  });
  const totalMinutes = sessions
    .filter((s) => s.status === 'COMPLETE')
    .reduce((sum, s) => sum + (diffMinutes(s.clockIn, s.clockOut) || 0), 0);
  return minutesToHHMM(totalMinutes);
}
