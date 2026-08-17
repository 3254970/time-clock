import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getWorkPeriod, minutesToHHMM, diffMinutes } from '../utils/timeUtils.js';

test('getWorkPeriod: אוגוסט 2026 הוא 16/07 - 15/08', () => {
  const period = getWorkPeriod(2026, 8);
  assert.equal(period.startFormatted, '16/07/2026');
  assert.equal(period.endFormatted, '15/08/2026');
});

test('getWorkPeriod: ינואר עובר לשנה קודמת בחישוב תחילת התקופה', () => {
  const period = getWorkPeriod(2026, 1);
  assert.equal(period.startFormatted, '16/12/2025');
  assert.equal(period.endFormatted, '15/01/2026');
});

test('minutesToHHMM: 510 דקות => 08:30', () => {
  assert.equal(minutesToHHMM(510), '08:30');
});

test('minutesToHHMM: 0 דקות => 00:00', () => {
  assert.equal(minutesToHHMM(0), '00:00');
});

test('minutesToHHMM: null => null', () => {
  assert.equal(minutesToHHMM(null), null);
});

test('diffMinutes: מחשב הפרש דקות בין שני זמנים', () => {
  const start = '2026-08-12T08:00:00.000Z';
  const end = '2026-08-12T09:30:00.000Z';
  assert.equal(diffMinutes(start, end), 90);
});

test('diffMinutes: מחזיר null אם חסר זמן', () => {
  assert.equal(diffMinutes(null, '2026-08-12T09:30:00.000Z'), null);
});
