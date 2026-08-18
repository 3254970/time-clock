import 'dotenv/config';
import app from './app.js';
import { startDailyAttendanceJob } from './jobs/dailyAttendanceJob.js';

// נקודת כניסה להרצה עצמאית (מקומית / Cloud Run קלאסי). ב-Firebase Functions
// נכנסים דרך functionsIndex.js במקום זה - שם אין listen() ואין node-cron
// (הג'וב היומי שם רץ כ-scheduled function נפרד).
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`שרת הנוכחות פועל על פורט ${PORT}`);
  startDailyAttendanceJob();
});
