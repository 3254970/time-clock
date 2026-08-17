import cron from 'node-cron';
import { listAllOpenSessions, markSessionMissing } from '../services/attendanceService.js';
import { ZONE } from '../utils/timeUtils.js';

/**
 * רץ בכל חצות (לפי Asia/Jerusalem). כל session שנשאר OPEN הופך ל-MISSING_CLOCK_OUT.
 * לעולם לא ממציאים שעת יציאה - clockOut נשאר null.
 */
export async function runDailyAttendanceJob() {
  const openSessions = await listAllOpenSessions();
  for (const session of openSessions) {
    await markSessionMissing(session.id);
  }
  console.log(`[dailyAttendanceJob] נסגרו ${openSessions.length} רשומות פתוחות כ-MISSING_CLOCK_OUT`);
  return openSessions.length;
}

export function startDailyAttendanceJob() {
  cron.schedule('0 0 * * *', () => {
    runDailyAttendanceJob().catch((err) => console.error('[dailyAttendanceJob] שגיאה:', err));
  }, { timezone: ZONE });

  console.log(`[dailyAttendanceJob] מתוזמן לרוץ כל חצות (${ZONE})`);
}
