import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';

test('normalizePhoneNumber: פורמט מקומי נשאר כמו שהוא', () => {
  assert.equal(normalizePhoneNumber('0501234567'), '0501234567');
});

test('normalizePhoneNumber: קידומת בינלאומית 972 הופכת ל-0', () => {
  assert.equal(normalizePhoneNumber('972501234567'), '0501234567');
});

test('normalizePhoneNumber: תומך בפורמט עם מקפים ורווחים ו-+', () => {
  assert.equal(normalizePhoneNumber('+972-50-123-4567'), '0501234567');
});

test('normalizePhoneNumber: מחרוזת ריקה מחזירה ריק', () => {
  assert.equal(normalizePhoneNumber(''), '');
  assert.equal(normalizePhoneNumber(null), '');
});
