/**
 * תקופת העבודה הנוכחית (16 בחודש הקודם עד 15 בחודש הנוכחי) - לצורך בחירת
 * ברירת המחדל בבורר החודש בלבד. חישוב טווח התאריכים בפועל תמיד מתבצע בשרת
 * (getWorkPeriod ב-server/utils/timeUtils.js) - זהו רק "איזה חודש לבקש".
 */
export function getCurrentPeriodParts() {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  if (now.getDate() > 15) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { year, month };
}
