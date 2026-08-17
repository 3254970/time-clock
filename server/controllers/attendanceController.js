import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import * as attendanceService from '../services/attendanceService.js';
import { getWorkPeriod, getCurrentWorkPeriod, minutesToHHMM } from '../utils/timeUtils.js';

function requireEmployeeContext(req) {
  if (!req.user.employeeId) {
    throw new AppError('המשתמש אינו משויך לעובד', 400);
  }
  return req.user.employeeId;
}

/** GET /api/attendance/status */
export const getStatus = asyncHandler(async (req, res) => {
  const employeeId = requireEmployeeContext(req);
  const data = await attendanceService.getEmployeeStatus(employeeId);
  sendSuccess(res, data);
});

/** POST /api/attendance/clock-in */
export const clockIn = asyncHandler(async (req, res) => {
  const employeeId = requireEmployeeContext(req);
  const session = await attendanceService.clockIn({ employeeId, source: 'WEB', createdBy: req.user.uid });
  sendSuccess(res, session, 201);
});

/** POST /api/attendance/clock-out */
export const clockOut = asyncHandler(async (req, res) => {
  const employeeId = requireEmployeeContext(req);
  const { departmentId } = req.body;
  const session = await attendanceService.clockOut({
    employeeId,
    departmentId,
    source: 'WEB',
    createdBy: req.user.uid,
  });
  sendSuccess(res, session);
});

/** GET /api/attendance/my-period?year=&month= */
export const getMyPeriod = asyncHandler(async (req, res) => {
  const employeeId = requireEmployeeContext(req);
  const { year, month } = req.query;
  const period = year && month ? getWorkPeriod(Number(year), Number(month)) : getCurrentWorkPeriod();

  const [sessions, departmentsMap] = await Promise.all([
    attendanceService.listSessionsForEmployee(employeeId, { start: period.startDate, end: period.endDate }),
    attendanceService.getDepartmentsMap(),
  ]);

  const rows = sessions.map((s) => attendanceService.buildDisplayRow(s, departmentsMap));
  const totalMinutes = rows.reduce((sum, r) => sum + (r.totalMinutes || 0), 0);

  sendSuccess(res, {
    periodLabel: period.label,
    rows,
    totalFormatted: minutesToHHMM(totalMinutes),
  });
});

async function assertCanAccessSession(req, sessionId) {
  const session = await attendanceService.getSessionRaw(sessionId);
  const isAdmin = ['ADMIN', 'MANAGER'].includes(req.user.role);
  if (!isAdmin && session.employeeId !== req.user.employeeId) {
    throw new AppError('אין לך הרשאה לצפות ברשומה זו', 403);
  }
  return session;
}

/** GET /api/attendance/:id */
export const getSession = asyncHandler(async (req, res) => {
  const session = await assertCanAccessSession(req, req.params.id);
  const departmentsMap = await attendanceService.getDepartmentsMap();
  sendSuccess(res, attendanceService.buildDisplayRow(session, departmentsMap));
});

/** PUT /api/attendance/:id - עריכה (עובד לרשומה שלו, מנהל לכל רשומה). כל עריכה נשמרת ב-Audit. */
export const updateSession = asyncHandler(async (req, res) => {
  await assertCanAccessSession(req, req.params.id);
  const updated = await attendanceService.updateSession(req.params.id, req.body, {
    changedByUid: req.user.uid,
    changedByRole: req.user.role,
    source: ['ADMIN', 'MANAGER'].includes(req.user.role) ? 'ADMIN' : 'WEB',
  });
  const departmentsMap = await attendanceService.getDepartmentsMap();
  sendSuccess(res, attendanceService.buildDisplayRow(updated, departmentsMap));
});

/** GET /api/admin/attendance?employeeId=&year=&month=&status= */
export const adminListAttendance = asyncHandler(async (req, res) => {
  const { employeeId, year, month, status } = req.query;
  const period = year && month ? getWorkPeriod(Number(year), Number(month)) : getCurrentWorkPeriod();

  const [sessions, departmentsMap] = await Promise.all([
    attendanceService.listSessionsInRange({ start: period.startDate, end: period.endDate }),
    attendanceService.getDepartmentsMap(),
  ]);

  let filtered = sessions;
  if (employeeId) filtered = filtered.filter((s) => s.employeeId === employeeId);
  if (status) filtered = filtered.filter((s) => s.status === status);

  sendSuccess(res, {
    periodLabel: period.label,
    rows: filtered.map((s) => attendanceService.buildDisplayRow(s, departmentsMap)),
  });
});
