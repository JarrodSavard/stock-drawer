# Stock Drawer implementation ledger

Approved plan: user message, Sketch / Match / Replay.

1. Scaffold and matching tests — complete; initial 18 failures observed, then all passed.
2. Validating importer and source provenance — complete; real version-4 download verified, 619,040 valid observations imported privately.
3. Drawing, snapshot, results, replay, responsive UI — complete; snapshot tests observed failing, then passing.
4. Verification — complete: 21 unit tests and 18 desktop/mobile browser tests pass; typecheck and formatting pass; no npm audit findings. Static build succeeds; static preview has no private API or bundled prices, and browser CSV import returns five matches with zero uploads and runtime errors.

Pre-flight: shared model connects importer → worker → results/replay; snapshot coordinates connect drawing → matcher → overlay. All use ascending trading-session order.

Ruling: workspace is empty and has no Git repository, so implement in the explicitly selected directory; worktree helpers cannot apply without a repository.
Ruling: preserve the approved conversational plan as implementation authority; no extra approval gates are needed because the user explicitly requested implementation.
Ruling: Kaggle publisher CC0 does not resolve upstream IEX API third-party redistribution restrictions. Keep downloaded real prices in ignored local storage and serve only in development. Static output supports user-supplied CSV; never substitute synthetic production prices. Cost: public demo requires a cleared dataset or a visitor CSV.

Final review: independent reviewer found shortlist ticker crowding, unreachable replay sessions, and stale source attribution after retry. All three reproduced with failing regression tests and fixed. The shortlist still contains at most 200 candidates, reserving enough distinct tickers when necessary. Replay slider uses session indices. Source attribution is committed only after the relevant dataset successfully loads.

Browser verification caught an early-hydration example click, an out-of-viewport test pointer, a missing document language, and low contrast on selected result dates. Initial example buttons now wait for loading, the test scrolls its canvas into view, HTML declares English, and selected-result text uses a higher-contrast warm tone. Tests now pass without suppressed rules. A font subset import failed resolution and was restored to the package's supported entry; browser and build were rechecked.

Measured: final Node medians 449/419/443 ms for 20/60/120 sessions; Chromium 60-session search 360 ms. Desktop/mobile screenshots reviewed; no overflow or browser runtime errors.

Ruling: no Git repository or development branch exists, so the finishing skill's merge/PR menu does not apply. Leave the implemented files in the user's selected workspace. Cost: no commit history is created in this task.

Static preview initially held stale asset metadata because it was started before the final rebuild. Restarted the owned preview process, reran verification, and confirmed success. Nuxt emits upstream Nitro external-resolution/unused-import warnings during generation; output generation and independent static-browser verification both succeed.

No deferred review findings. Development app remains at http://127.0.0.1:3000; static preview at http://127.0.0.1:4173. Publication remains deliberately unperformed.

## Chart views and portfolio refinement — September 25, 2026

Implemented the approved Line / Candlestick / Heikin-Ashi switch. The importer retains valid original OHLC, marks 23 missing/inconsistent source candles unavailable, and rejects candle conflicts in duplicates. Closing-price matching is unchanged. HA derives from prior contiguous history and resets at gaps; its averaged values are labeled separately from actual closes. Switching views preserves playback position and state. An independent review found no defects.

The user requested a visual refinement and creator attribution. Preserved the established paper/ink/terracotta direction, tightened the hero, improved drawing guidance and contrast, added a creator section with optional engineering details, and linked the portfolio and GitHub URLs embedded in the supplied resume. No contact information was published. User intent authorizes this bounded refinement without another approval gate.

A Nuxt shared-module externalization issue initially blocked static generation when UI shape utilities imported the worker's matcher. Extracted pure shape helpers into app/lib/shape.ts, keeping candle/search dependencies in the worker. Generation now succeeds. Accessibility checks caught transient opacity-related contrast failures and insufficient muted-text contrast on the warmer paper; removed opacity from the entrance animation and darkened muted text.

Final verification: 26 unit tests and 20 desktop/mobile browser tests pass; typecheck, formatting, and static build pass. Expanded creator details pass automated accessibility checks; creator link targets verified; desktop/mobile screenshots inspected; no horizontal overflow at Pixel 7 or 320px. Real browser search measured 0.37 seconds. Static preview confirmed both candle modes, five CSV matches, zero uploads/runtime errors, and no bundled restricted prices. No public deployment performed.

## Deep search and engineering structure — September 25, 2026

Implemented the approved opt-in Deep mode: all valid starting days, 1,000 directly ranked candidates plus retained Quick finalists, with an upper bound of 1,200 unique reranking candidates. Quick stays the default. Added a frozen-snapshot refinement action, typed mode/progress messages, honest stock/window progress, cancellation, and stale-operation suppression on both sides of the worker boundary.

Recorded the user's ongoing SOLID requirement in AGENTS.md. Split policy, sampling, candidate selection, scoring, result construction, execution scheduling, worker lifecycle, transport, and view controls into focused modules. Added docs/architecture.md, docs/testing.md, separate unit/integration commands, and a GitHub Actions workflow. The workflow is provided for a future repository; no remote CI run or publication was performed.

Tests were written before implementation. Independent review found no implementation defects but identified two insufficient regressions. Added an adversarial five-decoy case that loses a Quick DTW winner when baseline retention is removed, and cancellation after nonzero scanning within one stock. Both were confirmed failing under temporary mutations, then restored and passed. There are no deferred review findings.

Precomputed interpolation positions once per query period, preserving scores while cutting CPU search medians to 95–103 ms Quick and 461–564 ms Deep. Across three patterns and all three periods, Deep improved best distance in seven of nine queries (5.9–17.8% reduction) and tied two; ranked top-five quality never regressed. Browser 60-day cup: 118,180 windows/0.18 s Quick versus 588,356 windows/0.91 s Deep. Full reproducible benchmark is ignored output/search-benchmark.json; methodology and results are in README.

Final verification: 37 unit tests, 6 integration tests, and 24 Playwright desktop/touch E2E tests pass. Typecheck, formatting, and static generation pass. Real-data UI screenshots inspected, creator/accessibility/narrow-layout checks pass, and static-browser CSV search confirms both search depths and candle modes with zero uploads/runtime errors and no restricted dataset/API in public output. The existing two upstream Nitro build warnings remain non-blocking. Development and preview servers remain available on ports 3000 and 4173.
