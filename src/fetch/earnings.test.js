import test from 'node:test';
import assert from 'node:assert/strict';
import { assertHealthyFetch, parseEarningsResponse } from './earnings.js';

test('valid day and weekend responses are accepted', () => {
  const day = parseEarningsResponse({ status: { rCode: 200 }, data: { asOf: 'Nov 5, 2026', rows: [{ symbol: 'LITE' }] } }, '2026-11-05');
  assert.equal(day.data[0].symbol, 'LITE');
  assert.ok(Number.isFinite(Date.parse(day.fetchedAt)));
  assert.equal(parseEarningsResponse({ status: { rCode: 200 }, data: null }, '2026-11-07').data, null);
});

test('bad provider responses never silently become empty earnings days', () => {
  for (const payload of [
    {}, { status: { rCode: 500 }, data: null }, { status: { rCode: 200 } },
    { status: { rCode: 200 }, data: {} },
    { status: { rCode: 200 }, data: { rows: {} } },
    { status: { rCode: 200 }, data: { rows: [{}] } },
    { status: { rCode: 200 }, data: { rows: [{ symbol: ' ' }] } },
    { status: { rCode: 200 }, data: { asOf: 'Nov 6, 2026', rows: [] } },
  ]) assert.throws(() => parseEarningsResponse(payload, '2026-11-05'));
});

test('an outage, uncached missing day or empty whole window prevents publication', () => {
  for (const stats of [
    { saved: 0, kept: 31, failed: 0, rows: 0 },
    { saved: 30, kept: 0, failed: 1, rows: 100 },
    { saved: 31, kept: 0, failed: 0, rows: 0 },
  ]) assert.throws(() => assertHealthyFetch(stats), /preserve the previously published calendar/);
  assert.doesNotThrow(() => assertHealthyFetch({ saved: 30, kept: 1, failed: 0, rows: 100 }));
});
