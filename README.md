# Stock Drawer

A little intuition. A lot of history.

Created by **Jarrod Savard** as a personal portfolio experiment. [Explore Jarrod's work](https://www.jarrodsavard.com/).

**Copyright (c) 2026 Jarrod Savard. All rights reserved.** This project is available for portfolio review and is not open source. Reuse requires prior written permission, subject to the exceptions in [LICENSE](LICENSE). Third-party dependencies, fonts, data, and media retain their respective licenses and terms.

Draw a price pattern, capture it as a snapshot, and find historical stock charts that resemble it. Replay real closing prices beneath the sketch, without changing their order or dates.

Built with **Nuxt 4, Vue 3, TypeScript, SVG, and a Web Worker**. Static hosting, self-hosted fonts, no accounts, tracking, paid APIs, or runtime market-data service.

## Run locally

Use **Node 24 LTS** (24.11 or newer) or Node 22.19+. Node 25 is not supported by this Nuxt release. An `.nvmrc` is included.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The development server binds to loopback only. This workspace already has the historical dataset in ignored `.local-data/`; fresh clones do not.

To prepare a fresh local copy, download version 4 of [Cam Nugent's S&P 500 dataset](https://www.kaggle.com/datasets/camnugent/sandp500), extract `all_stocks_5yr.csv`, and run:

```sh
npm run data:import -- path/to/all_stocks_5yr.csv
```

The importer writes compact prices and a SHA-256 source manifest into **`.local-data/` only**. Nuxt serves these prices through a development-only endpoint. Restarting is unnecessary; use **Retry dataset** if the app was already open. Alternatively, use **Load a stock CSV** in the app; parsing and searching happen entirely in the browser, and the file is not uploaded or persisted after closing/reloading the page.

## Data and publication status

**Real prices are intentionally excluded from the public build.** Kaggle labels the dataset CC0, but the publisher identifies the IEX API as the upstream source, whose third-party redistribution terms conflict with blanket republication. `--publish` is refused. This distinction is explained in the app, the public source manifest, and [the provenance review](docs/data-provenance.md).

The local dataset contains **505 historical tickers, 619,040 observations, February 8, 2013–February 7, 2018**. It is not today's S&P 500 membership. Prices are closing prices as supplied, in USD; split/dividend adjustment status has not been verified. The matcher measures chart resemblance, not investment quality or future performance.

The publishable version works with a visitor-supplied CSV. A frictionless public demo with bundled real prices still requires a dataset with confirmed redistribution rights. No fabricated stock prices are substituted. Synthetic observations exist only in automated tests.

### CSV contract

- Required columns: `date`, `close`, and `Name`, `ticker`, or `symbol` (case-insensitive).
- Optional `open`, `high`, and `low` columns enable candle views. Values must be positive and the high/low must enclose both open and close. Missing or inconsistent candles are marked unavailable, while valid closes remain searchable. The import manifest counts unavailable candles (23 in the local Kaggle dataset). Close-only files continue to work in line mode.
- One observation per row; ISO `YYYY-MM-DD` dates; finite positive USD closing prices.
- UTF-8 BOM, quoted fields, CRLF, additional columns, and unsorted rows are accepted.
- Identical observations are deduplicated. Conflicting duplicates, invalid dates/prices/tickers, and malformed rows fail with a row-specific message.
- Maximum input: 100 MB. Loading a new file replaces the active dataset.
- The union of observed dates forms the trading calendar. Missing sessions for an individual stock break search windows. Dates missing from every stock cannot be inferred; use a complete market calendar in a future ingestion upgrade.

## How matching works

1. Pointer input records a single left-to-right line. Backward motion and repeated horizontal positions are ignored. A sketch must cover half the drawable width.
2. **Find matches** makes an immutable coordinate copy and SVG image. Drawing speed does not affect the query.
3. Resample the sketch and candidate windows to 64 evenly spaced points, then independently normalize their vertical ranges. Price levels and drawing height do not affect the match.
4. Search 20-, 60-, or 120-session windows. **Quick** checks every fifth starting day plus the final complete window. **Deep** checks every starting day. Both exclude windows crossing missing observations.
5. Quick shortlists 200 by squared shape distance. Deep shortlists 1,000 and retains Quick's finalists (up to 1,200 unique candidates). Reserve ticker diversity, then rerank with dynamic time warping constrained to six sample positions either way.
6. Return each stock's best shortlisted period, up to five distinct stocks. Distance is a numeric shape error, not a probability. No minimum-quality guarantee is implied; a dataset may contain only weak resemblances.

Flat patterns match only flat windows. Small timing variations are allowed, but direction is preserved. Both modes remain approximate because they shortlist before DTW; Deep guarantees no worse ranked shape distances than Quick for the same data/query, not a global optimum or predictive accuracy. Choose Deep before searching or use **Search deeper** on a Quick result to reuse its frozen snapshot. Progress reports actual stocks/windows checked, and cancellation returns to the drawing. The replay uses original observations on an evenly spaced trading-session axis, never the warped alignment. Every session can be selected with the slider or arrow keys. Reduced-motion preferences disable automatic playback.

## Chart views

Choose **Line**, **Candlestick**, or **Heikin-Ashi** above a matched chart. Switching views preserves the selected result, snapshot, replay position, and play/pause state. Matching and result previews always use actual closing prices. Candle modes require complete valid OHLC values throughout the selected period; otherwise the app explains why only Line is available.

Candlesticks show original open, high, low, and close values. Hollow bodies close at or above their open; filled bodies close below it. Candles appear one trading session at a time. The current session's values are available above the chart and in candle tooltips. Price axes include wick extremes, while the sketch scales to the chart's vertical range.

Heikin-Ashi uses `close = (open + high + low + close) / 4`, `open = (previous HA open + previous HA close) / 2`, and extrema of the original high/low and averaged open/close. The first available bar seeds its open with `(original open + original close) / 2`. Averaging starts at the beginning of available history, before the matched period, and resets after missing candles or sessions. It uses no future bars. These are averaged chart values, not actual traded prices; the **Actual close** readout remains the original close. Formula reference: [StockCharts ChartSchool](https://chartschool.stockcharts.com/table-of-contents/chart-analysis/chart-types/heikin-ashi-candlesticks).

## Structure

- `app/components/`: drawing surface, replay, ranked matches.
- `app/lib/`: framework-independent snapshot and matching logic.
- `app/workers/` and `app/composables/`: background loading/search, typed messages, stale-response rejection.
- `shared/`: data contracts and importer shared by the browser and CLI.
- `scripts/`: import, benchmark, real-data UI and static-build checks.
- `server/api/local-data.get.ts`: loopback development convenience, unavailable in production.

No database or server is needed for the static version. Data processing runs off the main thread. New queries invalidate previous responses; new datasets are validated before becoming active.

See [architecture and SOLID decisions](docs/architecture.md) for the policy, scoring, execution and transport boundaries, and [testing strategy](docs/testing.md) for the unit/integration/E2E contracts. `AGENTS.md` records the project's ongoing SOLID and verification expectations. The GitHub Actions workflow runs checks without private market data.

## Verification

```sh
npm test
npm run typecheck
npx playwright install chromium
npm run test:browser
npm run format:check
npm run benchmark
npm run build
npm run preview
# In another terminal, with the local CSV available:
npm run verify:static
```

Browser tests use isolated, explicitly synthetic fixtures and real workers. They cover drawing, imports/errors, snapshot capture, Quick/Deep selection and refinement, cancellation/replacement, distinct matches, chart modes, replay, keyboard controls, reduced motion, responsive overflow and accessibility. Vitest covers algorithms plus real parser/service/async-search integration, stale loads, cancellation and recovery. Two adversarial regressions were mutation-checked: removing baseline retention loses a known Quick winner, and removing within-stock yields prevents timely cancellation.

With the development server and local dataset available, `npm run verify:ui` creates desktop/mobile screenshots under ignored `output/playwright/` and checks a real search. `npm run verify:static` confirms the public build has no private prices or API, imports the real CSV in-browser, returns five results, and makes no upload requests.

### Performance measurement

Measured September 25, 2026 on Windows, AMD Ryzen 9 7900, Node 24.19.0, using all 505 stocks. Each pattern/period/mode gets one warm-up and three measured synchronous searches; medians exclude data loading. Precomputing interpolation positions reduced repeated work without changing scores.

| Trading days | Quick windows | Deep windows | Quick median range | Deep median range |
| --- | ---: | ---: | ---: | ---: |
| 20 | 122,336 | 609,126 | 95–99 ms | 493–564 ms |
| 60 | 118,180 | 588,356 | 100–103 ms | 504–517 ms |
| 120 | 112,018 | 557,559 | 97–102 ms | 461–544 ms |

Ranges cover cup, rise, and double-peak patterns. Deep reduced the best match's distance in seven of nine cases (5.9–17.8%); two retained the same best score. Every ranked top-five distance was no worse. These are shape-error reductions, not investment accuracy or probabilities. Browser elapsed time also includes cooperative scheduling; slower devices may differ. `npm run benchmark` writes a reproducible report to ignored `output/search-benchmark.json`; `npm run verify:ui` measures actual worker searches.

The real Chromium worker measured **0.18 seconds Quick / 0.91 seconds Deep** for the 60-day cup sketch after loading data, including scheduling overhead. These are individual browser observations, separate from the CPU medians above.

## Static hosting

Run `npm run build`, then upload **only `.output/public/`** to a static host. `npm run preview` serves that directory at http://127.0.0.1:4173. Restart the preview after rebuilding because it caches the asset listing. No server functions or credentials are required. Never upload the project root or `.local-data/`.

For a subdirectory deployment, set `NUXT_APP_BASE_URL=/your-path/` when building. The worker's asset requests honor this base. Public deployment has not been performed.

The generated output includes the app and provenance metadata, not the private dataset. To ship bundled prices later, first resolve redistribution rights, preserve attribution, and explicitly revise the import/publication policy.
