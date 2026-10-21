import { writeFile, mkdir } from 'node:fs/promises';

const source = 'https://api.imd.fun/jobs';
const capturedAt = new Date().toISOString();
const endDate = capturedAt.slice(0, 10);
const start = new Date(`${endDate}T00:00:00Z`);
start.setUTCDate(start.getUTCDate() - 179);
const startDate = start.toISOString().slice(0, 10);
const counts = new Map();
for (let day = new Date(start); day.toISOString().slice(0, 10) <= endDate; day.setUTCDate(day.getUTCDate() + 1)) {
  counts.set(day.toISOString().slice(0, 10), 0);
}
const seen = new Set();
let before = capturedAt;
let pages = 0;
let complete = false;
while (pages < 100) {
  const url = new URL(source);
  url.searchParams.set('limit', '500');
  url.searchParams.set('before', before);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Public jobs API returned ${response.status}. Existing snapshot kept.`);
  const page = await response.json();
  if (!Array.isArray(page.jobs)) throw new Error('Unexpected API response. Existing snapshot kept.');
  pages++;
  if (!page.jobs.length) { complete = true; break; }
  let oldest = before;
  for (const job of page.jobs) {
    if (typeof job.id !== 'string' || typeof job.createdAt !== 'string' || !Number.isFinite(Date.parse(job.createdAt))) {
      throw new Error('A job has an invalid ID or date. Existing snapshot kept.');
    }
    if (job.createdAt >= before) throw new Error('API did not respect the pagination boundary. Existing snapshot kept.');
    if (job.createdAt < oldest) oldest = job.createdAt;
    if (seen.has(job.id)) continue;
    seen.add(job.id);
    const date = job.createdAt.slice(0, 10);
    if (counts.has(date)) counts.set(date, counts.get(date) + 1);
  }
  console.log(`Page ${pages}: ${page.jobs.length} jobs, through ${oldest.slice(0, 10)}`);
  // Check the exclusive timestamp boundary for ties before moving to the next page.
  if (page.jobs.length === 500) {
    const boundaryURL = new URL(source);
    boundaryURL.searchParams.set('limit', '500');
    boundaryURL.searchParams.set('before', new Date(Date.parse(oldest) + 1).toISOString());
    const boundaryResponse = await fetch(boundaryURL, { signal: AbortSignal.timeout(30000) });
    if (!boundaryResponse.ok) throw new Error(`Boundary check returned ${boundaryResponse.status}. Existing snapshot kept.`);
    const boundary = await boundaryResponse.json();
    if (!Array.isArray(boundary.jobs)) throw new Error('Invalid boundary response. Existing snapshot kept.');
    const ties = boundary.jobs.filter(job => job.createdAt === oldest);
    if (ties.length === 500) throw new Error('Too many jobs share a timestamp to safely paginate. Existing snapshot kept.');
    for (const job of ties) {
      if (!seen.has(job.id)) {
        seen.add(job.id);
        const date = job.createdAt.slice(0, 10);
        if (counts.has(date)) counts.set(date, counts.get(date) + 1);
      }
    }
  }
  if (oldest.slice(0, 10) < startDate || page.jobs.length < 500) { complete = true; break; }
  if (oldest >= before) throw new Error('Pagination stopped advancing. Existing snapshot kept.');
  before = oldest;
}
if (!complete) throw new Error('Page safety limit reached. Existing snapshot kept.');
const snapshot = {
  schemaVersion: 1,
  source,
  capturedAt,
  timezone: 'UTC',
  metric: 'Jobs created; all returned job states and templates; one count per unique job ID.',
  startDate,
  endDate,
  pagesFetched: pages,
  days: [...counts].map(([date, jobs]) => ({ date, jobs })),
};
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/jobs.json', import.meta.url), JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Saved ${snapshot.days.length} UTC days, ${snapshot.days.reduce((sum, day) => sum + day.jobs, 0)} jobs. Captured ${capturedAt}.`);
