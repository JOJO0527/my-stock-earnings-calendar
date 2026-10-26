import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvent, buildIcs, marketTimeToUtc } from './ics.js';

const lite = { symbol: 'LITE', companyName: 'Lumentum', date: '2026-11-05', time: 'After-hours', fiscalQuarterEnding: 'Sep/2026' };

for (const [date, hour, utc] of [
  ['2026-11-05', 16, '2026-11-05T21:00:00.000Z'],
  ['2026-07-15', 16, '2026-07-15T20:00:00.000Z'],
  ['2026-10-30', 16, '2026-10-30T20:00:00.000Z'],
  ['2026-11-02', 16, '2026-11-02T21:00:00.000Z'],
  ['2026-03-06', 8, '2026-03-06T13:00:00.000Z'],
  ['2026-03-09', 8, '2026-03-09T12:00:00.000Z'],
  ['2026-12-31', 16, '2026-12-31T21:00:00.000Z'],
]) {
  test(`Eastern ${date} ${hour}:00 uses the correct UTC offset`, () => {
    assert.equal(marketTimeToUtc(date, hour).toISOString(), utc);
  });
}

test('reject invalid dates and nonexistent spring-forward times', () => {
  assert.throws(() => marketTimeToUtc('2026-02-30', 16), /Invalid market date/);
  assert.throws(() => marketTimeToUtc('2026-03-08', 2, 30), /nonexistent/);
});

test('LITE moves to November 6 at 05:00 Beijing, explicitly as a reference', async () => {
  const event = buildEvent(lite);
  assert.deepEqual(event.start, [2026, 11, 5, 21, 0]);
  assert.match(event.title, /盘后参考（预计）/);
  assert.match(event.description, /北京时间提醒参考：2026\/11\/06 05:00/);
  assert.match(event.description, /不是电话会时间/);
  assert.equal(event.status, 'TENTATIVE');
  const text = (await buildIcs([lite], 'customstock', 'Custom')).replace(/\r?\n[ \t]/g, '');
  assert.match(text, /DTSTART:20261105T210000Z/);
  assert.doesNotMatch(text, /DTSTART;VALUE=DATE/);
  assert.match(text, /STATUS:TENTATIVE/);
  assert.match(text, /SEQUENCE:2/);
});

test('a pre-market reference stays on the same Beijing calendar date', () => {
  const event = buildEvent({ ...lite, time: 'Pre-market' });
  assert.deepEqual(event.start, [2026, 11, 5, 13, 0]);
  assert.match(event.description, /2026\/11\/05 21:00/);
});

test('Dell with no session stays explicitly unknown, without a fictitious timed alarm', async () => {
  const dell = { symbol: 'DELL', companyName: 'Dell', date: '2026-11-24', time: '' };
  const event = buildEvent(dell);
  assert.match(event.title, /美国日期 2026-11-24・时间待确认/);
  assert.match(event.description, /不是北京时间的财报发布日/);
  assert.deepEqual(event.end, [2026, 11, 25]);
  assert.deepEqual(event.alarms, []);
  const text = await buildIcs([dell], 'customstock', 'Custom');
  assert.match(text, /DTSTART;VALUE=DATE:20261124/);
  assert.match(text, /DTEND;VALUE=DATE:20261125/);
  assert.doesNotMatch(text, /BEGIN:VALARM/);
});

test('the existing UID survives the date-only to timed migration and date revisions', () => {
  assert.equal(buildEvent(lite).uid, 'LITE-Sep_2026-earnings@jojo0527.github.io');
  assert.equal(buildEvent(lite).uid, buildEvent({ ...lite, date: '2026-11-09', time: '' }).uid);
  assert.notEqual(buildEvent(lite).uid, buildEvent({ ...lite, fiscalQuarterEnding: 'Dec/2026' }).uid);
});
