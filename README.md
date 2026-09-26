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

Open http://127.0.0.1:3000. The development server binds to loopback only. **Real historical data loads automatically**, including on a fresh clone and a static host. No account, API key, or CSV is needed to try the app.

## Bundled historical data

The checked-in snapshot contains **100 selected stocks and 114,299 daily OHLC observations, March 7, 2022–September 24, 2026**, from [HF Data Library](https://hfdatalibrary.com/) (Ahmed Elkassabgi, 2026). It retains only observations explicitly identified as IEX Exchange HIST. The compilation is credited under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); IEX retains rights in the underlying data.

**Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the [IEX Historical Data Terms of Use](https://www.iex.io/legal/hist-data-terms).**

The data reflects IEX-only trading, not consolidated market closes. It is a selected historical sample, not today's S&P 500 or a live feed. Prices are supplied in the provider's cleaned version; adjustment status is not independently verified. Shape resemblance does not predict returns. See [the provenance review](docs/data-provenance.md) and [source manifest](public/data/source.json) for transformations, exclusions, checksums and limitations. The earlier restricted Kaggle development data remains excluded.

### Refreshing the snapshot (maintainers only)

Normal builds use the committed asset and require no secret or provider access. To acquire a new snapshot:

1. Create a free HF Data Library account, verify your email, complete the profile, and save its API key in an ignored `.env` file using `.env.example` as a template.
2. Install Python 3.12+ and `pyarrow==23.0.1` in a local environment (or `python -m pip install --target .local-data/python-deps pyarrow==23.0.1`).
3. Review the selected tickers and cutoff in `scripts/data/hf-universe.json`, then run:

```sh
python scripts/download-hf.py   # cached downloads; add --refresh to fetch again
npm run data:bundle            # validate provenance and create public assets
npm test
npm run test:browser
npm run typecheck
npm run format:check
npm run build
```

The download script keeps complete provider files in ignored `.local-data/hf/`. The importer admits only tagged IEX rows inside the approved dates, rejects invalid prices or conflicting duplicates, and writes attribution plus SHA-256 checksums. Never commit `.env` or the original provider files. The site does not need the API key in Vercel; a provider outage or expired key cannot break an ordinary build.

Visitors can optionally choose **Load a stock CSV** to replace the snapshot for their current session. It is parsed and searched entirely in the browser, never uploaded or saved. The generic `npm run data:import -- path/to/stocks.csv` utility remains local-only and refuses publication; its output is not automatically served by the app.

### CSV contract

- Required columns: `date`, `close`, and `Name`, `ticker`, or `symbol` (case-insensitive).
- Optional `open`, `high`, and `low` columns enable candle views. Values must be positive and the high/low must enclose both open and close. Missing or inconsistent candles are marked unavailable, while valid closes remain searchable. The import manifest counts unavailable candles. Close-only files continue to work in line mode.
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

See [architecture and SOLID decisions](docs/architecture.md) for the policy, scoring, execution and transport boundaries, and [testing strategy](docs/testing.md) for the unit/integration/E2E contracts. `AGENTS.md` records the project's ongoing SOLID and verification expectations. The GitHub Actions workflow runs checks against fixtures and the bundled public snapshot without credentials.

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
# In another terminal:
npm run verify:static
```

Browser tests use isolated, explicitly synthetic fixtures and real workers. They cover drawing, imports/errors, snapshot capture, Quick/Deep selection and refinement, cancellation/replacement, distinct matches, chart modes, replay, keyboard controls, reduced motion, responsive overflow and accessibility. Vitest covers algorithms plus real parser/service/async-search integration, stale loads, cancellation and recovery. Two adversarial regressions were mutation-checked: removing baseline retention loses a known Quick winner, and removing within-stock yields prevents timely cancellation.

With the development server running, `npm run verify:ui` creates desktop/mobile screenshots under ignored `output/playwright/` and checks a real search. `npm run verify:static` confirms automatic loading of real history, absence of restricted prices and the private API, five results, and zero upload requests.

### Performance measurement

Measured September 26, 2026 on Windows, AMD Ryzen 9 7900, Node 24.19.0, using the bundled 100 stocks and 114,299 observations. Each pattern/period/mode gets one warm-up and three measured synchronous searches; medians exclude data loading.

| Trading days | Quick windows | Deep windows | Quick median range | Deep median range |
| --- | ---: | ---: | ---: | ---: |
| 20 | 22,596 | 112,380 | 20–27 ms | 103–153 ms |
| 60 | 21,788 | 108,340 | 21–29 ms | 104–155 ms |
| 120 | 20,579 | 102,300 | 20–29 ms | 118–156 ms |

Ranges cover cup, rise, and double-peak patterns. Every ranked top-five Deep distance was no worse than Quick. These are shape-error comparisons, not investment accuracy. Browser scheduling, device speed and initial transfer time add overhead. The JSON asset is 9.38 MB before compression (3.02 MB with gzip). `npm run benchmark` writes CPU/runtime, candidate counts, medians and scores to ignored `output/search-benchmark.json`; `npm run verify:ui` measures actual browser worker searches.

The Chromium worker completed the 60-day cup search in **0.03 seconds Quick / 0.23 seconds Deep** after loading the snapshot, including cooperative scheduling. These are individual local measurements, not a guarantee for every device.

## Static hosting

Run `npm run build`, then upload **only `.output/public/`** to a static host. `npm run preview` serves that directory at http://127.0.0.1:4173. Restart the preview after rebuilding because it caches the asset listing. No server functions or credentials are required. Never upload the project root or `.local-data/`.

For Vercel, connect the repository and deploy `main`. `vercel.json` sets the build command to `npm run build` and the output directory to `.output/public`. A push to the connected production branch triggers a new build; no environment variables are required for this snapshot.

For a subdirectory deployment, set `NUXT_APP_BASE_URL=/your-path/` when building. The worker's asset requests honor this base.

The generated output includes the app, the cleared IEX snapshot and attribution. Original provider downloads and the older restricted dataset stay private.
