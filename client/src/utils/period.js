/**
 * תקופת העבודה הנוכחית (החודש הקלנדרי הנוכחי) - לצורך בחירת ברירת המחדל
 * בבורר החודש בלבד. חישוב טווח התאריכים בפועל תמיד מתבצע בשרת
 * (getWorkPeriod ב-server/utils/timeUtils.js) - זהו רק "איזה חודש לבקש".
 */
export function getCurrentPeriodParts() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
