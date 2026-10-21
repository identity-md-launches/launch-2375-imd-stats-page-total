# IMD Stats design system

## Overview

IMD Stats helps readers inspect the network's daily job creation counts. The visual idea is a quiet analytical page: an off-white canvas, white structured surfaces, forest-green controls and data, and a single prominent numeric summary. The page puts date ranges and totals before the chart, then supplies exact daily rows and the data definition.

The implementation is React, TypeScript, and plain CSS. `src/styles.css` is the canonical design system; `src/main.tsx` owns page composition. There is one English-language, light-theme page, with no wallet or account flow.

## Colors

Primitive ramps and semantic aliases are declared in `src/styles.css:9`. Components use semantic roles.

| Semantic token | Primitive / value | Implemented role |
| --- | --- | --- |
| `--color-page` | `--neutral-50`, `#f7f8f7` | Page canvas, table heading |
| `--color-surface` | `--neutral-0`, `#ffffff` | Header, metrics, chart, daily table, buttons, tooltip |
| `--color-surface-muted` | `--neutral-100`, `#f0f2f0` | Neutral control hover, partial badge, table-bar track |
| `--color-text` | `--neutral-900`, `#1d2922` | Headings, body, counts |
| `--color-text-secondary` | `--neutral-600`, `#566159` | Descriptions and secondary labels |
| `--color-text-muted` | `--neutral-500`, `#657168` | Captions, axis labels, footer |
| `--color-border` | `--neutral-200`, `#e2e6e2` | Structured surfaces, dividers, grid |
| `--color-control-border` | `--neutral-300`, `#ccd4cd` | Outlined action boundaries |
| `--color-accent`, `--color-focus` | `--green-900`, `#173e31` | Selected date range, brand, focus ring |
| `--color-accent-hover` | `--green-800`, `#234d39` | Primary action hover |
| `--color-data` | `--green-600`, `#52775b` | Complete-day bars and line |
| `--color-data-partial` | `--green-400`, `#7d996f` | Partial-day chart base and decorative table bars |
| `--color-note` | `--green-50`, `#edf3e9` | Data-method note |
| `--color-positive-bg` | `--green-100`, `#e1eadb` | Positive-comparison badge |
| `--color-positive-text` | `--green-900`, `#173e31` | Comparison badge text |

The final rendered-token measurements include primary text/white 15.08:1, secondary text/white 6.46:1, muted text/page 4.79:1, white/selected range 11.87:1, secondary text/note 5.72:1, and badge text/fill 9.60:1. Chart bars/white measure 5.06:1 and the partial-day base/white 3.15:1. See `artifacts/contrast.json` for values and thresholds. Borders are structural, not substitutes for labels or state.

The partial bar and its legend use stripes as well as color. The partial final line segment is dashed. Exact counts and a textual `Partial` label remain available in the table. The line's optional area fill uses the data color at 25% to 2.5% opacity; the line, rather than the translucent fill, communicates the data.

## Typography

The app uses the local variable Inter normal face, `public/fonts/inter-latin.woff2`, with `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, and sans-serif fallbacks. The file supplies a 100–900 weight axis; the UI uses only **400, 500, 600**. The font was confirmed loaded in the browser. Body-wide tabular numbers stabilize changing values. Root font smoothing is enabled; text remains selectable.

| Token | Size at default root | Use |
| --- | --- | --- |
| `--text-caption` | 12px / `.75rem` | Data captions, axis, dense table, mobile controls |
| `--text-small` | 14px / `.875rem` | Desktop UI and short descriptions |
| `--text-body` | 16px / `1rem` | Intro description, mobile section headings |
| `--text-section` | 20px / `1.25rem` | Desktop section headings, brand |
| `--text-number` | 32px / `2rem` | Narrow heading and metric values |
| `--text-display` | 40px / `2.5rem` | Wide heading and metric values |

Body line-height is 1.5; note prose is 1.7, note definitions 1.65; headings use 1.2/1.35. Display tracking is −.045em; wide numeric values use −.055em, changing to −.04em below 70rem. Section headings use −.025em, mobile −.02em. Captions and prose have natural tracking. Headings balance; prose uses pretty wrapping. Note prose is capped at 48ch, definitions at 46ch. Critical dates and counts are never truncated.

The SVG share artwork is an editable, schematic illustration, rendered to the supplied PNG. Its lettering is embedded in the PNG and is separate from the app's live type scale.

## Layout

Spacing tokens use **4, 8, 12, 16, 20, 24, 32, 40, 48px**. Page/surface spacing follows these steps; chart geometry and table-specific optical adjustments are explicit in their component rules.

- `.header-inner`: max 1360px, 48px inline padding, 80px minimum height on wide screens.
- `.page-shell`: max 1264px including padding, centered, 48px top/inline padding and 40px bottom on wide screens.
- `.metrics`: four columns at wide widths, with the total column slightly wider (`1.18fr 1fr 1fr 1fr`). Internal dividers replace individual nested cards.
- `.chart-panel`: 28px padding, chart plot 280px high, with fixed-width y-axis and flexible SVG. Controls sit above the chart.
- `.lower-grid`: daily table and data note, `1.7fr 1fr`, 24px gap. The table displays seven dates per page, newest first.

Implemented breakpoints:

| Query | Behavior |
| --- | --- |
| `max-width: 70rem` (1120px by default) | Page/header side padding 32px; heading/counts 32px; lower columns `1.4fr 1fr` |
| `max-width: 56rem` (896px) | Intro stacks; toolbar date span hides; metrics become at most two columns; lower grid becomes one column; data note briefly uses two internal columns |
| `max-width: 40rem` (640px) | 68px header, 20px side margins, no desktop nav; range controls remain primary; export becomes an icon button with its accessible name retained; chart is 200px high; metric/table spacing tightens; decorative table activity column hides; note stacks |
| `max-width: 23rem` (368px) | 16px margins, smaller chart gutter, three x-axis dates, legend footer wraps |
| container `max-width: 16rem` | At enlarged text sizes, one-column metric dividers and fewer x-axis dates; chart heading can wrap |

Metric grid minimums are relative to text size (`8rem`), so 200% text enlargement produces one metric per row rather than overflowing numbers. Header and toolbar can wrap. Tooltips have a 132px box clamped within the plot, with text wrapping. The chart explicitly retains left-to-right chronological order during an RTL layout stress test.

Observed reflow widths: **320, 390, 640, 768, 1024, 1440** in Chromium, and **390, 1440** in WebKit. The first screen at 390 shows the product heading, snapshot date, all range controls, export action, totals, and the start of the chart. 200% text enlargement and RTL reflow passed; native browser zoom and full RTL localization were not tested.

## Elevation & Depth

The interface is deliberately flat. White content surfaces use 1px structural borders without shadows. The green data note uses tone without a border. Only the floating chart tooltip has a shadow: `0 4px 24px #173e3124`; it has no border. The tooltip sits at z-index 2, and the keyboard-only skip link at 20. The header is in document flow and cannot cover chart content.

