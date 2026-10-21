# IMD Stats

A responsive IMD job-activity dashboard with 7, 30, and 90 day views, daily bar and line charts, keyboard inspection, a paginated daily table, period comparisons, and CSV downloads.

The finished site is in **`dist/`**. Serve that directory as static files; the publisher does not need to rebuild it. All runtime assets, including the font and data, are local. Vite uses `base: './'`, and the export was tested under `/preview/` rather than only at an origin root.

## Install and develop

Use Node **22.18+ or 24+** and npm. The installation below keeps dependencies and npm's cache outside the repository:

```sh
mkdir -p /tmp/imd-stats-toolchain
cp package.json package-lock.json /tmp/imd-stats-toolchain/
npm ci --prefix /tmp/imd-stats-toolchain --cache /tmp/imd-stats-npm-cache
export IMD_TOOLCHAIN=/tmp/imd-stats-toolchain
export PATH="/tmp/imd-stats-toolchain/node_modules/.bin:$PATH"
npm run dev
```

Open the local URL Vite prints. `IMD_TOOLCHAIN` is an optional dependency-location setting, not a credential. On a conventional local installation with `npm ci`, omit that setting; the same source and scripts work.

## Rebuild and preview

With the external installation above:

```sh
npm run typecheck -- --typeRoots /tmp/imd-stats-toolchain/node_modules/@types
npm run test:data
npm run build
npm run check:delivery
npm run preview -- --port 4173
```

With a conventional local installation, use `npm run typecheck` without the `--typeRoots` option. Preview uses the actual production export. The chart needs JavaScript and HTTP hosting; opening `dist/index.html` directly with `file://` is not supported. Navigation uses in-page anchors and range hashes (`#7d`, `#30d`, `#90d`), so no server rewrites are needed.

## Data and updates

The shipped data is a real, dated snapshot of the [IMD public jobs API](https://api.imd.fun/jobs?limit=100), captured **2026-10-21 at 08:45:19 UTC**. The site clearly labels the snapshot and its partial final day. Ranges end on that snapshot date; this static export does not imply a live feed.

| Range | Dates, inclusive, UTC | Jobs created |
| --- | --- | ---: |
| 7 days | 15–21 October 2026 | 1,466 |
| 30 days | 22 September–21 October 2026 | 13,952 |
| 90 days | 24 July–21 October 2026 | 14,626 |

Each unique job ID returned by the public API counts once, on its `createdAt` UTC date, across all returned states and templates. These are creation counts, not successful-delivery counts. API visibility/retention governs the scope; a zero means no job records were returned for that date. The Explorer may apply different filters. No sample counts or simulated activity are shipped.

To update the date and counts, then rebuild:

```sh
npm run data:update
npm run test:data
npm run build
```

`scripts/update-data.mjs` fetches pages of up to 500 jobs using the verified `before` timestamp parameter. It deduplicates IDs, checks timestamp-boundary ties, and creates 180 consecutive daily rows: 90 visible days plus the preceding comparison period. Fetch/shape/pagination failures preserve the existing snapshot. The 100-page safety limit fails explicitly if reached. The build uses the bundled snapshot and never requires the API or credentials. Only aggregated dates/counts are shipped.

The daily average includes zero days and the partial final day. Percent change compares with the preceding equal-length calendar period; the page explicitly notes that the latest period is incomplete. When the previous total is zero, it displays that fact instead of an infinite percentage. CSV includes the snapshot timestamp and a `partial`/`full` coverage column.

## Validation actually run

The final production build and TypeScript check passed. Data checks passed **36 assertions**. Production-export browser checks passed **15 interaction groups** in Chromium and WebKit, including filters, pagination, keyboard chart inspection, CSV contents, errors, retry, and empty data. Chromium reflow checks covered 320, 390, 640, 768, 1024, and 1440 pixels, plus 200% text enlargement and an RTL stress check. WebKit covered the primary flow at 390 and 1440. The final axe scan reported **zero violations, 45 rule passes**. The pinned taste@1 probe passed **16/16**, including with external requests blocked. Dependency audit reported **zero vulnerabilities** for the lockfile.

These are worker-run checks, not an independent certification. The data is a snapshot; screen-reader sessions, physical phones, Firefox, native browser zoom, and live social-platform unfurls were not tested. The supplied browser connector could not launch its Chrome distribution; bounded Playwright checks supplied the rendered evidence instead. WebKit ran with temporary external browser libraries and software EGL.

See [the full validation and six-domain review](artifacts/validation.md), [design system](DESIGN.md), [mobile screenshot](artifacts/mobile-390.png), and [desktop screenshot](artifacts/desktop-1440.png).

### Repeat browser checks

Install optional test tooling outside the repository:

```sh
npm install --prefix /tmp/imd-stats-browser playwright@1 @axe-core/playwright --cache /tmp/imd-stats-npm-cache
PLAYWRIGHT_BROWSERS_PATH=/tmp/imd-stats-browsers /tmp/imd-stats-browser/node_modules/.bin/playwright install chromium webkit
IMD_PLAYWRIGHT=/tmp/imd-stats-browser/node_modules/playwright/index.mjs \
IMD_AXE=/tmp/imd-stats-browser/node_modules/@axe-core/playwright/dist/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/tmp/imd-stats-browsers \
IMD_CHECK_WEBKIT=1 npm run test:browser
```

Browser OS libraries must be available; on a machine without them, use Playwright's supported dependency setup or omit `IMD_CHECK_WEBKIT=1` to run the Chromium checks. The script manages its own temporary HTTP server, closes it and its browsers, and saves evidence to `test/scratch/validation/`. Scratch files are not deliverables.

The assignment's pinned probe was run as:

```sh
IMD_PLAYWRIGHT=/tmp/imd-stats-browser/node_modules/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/tmp/imd-stats-browsers \
node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline
```

The pinned input script is removed by the assignment after delivery; its actual final report is retained at [artifacts/taste.json](artifacts/taste.json).

## Files

- `src/`: React/TypeScript application, chart, data functions, icons, and design tokens.
- `public/`: dated count snapshot, local Inter font and license, favicon, share PNG and editable share SVG.
- `scripts/`: snapshot updater, data tests, and production-export browser validation.
- `dist/`: complete production export with relative asset URLs.
- `artifacts/`: validation report and selected real browser evidence.
- `DESIGN.md`: final tokens, typography, components, and responsive behavior.

No ignore file was created or changed. No dependency directories, package caches, mirrors, archives, or submodules are part of this delivery.

## Attribution

The local Inter font is distributed under the SIL Open Font License in `public/fonts/OFL.txt`. Design and documentation review used the assignment's pinned Better Interface and Impeccable references; their notices and licenses are retained in [artifacts/design-guidance-LICENSE.txt](artifacts/design-guidance-LICENSE.txt). Application styling, chart, and icons were implemented for this page.
