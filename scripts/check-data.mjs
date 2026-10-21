import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { csvFor, getStats, parseSnapshot } from '../src/data.ts';

const snapshot = parseSnapshot(JSON.parse(await readFile(new URL('../public/data/jobs.json', import.meta.url), 'utf8')));
let assertions = 0;
const check = (value, expected) => { assert.deepEqual(value, expected); assertions++; };
check(snapshot.days.length, 180);
for (const period of [7, 30, 90]) {
  const stats = getStats(snapshot, period);
  const expectedDays = snapshot.days.filter(day => day.date >= snapshot.days[snapshot.days.length - period].date);
  check(stats.days, expectedDays);
  check(stats.total, expectedDays.reduce((sum, day) => sum + day.jobs, 0));
  check(stats.average, stats.total / period);
  check(stats.peak.jobs, Math.max(...expectedDays.map(day => day.jobs)));
  check(stats.active, expectedDays.filter(day => day.jobs !== 0).length);
  const csv = csvFor(stats.days, snapshot.capturedAt).trim().split('\r\n');
  check(csv.length, period + 1);
  check(csv[0], 'date_utc,jobs_created,coverage,snapshot_at_utc');
  check(csv.filter(line => line.includes(',partial,')).length, 1);
}
const empty = structuredClone(snapshot);
empty.days.forEach(day => { day.jobs = 0; });
check(getStats(empty, 90).total, 0);
check(getStats(empty, 90).change, null);
const invalid = [null, {}, { ...snapshot, timezone: 'local' }, { ...snapshot, days: snapshot.days.slice(1) }];
for (const value of invalid) { assert.throws(() => parseSnapshot(value)); assertions++; }
for (const mutate of [
  data => { data.days[0].jobs = -1; },
  data => { data.days[0].jobs = 1.5; },
  data => { data.days[0].date = '2026-02-30'; },
  data => { data.days[1].date = data.days[0].date; },
  data => { data.endDate = data.startDate; },
]) {
  const value = structuredClone(snapshot); mutate(value);
  assert.throws(() => parseSnapshot(value)); assertions++;
}
console.log(`PASS: ${assertions} data assertions; real snapshot totals: ${[7, 30, 90].map(period => `${period}d=${getStats(snapshot, period).total}`).join(', ')}.`);
