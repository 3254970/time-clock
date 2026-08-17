import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireRole } from '../middleware/requireRole.js';

function mockRes() {
  return {};
}

test('requireRole: מאפשר גישה לתפקיד תואם', () => {
  const middleware = requireRole('ADMIN');
  const req = { user: { role: 'ADMIN' } };
  let nextCalledWith = 'not-called';
  middleware(req, mockRes(), (err) => {
    nextCalledWith = err;
  });
  assert.equal(nextCalledWith, undefined);
});

test('requireRole: חוסם תפקיד לא מתאים', () => {
  const middleware = requireRole('ADMIN');
  const req = { user: { role: 'EMPLOYEE' } };
  let nextCalledWith = 'not-called';
  middleware(req, mockRes(), (err) => {
    nextCalledWith = err;
  });
  assert.ok(nextCalledWith instanceof Error);
  assert.equal(nextCalledWith.statusCode, 403);
});

test('requireRole: תומך במערך תפקידים מותרים', () => {
  const middleware = requireRole(['ADMIN', 'MANAGER']);
  const req = { user: { role: 'MANAGER' } };
  let nextCalledWith = 'not-called';
  middleware(req, mockRes(), (err) => {
    nextCalledWith = err;
  });
  assert.equal(nextCalledWith, undefined);
});

test('requireRole: חוסם כשאין req.user בכלל', () => {
  const middleware = requireRole('ADMIN');
  const req = {};
  let nextCalledWith = 'not-called';
  middleware(req, mockRes(), (err) => {
    nextCalledWith = err;
  });
  assert.ok(nextCalledWith instanceof Error);
});
