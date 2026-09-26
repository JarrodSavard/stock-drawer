# Testing strategy

Tests target observable behavior and cross-module contracts. Synthetic data is confined to tests. Real local data is used only by optional benchmark and verification scripts and is never required in CI.

## Layers

| Layer | Tool | What it proves |
| --- | --- | --- |
| Unit | Vitest | Normalization, interpolation, direction, flat handling, gaps, immutable snapshots, import validation, real/averaged candles, deeper candidate coverage, baseline quality preservation, and cooperative execution |
| Integration | Vitest | Actual CSV parsing → worker application service → real asynchronous matcher → typed progress/results; recovery, cancellation, superseded searches, overlapping loads and late errors |
| End to end | Playwright | Actual built worker running through the Nuxt UI on desktop Chrome and touch-emulated Pixel 7: drawing, snapshots, modes, refinement, cancellation/replacement, replay, CSV loading/failure, keyboard controls, reduced motion and axe accessibility checks |
| Artifact verification | Playwright scripts | Generated static site excludes restricted data/API; real CSV import stays in-browser; Quick/Deep search and candle replay work |
| Performance/quality | Node benchmark and browser worker | Compare candidate coverage, distance scores and latency with loaded real history; data loading is measured separately from search |

## Commands

```sh
npm test                 # all Vitest unit and integration tests
npm run test:unit
npm run test:integration
npm run test:browser     # desktop and touch browser projects
npm run typecheck
npm run format:check
npm run build
```

Install Chromium once with `npx playwright install chromium`. E2E starts the dev server automatically when needed. Tests intercept only the dataset HTTP boundary; actual worker creation, CSV processing, matching, progress and UI rendering run normally. The cancellation test uses a larger deterministic fixture to observe real in-flight work and cancel it, then verifies a replacement query completes. It does not use a fake worker or fixed sleeps.

Integration tests inject network replies and scheduler gates to reproduce races deterministically. They retain the real parser, search algorithm and service. Expectations include hand-calculated window counts and known matching dates, not snapshots of internal implementation. The default Vitest command includes integration tests, so they cannot be skipped accidentally by running the standard suite.

The baseline-retention regression uses five noisy periodic decoys that crowd out a better timing-tolerant winner under naive dense shortlisting. Removing retention was confirmed to fail that test. A second mutation removed within-stock yields; the mid-search cancellation test failed because the entire stock was scanned before cancellation. Both safeguards were restored and the full suite rerun. This is targeted mutation verification, not a claim of exhaustive mutation coverage.

`.github/workflows/ci.yml` runs checks for pushes and pull requests without private data. Playwright records traces on failure and CI retains the reports. No live market API, secret, or paid service is needed.

## Optional real-data verification

With the licensed-for-your-use CSV in `.local-data/`, run `npm run benchmark`. The ignored `output/search-benchmark.json` records CPU/runtime, method, candidate counts, timings, scores, and symbols for three example patterns and all periods. Each query/mode gets a warm-up followed by three timed runs. A regression in Deep's ranked-distance guarantee fails the command. Timings are observations, not flaky CI assertions.

Run `npm run verify:ui` against the dev app for screenshots, creator links, accessibility, real-data matching, runtime errors and narrow-screen overflow. After `npm run build`, start/restart `npm run preview` and run `npm run verify:static` for generated-output verification. Restarting matters because the preview caches asset names.

Do not replace real-data checks with fabricated production prices. Do not interpret distance reductions as predictive accuracy, and do not turn incidental text, private fields, or framework behavior into brittle tests.
