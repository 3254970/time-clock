import { DateTime } from 'luxon';

// כל חישובי הזמן במערכת מבוססים על אזור הזמן הזה בלבד (כולל שעון קיץ).
export const ZONE = process.env.TIMEZONE || 'Asia/Jerusalem';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

/** רגע נוכחי לפי שעון ישראל. השרת קובע תמיד את הזמן - לא ה-Frontend. */
export function nowInZone() {
  return DateTime.now().setZone(ZONE);
}

/** ממיר Firestore Timestamp / Date / מחרוזת ISO ל-DateTime של Luxon באזור ישראל. */
export function toZonedDateTime(value) {
  if (value == null) return null;
  if (value instanceof DateTime) return value.setZone(ZONE);
  if (typeof value?.toDate === 'function') {
    return DateTime.fromJSDate(value.toDate()).setZone(ZONE);
  }
  if (value instanceof Date) return DateTime.fromJSDate(value).setZone(ZONE);
  if (typeof value === 'string') return DateTime.fromISO(value).setZone(ZONE);
  return null;
}

/** ממיר ל-Date רגיל (JS) לצורך שמירה כ-Timestamp ב-Firestore. */
export function toJSDate(value) {
  const zoned = toZonedDateTime(value);
  return zoned ? zoned.toJSDate() : null;
}

export function formatTimeHM(value) {
  const zoned = toZonedDateTime(value);
  return zoned ? zoned.toFormat('HH:mm') : null;
}

export function formatDateDMY(value) {
  const zoned = toZonedDateTime(value);
  return zoned ? zoned.toFormat('dd/MM/yyyy') : null;
}

export function formatHebrewDayName(value) {
  const zoned = toZonedDateTime(value);
  return zoned ? zoned.setLocale('he').toFormat('cccc') : null;
}

/** מספר דקות מלא (מעוגל) בין שני זמנים. מחזיר null אם חסר אחד הזמנים. */
export function diffMinutes(startValue, endValue) {
  const start = toZonedDateTime(startValue);
  const end = toZonedDateTime(endValue);
  if (!start || !end) return null;
  return Math.round(end.diff(start, 'minutes').minutes);
}

/** ממיר דקות (מספר שלם) לתצוגת HH:MM. אין להציג שברי שעה עשרוניים. */
export function minutesToHHMM(totalMinutes) {
  if (totalMinutes == null || Number.isNaN(totalMinutes)) return null;
  const sign = totalMinutes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(totalMinutes));
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * תקופת עבודה: מה-16 בחודש הקודם עד ה-15 בחודש הנוכחי (כולל).
 * לדוגמה getWorkPeriod(2026, 8) => 16/07/2026 - 15/08/2026.
 * זוהי הפונקציה המרכזית היחידה לחישוב תקופת עבודה - אין לשכפל אותה.
 */
export function getWorkPeriod(year, month) {
  const end = DateTime.fromObject({ year, month, day: 15 }, { zone: ZONE }).endOf('day');
  const start = end.minus({ months: 1 }).set({ day: 16 }).startOf('day');

  return {
    year,
    month,
    start,
    end,
    startDate: start.toJSDate(),
    endDate: end.toJSDate(),
    startFormatted: start.toFormat('dd/MM/yyyy'),
    endFormatted: end.toFormat('dd/MM/yyyy'),
    label: `${HEBREW_MONTHS[month - 1]} ${year} (${start.toFormat('dd/MM/yyyy')} - ${end.toFormat('dd/MM/yyyy')})`,
  };
}

/** מחזיר את תקופת העבודה שבתוכה נמצא תאריך נתון. */
export function getWorkPeriodForDate(value) {
  const zoned = toZonedDateTime(value) || nowInZone();
  let year = zoned.year;
  let month = zoned.month;
  if (zoned.day > 15) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return getWorkPeriod(year, month);
}

export function getCurrentWorkPeriod() {
  return getWorkPeriodForDate(nowInZone());
}