## Shapes

`--radius-control` is **7px**, `--radius-panel` is **12px**. Grouped range controls have a 10px outer radius with 4px padding and 6px inner buttons; mobile uses 9px/3px/6px. Chart-type controls use an 8px group, 3px padding, and 5px inner buttons. Pagination buttons have a 6px radius; badges and chart bars use restrained 2–4px rounding. The favicon is an inverse three-bar mark, and live icons use the same three-bar motif or 1.6px `currentColor` line strokes.

## Components

| Component / pattern | Source | Behavior |
| --- | --- | --- |
| `App`, range controls | `src/main.tsx:8`, `.range-controls` | 7/30/90 native pressed buttons; reset pagination, update range hash and polite status; ordinary anchors preserve the chosen range |
| Summary strip | `src/main.tsx:82`, `.metrics`, `.metric` | Total, daily average, earliest busiest date on ties, active days; all calculated from the selected snapshot rows |
| `Chart({ days, kind, endDate })` | `src/Chart.tsx:4` | Bar or area/line variant; pointer inspection across the plot; one keyboard tab stop, arrows/Home/End to inspect, Escape to dismiss; named SVG and polite exact-count announcement; full table equivalent |
| Export `.button` | `src/main.tsx:45` | Generates the actual selected rows as CSV; unavailable during loading/error; mobile visible icon and retained accessible text |
| Daily table/pagination | `src/main.tsx:96` | Scoped row/column headings, descriptive caption, seven rows per page; previous/next disabled at bounds; partial day labelled in text |
| Data note | `src/main.tsx:102`, `.data-note` | Metric definition, UTC convention, capture time, snapshot framing, public-source link |
| Load/error/empty states | `src/main.tsx:78` | Loading status, recoverable alert with `Try again`, honest zero-data state; invalid snapshots fail rather than render invented values |
| `Icon`, `BrandMark` | `src/icons.tsx` | Decorative SVGs, currentColor and consistent stroke; icon-only interactive controls have names on their native button |

Interactive states use the source's native controls: pressed, disabled, hover, focus, active, loading, error and empty. Focus is a 2px forest outline with 4px offset, and uses `Highlight` in forced colors. Hover is gated by pointer capability. Color/background/border transitions are 150ms and exist only with `prefers-reduced-motion: no-preference`; the generic action button scales to .96 on press. No entrance animation, autoplay, or endless motion is used.

## Do's and Don'ts

- Start another view with `.page-shell` and existing typography/spacing roles; keep the actual task and its controls ahead of explanatory content.
- Reuse the neutral outlined button for secondary actions and the forest fill for the selected primary range. Do not add competing accent colors.
- Keep dates in UTC and numbers tabular. Include a textual indicator for partial data, alongside its pattern/dash.
- Keep important labels and values in normal flow; allow grids and toolbars to reflow as text grows.
- Preserve one flat surface per section. Do not combine structural borders and drop shadows on the same panel.
- Add a new metric by deriving it from the same selected rows, giving it a plain label, and extending the meaningful data checks. Do not hard-code a changing count.

The six-domain review and fixes are recorded in `artifacts/validation.md`. Design guidance attribution and both upstream licenses are retained in `artifacts/design-guidance-LICENSE.txt`.
