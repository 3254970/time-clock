import * as functions from 'firebase-functions';
import app from './app.js';
import { runDailyAttendanceJob } from './jobs/dailyAttendanceJob.js';
import { ZONE } from './utils/timeUtils.js';

/**
 * נקודת הכניסה כשהשרת רץ כ-Firebase Cloud Function (Gen 1 - נבנה על
 * cloudfunctions.googleapis.com, לא על Cloud Run). זו חלופה ל-server.js,
 * לשימוש כש-run.googleapis.com חסום ברשת הפריסה.
 *
 * שתי הפונקציות המיוצאות כאן משתמשות באותו app.js ו-attendanceService בדיוק
 * כמו הריצה הרגילה - אין לוגיקה עסקית כפולה.
 */

// כל בקשות ה-API (Hosting מפנה /api/** לכאן דרך firebase.json)
export const api = functions.region('europe-west1').https.onRequest(app);

// תחליף ל-node-cron בסביבה סרברלס: Cloud Scheduler מפעיל את זה כל חצות
export const dailyJob = functions
  .region('europe-west1')
  .pubsub.schedule('0 0 * * *')
  .timeZone(ZONE)
  .onRun(async () => {
    await runDailyAttendanceJob();
    return null;
  });
