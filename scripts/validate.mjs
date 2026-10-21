import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium, webkit } = await import(process.env.IMD_PLAYWRIGHT
  ? pathToFileURL(process.env.IMD_PLAYWRIGHT).href : 'playwright');
const root = resolve('dist');
const output = resolve('test/scratch/validation');
await mkdir(output, { recursive: true });
const snapshot = JSON.parse(await readFile('dist/data/jobs.json', 'utf8'));
const expectedTotal = period => snapshot.days.slice(-period).reduce((sum, day) => sum + day.jobs, 0).toLocaleString('en-US');
const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith('/preview/')) { response.writeHead(404); response.end(); return; }
    const file = resolve(root, pathname.slice('/preview/'.length) || 'index.html');
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Invalid path');
    response.writeHead(200, { 'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream' });
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
let browser;
const results = [];
const passed = text => { results.push(text); console.log(`PASS: ${text}`); };
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [], failed = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failed.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (!request.url().startsWith(url) && !request.url().startsWith('blob:')) external.push(request.url()); });
  await page.goto(url);
  await page.getByTestId('total').waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.getByTestId('total').innerText(), expectedTotal(30));
  assert(await page.evaluate(() => document.fonts.check('400 14px Inter')));
  passed('Production export loads at /preview/ with its local Inter font and 30 day default.');
  const colorEvidence = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const color = property => style.getPropertyValue(property).trim();
    const luminance = hex => {
      const channels = hex.replace('#', '').match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
      return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    };
    const pairs = [
      ['Primary text / surface', color('--color-text'), color('--color-surface'), 4.5],
      ['Secondary text / surface', color('--color-text-secondary'), color('--color-surface'), 4.5],
      ['Muted text / page', color('--color-text-muted'), color('--color-page'), 4.5],
      ['Selected range text / accent', color('--neutral-0'), color('--color-accent'), 4.5],
      ['Secondary text / note', color('--color-text-secondary'), color('--color-note'), 4.5],
      ['Badge text / badge fill', color('--color-positive-text'), color('--color-positive-bg'), 4.5],
      ['Chart bars / actual chart surface', color('--color-data'), '#ffffff', 3],
      ['Partial chart base / actual chart surface', color('--color-data-partial'), '#ffffff', 3],
    ];
    return { chartBackground: getComputedStyle(document.querySelector('.chart-panel')).backgroundColor, pairs: pairs.map(([name, foreground, background, threshold]) => {
      const a = luminance(foreground), b = luminance(background);
      return { name, foreground, background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), threshold };
    }) };
  });
  assert.equal(colorEvidence.chartBackground, 'rgb(255, 255, 255)');
  for (const pair of colorEvidence.pairs) assert(pair.ratio >= pair.threshold, `${pair.name}: ${pair.ratio}`);
  await import('node:fs/promises').then(fs => fs.writeFile(`${output}/contrast.json`, JSON.stringify(colorEvidence, null, 2)));
  passed('Eight rendered-token contrast pairs meet text and graphical-object thresholds.');

  for (const period of [7, 90, 30]) {
    await page.getByRole('button', { name: `${period} days`, exact: true }).click();
    assert.equal(await page.getByTestId('total').innerText(), expectedTotal(period));
    assert.equal(await page.getByRole('button', { name: `${period} days`, exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.data-bar').count(), period);
    assert.equal(new URL(page.url()).hash, `#${period}d`);
  }
  passed('7 / 30 / 90 day filters update totals, bar counts, pressed states and URL.');

  await page.getByRole('button', { name: '90 days', exact: true }).click();
  await page.getByRole('link', { name: 'About the data', exact: true }).click();
  assert.equal(await page.getByTestId('total').innerText(), expectedTotal(90));
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  assert.equal(await page.getByTestId('total').innerText(), expectedTotal(90));
  passed('About the data and Overview anchors preserve a selected 90 day range.');

  const allTableRows = [];
  for (let index = 0; index < 13; index++) {
    allTableRows.push(...await page.locator('tbody th').allTextContents());
    if (index < 12) await page.getByRole('button', { name: 'Next page of daily counts' }).click();
  }
  assert.equal(allTableRows.length, 90);
  assert.equal(new Set(allTableRows).size, 90);
  assert(await page.getByRole('button', { name: 'Next page of daily counts' }).isDisabled());
  await page.getByRole('button', { name: 'Previous page of daily counts' }).click();
  await page.getByRole('button', { name: '7 days', exact: true }).click();
  assert(await page.getByRole('button', { name: 'Previous page of daily counts' }).isDisabled());
  assert(await page.getByRole('button', { name: 'Next page of daily counts' }).isDisabled());
  passed('Pagination exposes all 90 dates once, stops at both bounds, and resets on range change.');

  await page.getByRole('button', { name: 'Line chart', exact: true }).click();
  assert.equal(await page.locator('.data-bar').count(), 0);
  assert.equal(await page.locator('.data-line').count(), 2);
  const chart = page.getByRole('group', { name: /^Daily jobs chart/ });
  await chart.focus();
  await page.keyboard.press('Home');
  assert((await page.locator('.chart-tooltip').innerText()).includes(snapshot.days.at(-7).jobs.toLocaleString('en-US')));
  await page.keyboard.press('ArrowRight');
  assert((await page.locator('.chart-tooltip').innerText()).includes(snapshot.days.at(-6).jobs.toLocaleString('en-US')));
  await page.keyboard.press('End');
  assert((await page.locator('.chart-tooltip').innerText()).includes('Partial day'));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.chart-tooltip').count(), 0);
  await page.getByRole('button', { name: 'Bar chart', exact: true }).click();
  passed('Bar/line switch and keyboard chart inspection work, including Home, arrows, End and Escape.');

  for (const period of [7, 30, 90]) {
    await page.getByRole('button', { name: `${period} days`, exact: true }).click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloading;
    assert.equal(download.suggestedFilename(), `imd-jobs-${period}d-${snapshot.endDate}.csv`);
    const path = `${output}/jobs-${period}d.csv`;
    await download.saveAs(path);
    const csv = (await readFile(path, 'utf8')).trim().split('\r\n');
    assert.equal(csv.length, period + 1);
    assert.equal(csv[1].split(',')[0], snapshot.days.at(-period).date);
    assert.equal(csv.filter(line => line.includes(',partial,')).length, 1);
    assert.equal(csv.slice(1).reduce((sum, line) => sum + Number(line.split(',')[1]), 0), Number(expectedTotal(period).replaceAll(',', '')));
  }
  passed('CSV downloads for every range contain the exact dates, counts, capture time, and partial-day flag.');

  await page.goto(`${url}#7d`);
  await page.getByTestId('total').waitFor();
  assert.equal(await page.getByTestId('total').innerText(), expectedTotal(7));
  await page.goto(`${url}#unexpected`);
  await page.reload();
  await page.getByTestId('total').waitFor();
  assert.equal(await page.getByTestId('total').innerText(), expectedTotal(30));
  passed('Direct range links and invalid-hash fallback work.');

  for (const width of [320, 390, 640, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    if (width === 390) {
      const title = await page.locator('h1').boundingBox();
      const ranges = await page.locator('.range-controls').boundingBox();
      const chartPanel = await page.locator('.chart-panel').boundingBox();
      assert(title.y + title.height < 844 && ranges.y + ranges.height < 844 && chartPanel.y < 844);
      await page.screenshot({ path: `${output}/390.png` });
      await page.screenshot({ path: `${output}/390-full.png`, fullPage: true });
    }
    // Sweep tooltips across all positions; no selection can create viewport overflow.
    const plot = await chart.boundingBox();
    for (const fraction of [0, .25, .5, .65, .9, .99]) {
      await page.mouse.move(plot.x + plot.width * fraction, plot.y + 15);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Tooltip overflow at ${width}`);
    }
    await page.mouse.move(0, 0);
    if (width === 1440) await page.screenshot({ path: `${output}/1440-full.png`, fullPage: true });
  }
  passed('No overflow at 320, 390, 640, 768, 1024, 1440, including tooltip sweeps; product and controls visible at 390.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.getByTestId('total').waitFor();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').innerText(), 'Skip to content');
  await page.keyboard.press('Enter');
  for (let index = 0; index < 3; index++) await page.keyboard.press('Tab');
  const ring = await page.locator(':focus').evaluate(element => ({ width: getComputedStyle(element).outlineWidth, style: getComputedStyle(element).outlineStyle }));
  assert.equal(ring.width, '2px');
  assert.equal(ring.style, 'solid');
  await page.screenshot({ path: `${output}/keyboard-focus-390.png` });
  passed('Keyboard skip link and visible two-pixel focus outline work on mobile.');

  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await page.screenshot({ path: `${output}/text-200-percent.png`, fullPage: true });
  const enlargedOverflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(element => { const rect = element.getBoundingClientRect(); return rect.width && (rect.right > innerWidth + 1 || rect.left < -1); }).map(element => `${element.tagName}.${element.className}`));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `200% text overflow: ${enlargedOverflow.join(', ')}`);
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; document.documentElement.dir = 'rtl'; });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert(await page.locator('.chart-dates').evaluate(element => element.firstElementChild.getBoundingClientRect().left < element.lastElementChild.getBoundingClientRect().left));
  await page.screenshot({ path: `${output}/rtl-390.png`, fullPage: true });
  await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert(await page.locator('button').first().evaluate(element => getComputedStyle(element).transitionDuration === '0s'));
  passed('200% text enlargement, RTL reflow and reduced-motion checks pass at 390 (not native browser zoom).');

  const mock = await context.newPage();
  let mode = 'loading';
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await mock.route('**/data/jobs.json', async route => {
    if (mode === 'loading') { await gate; await route.fulfill({ status: 503, body: 'Unavailable' }); }
    else if (mode === 'error') await route.fulfill({ status: 503, body: 'Unavailable' });
    else if (mode === 'invalid') await route.fulfill({ json: { ...snapshot, days: [] } });
    else if (mode === 'empty') await route.fulfill({ json: { ...snapshot, days: snapshot.days.map(day => ({ ...day, jobs: 0 })) } });
    else await route.fulfill({ json: snapshot });
  });
  await mock.goto(url, { waitUntil: 'domcontentloaded' });
  await mock.getByRole('heading', { name: 'Loading job activity' }).waitFor();
  assert(await mock.getByRole('button', { name: 'Export CSV' }).isDisabled());
  release();
  await mock.getByRole('heading', { name: 'Job data couldn’t load' }).waitFor();
  mode = 'ready';
  await mock.getByRole('button', { name: 'Try again', exact: true }).click();
  await mock.getByTestId('total').waitFor();
  assert.equal(await mock.getByTestId('total').innerText(), expectedTotal(30));
  mode = 'invalid';
  await mock.reload();
  await mock.getByRole('heading', { name: 'Job data couldn’t load' }).waitFor();
  mode = 'empty';
  await mock.getByRole('button', { name: 'Try again', exact: true }).click();
  await mock.getByRole('heading', { name: 'No jobs in this period' }).waitFor();
  assert.equal(await mock.getByTestId('total').innerText(), '0');
  passed('Loading, failed-file, malformed-data, retry recovery and empty-data states work without fabricated data.');
  await mock.close();

  if (process.env.IMD_AXE) {
    const { default: AxeBuilder } = await import(pathToFileURL(process.env.IMD_AXE).href);
    await page.goto(url);
    await page.getByTestId('total').waitFor();
    const result = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(result.violations.map(violation => ({ id: violation.id, impact: violation.impact, count: violation.nodes.length })), []);
    passed(`axe accessibility scan: zero violations (${result.passes.length} rule passes).`);
  }

  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  assert.deepEqual(external, []);
  passed('Zero production-page JavaScript errors, failed resources or external runtime requests.');
  await context.close();
  if (process.env.IMD_CHECK_WEBKIT === '1') {
    let safari;
    try {
      safari = await webkit.launch({ headless: true });
      const safariPage = await safari.newPage({ viewport: { width: 390, height: 844 } });
      const safariErrors = [];
      safariPage.on('pageerror', error => safariErrors.push(error.message));
      safariPage.on('response', response => { if (response.status() >= 400) safariErrors.push(`${response.status()} ${response.url()}`); });
      await safariPage.goto(url);
      await safariPage.getByTestId('total').waitFor();
      for (const period of [7, 30, 90]) {
        await safariPage.getByRole('button', { name: `${period} days`, exact: true }).click();
        assert.equal(await safariPage.getByTestId('total').innerText(), expectedTotal(period));
      }
      await safariPage.getByRole('button', { name: 'Line chart', exact: true }).click();
      assert.equal(await safariPage.locator('.data-line').count(), 2);
      assert(await safariPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const safariChart = safariPage.getByRole('group', { name: /^Daily jobs chart/ });
      await safariChart.focus();
      await safariPage.keyboard.press('End');
      assert((await safariPage.locator('.chart-tooltip').innerText()).includes('Partial day'));
      await safariPage.keyboard.press('Home');
      await safariPage.keyboard.press('Escape');
      const safariDownload = safariPage.waitForEvent('download');
      await safariPage.getByRole('button', { name: 'Export CSV' }).click();
      assert.equal((await safariDownload).suggestedFilename(), `imd-jobs-90d-${snapshot.endDate}.csv`);
      await safariPage.getByRole('button', { name: '30 days', exact: true }).click();
      await safariPage.getByRole('button', { name: 'Bar chart', exact: true }).click();
      await safariPage.waitForFunction(() => document.querySelector('button[aria-label="Bar chart"]').getAttribute('aria-pressed') === 'true');
      await safariPage.reload();
      await safariPage.getByTestId('total').waitFor();
      await safariPage.evaluate(() => document.fonts.ready);
      await safariPage.screenshot({ path: `${output}/webkit-390.png`, fullPage: true });
      await safariPage.setViewportSize({ width: 1440, height: 1000 });
      assert(await safariPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await safariPage.screenshot({ path: `${output}/webkit-1440.png`, fullPage: true });
      assert.deepEqual(safariErrors, []);
      passed('WebKit at 390 and 1440: ranges, line/bar chart, keyboard inspection, CSV download, local assets and no overflow or script/resource errors.');
    } finally { await safari?.close(); }
  }
  console.log(`\n${results.length} interaction groups passed. Screenshots and downloads: test/scratch/validation/.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
