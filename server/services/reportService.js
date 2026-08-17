import * as employeeService from './employeeService.js';
import {
  listSessionsInRange,
  buildDisplayRow,
  getDepartmentsMap,
} from './attendanceService.js';
import {
  getCurrentWorkPeriod,
  getWorkPeriod,
  formatDateDMY,
  formatTimeHM,
  nowInZone,
  diffMinutes,
  minutesToHHMM,
} from '../utils/timeUtils.js';

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function completedMinutes(session) {
  if (session.status !== 'COMPLETE') return 0;
  return diffMinutes(session.clockIn, session.clockOut) || 0;
}

/** נתוני Dashboard: כרטיסי סיכום + טבלת עובדים עם סטטוס נוכחי ושעות בתקופה הנוכחית. */
export async function getEmployeesOverview() {
  const period = getCurrentWorkPeriod();
  const [employees, sessions] = await Promise.all([
    employeeService.listEmployees({ status: 'ALL' }),
    listSessionsInRange({ start: period.startDate, end: period.endDate }),
  ]);

  const sessionsByEmployee = groupBy(sessions, (s) => s.employeeId);
  const todayFormatted = formatDateDMY(nowInZone());

  let inCount = 0;
  let missingCount = 0;

  const rows = employees.map((emp) => {
    const empSessions = sessionsByEmployee.get(emp.id) || [];
    const openSession = empSessions.find((s) => s.status === 'OPEN');
    const todaySession = empSessions.find((s) => formatDateDMY(s.clockIn) === todayFormatted);
    const periodTotalMinutes = empSessions.reduce((sum, s) => sum + completedMinutes(s), 0);
    const empMissingCount = empSessions.filter((s) => s.status === 'MISSING_CLOCK_OUT').length;

    if (openSession) inCount += 1;
    missingCount += empMissingCount;

    let todayDuration = null;
    if (todaySession) {
      todayDuration =
        todaySession.status === 'OPEN'
          ? minutesToHHMM(diffMinutes(todaySession.clockIn, nowInZone()))
          : todaySession.status === 'COMPLETE'
          ? minutesToHHMM(diffMinutes(todaySession.clockIn, todaySession.clockOut))
          : null;
    }

    return {
      id: emp.id,
      fullName: emp.fullName,
      employeeNumber: emp.employeeNumber,
      phone: emp.phone,
      status: emp.status,
      currentStatus: openSession ? 'IN' : 'OUT',
      todayClockIn: todaySession ? formatTimeHM(todaySession.clockIn) : null,
      todayDuration,
      periodTotalMinutes,
      periodTotalFormatted: minutesToHHMM(periodTotalMinutes),
    };
  });

  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length;

  return {
    employees: rows,
    summary: {
      activeCount,
      inCount,
      outCount: Math.max(activeCount - inCount, 0),
      missingCount,
    },
    periodLabel: period.label,
  };
}

/** כרטיס עובד: פרטי עובד + סטטוס חי + כל הרשומות בתקופה הנבחרת. */
export async function getEmployeeDetail(employeeId, { year, month }) {
  const employee = await employeeService.getEmployeeById(employeeId);
  const period = year && month ? getWorkPeriod(Number(year), Number(month)) : getCurrentWorkPeriod();

  const [sessions, departmentsMap] = await Promise.all([
    listSessionsInRange({ start: period.startDate, end: period.endDate }).then((all) =>
      all.filter((s) => s.employeeId === employeeId)
    ),
    getDepartmentsMap(),
  ]);

  const rows = sessions.map((s) => buildDisplayRow(s, departmentsMap));
  const periodTotalMinutes = sessions.reduce((sum, s) => sum + completedMinutes(s), 0);

  const openSession = sessions.find((s) => s.status === 'OPEN');
  const todayFormatted = formatDateDMY(nowInZone());
  const todaySession = sessions.find((s) => formatDateDMY(s.clockIn) === todayFormatted);

  return {
    employee,
    currentStatus: openSession ? 'IN' : 'OUT',
    todayClockIn: todaySession ? formatTimeHM(todaySession.clockIn) : null,
    todayDuration: todaySession
      ? todaySession.status === 'OPEN'
        ? minutesToHHMM(diffMinutes(todaySession.clockIn, nowInZone()))
        : minutesToHHMM(diffMinutes(todaySession.clockIn, todaySession.clockOut))
      : null,
    periodLabel: period.label,
    periodTotalFormatted: minutesToHHMM(periodTotalMinutes),
    rows,
  };
}

