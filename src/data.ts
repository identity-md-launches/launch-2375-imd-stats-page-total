export type Period = 7 | 30 | 90;
export type Day = { date: string; jobs: number };
export type Snapshot = {
  schemaVersion: 1;
  source: string;
  capturedAt: string;
  timezone: 'UTC';
  metric: string;
  startDate: string;
  endDate: string;
  pagesFetched: number;
  days: Day[];
};

export const periods: Period[] = [7, 30, 90];
export const number = new Intl.NumberFormat('en-US');
export const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC', ...options })
    .format(new Date(`${date}T00:00:00Z`));

export function parseSnapshot(value: unknown): Snapshot {
  if (!value || typeof value !== 'object') throw new Error('Invalid data file');
  const data = value as Snapshot;
  if (data.schemaVersion !== 1 || data.timezone !== 'UTC' || !Number.isFinite(Date.parse(data.capturedAt))
    || !Array.isArray(data.days) || data.days.length < 180) throw new Error('Incomplete data file');
  let previous = '';
  for (const day of data.days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isSafeInteger(day.jobs) || day.jobs < 0)
      throw new Error('Invalid daily count');
    const timestamp = Date.parse(`${day.date}T00:00:00Z`);
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== day.date)
      throw new Error('Invalid date');
    if (previous && timestamp - Date.parse(`${previous}T00:00:00Z`) !== 86400000)
      throw new Error('Missing daily count');
    previous = day.date;
  }
  if (data.days[0].date !== data.startDate || previous !== data.endDate || data.capturedAt.slice(0, 10) !== data.endDate)
    throw new Error('Inconsistent snapshot dates');
  return data;
}

export function getStats(data: Snapshot, period: Period) {
  const days = data.days.slice(-period);
  const prior = data.days.slice(-period * 2, -period);
  const total = days.reduce((sum, day) => sum + day.jobs, 0);
  const previous = prior.reduce((sum, day) => sum + day.jobs, 0);
  const peak = days.reduce((best, day) => day.jobs > best.jobs ? day : best, days[0]);
  return {
    days, total, previous, peak,
    average: total / period,
    active: days.filter(day => day.jobs > 0).length,
    change: previous ? ((total - previous) / previous) * 100 : null,
  };
}

export function csvFor(days: Day[], capturedAt: string) {
  return 'date_utc,jobs_created,coverage,snapshot_at_utc\r\n'
    + days.map(day => `${day.date},${day.jobs},${day.date === capturedAt.slice(0, 10) ? 'partial' : 'full'},${capturedAt}`).join('\r\n')
    + '\r\n';
}

export function periodFromHash(): Period {
  const period = Number(location.hash.replace(/^#/, '').replace(/d$/, ''));
  return periods.includes(period as Period) ? period as Period : 30;
}