/** דוח סיכום שעות לתקופה, עבור עובד בודד או כל העובדים. */
export async function getEmployeesReport({ year, month, employeeId }) {
  const period = year && month ? getWorkPeriod(Number(year), Number(month)) : getCurrentWorkPeriod();

  const [employees, allSessions] = await Promise.all([
    employeeService.listEmployees({ status: 'ALL' }),
    listSessionsInRange({ start: period.startDate, end: period.endDate }),
  ]);

  const targetEmployees = employeeId ? employees.filter((e) => e.id === employeeId) : employees;
  const sessionsByEmployee = groupBy(allSessions, (s) => s.employeeId);

  const rows = targetEmployees.map((emp) => {
    const empSessions = sessionsByEmployee.get(emp.id) || [];
    const totalMinutes = empSessions.reduce((sum, s) => sum + completedMinutes(s), 0);
    return {
      employeeId: emp.id,
      fullName: emp.fullName,
      employeeNumber: emp.employeeNumber,
      totalMinutes,
      totalFormatted: minutesToHHMM(totalMinutes),
      sessionsCount: empSessions.length,
      missingCount: empSessions.filter((s) => s.status === 'MISSING_CLOCK_OUT').length,
    };
  });

  return { periodLabel: period.label, rows };
}

/**
 * מכין את כל הנתונים הדרושים ל-Export של Excel לכלל העובדים בבת אחת
 * (שאילתת Firestore יחידה לכל התקופה, במקום שאילתה נפרדת לכל עובד).
 */
export async function getFullExportData({ year, month, employeeId } = {}) {
  const period = year && month ? getWorkPeriod(Number(year), Number(month)) : getCurrentWorkPeriod();

  const [employees, allSessions, departmentsMap] = await Promise.all([
    employeeService.listEmployees({ status: 'ALL' }),
    listSessionsInRange({ start: period.startDate, end: period.endDate }),
    getDepartmentsMap(),
  ]);

  const targetEmployees = employeeId ? employees.filter((e) => e.id === employeeId) : employees;
  const sessionsByEmployee = groupBy(allSessions, (s) => s.employeeId);

  const summaryRows = [];
  const employeeSheets = [];

  for (const emp of targetEmployees) {
    const empSessions = (sessionsByEmployee.get(emp.id) || []).sort((a, b) =>
      a.clockIn < b.clockIn ? 1 : -1
    );
    const totalMinutes = empSessions.reduce((sum, s) => sum + completedMinutes(s), 0);
    const rows = empSessions.map((s) => buildDisplayRow(s, departmentsMap));

    summaryRows.push({
      employeeNumber: emp.employeeNumber,
      fullName: emp.fullName,
      totalFormatted: minutesToHHMM(totalMinutes),
      missingCount: empSessions.filter((s) => s.status === 'MISSING_CLOCK_OUT').length,
    });

    employeeSheets.push({
      employee: emp,
      periodLabel: period.label,
      rows,
      totalFormatted: minutesToHHMM(totalMinutes),
    });
  }

  return { periodLabel: period.label, summaryRows, employeeSheets };
}

/** דוח סה"כ שעות לפי מחלקה, כולל פירוט רשומות לכל מחלקה. */
export async function getDepartmentsReport({ year, month }) {
  const period = year && month ? getWorkPeriod(Number(year), Number(month)) : getCurrentWorkPeriod();

  const [allSessions, departmentsMap, employees] = await Promise.all([
    listSessionsInRange({ start: period.startDate, end: period.endDate }),
    getDepartmentsMap(),
    employeeService.listEmployees({ status: 'ALL' }),
  ]);

  const employeeNameById = new Map(employees.map((e) => [e.id, e.fullName]));
  const completed = allSessions.filter((s) => s.status === 'COMPLETE' && s.departmentId);
  const byDepartment = groupBy(completed, (s) => s.departmentId);

  const result = [];
  for (const [departmentId, deptSessions] of byDepartment.entries()) {
    const totalMinutes = deptSessions.reduce((sum, s) => sum + completedMinutes(s), 0);
    result.push({
      departmentId,
      departmentName: departmentsMap.get(departmentId) || '—',
      totalMinutes,
      totalFormatted: minutesToHHMM(totalMinutes),
      sessions: deptSessions
        .map((s) => ({
          id: s.id,
          employeeName: employeeNameById.get(s.employeeId) || '—',
          dateFormatted: formatDateDMY(s.clockIn),
          clockInTime: formatTimeHM(s.clockIn),
          clockOutTime: formatTimeHM(s.clockOut),
          totalFormatted: minutesToHHMM(completedMinutes(s)),
        }))
        .sort((a, b) => (a.dateFormatted < b.dateFormatted ? 1 : -1)),
    });
  }

  return result.sort((a, b) => b.totalMinutes - a.totalMinutes);
}
