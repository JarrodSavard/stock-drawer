# Deep Search Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an optional deeper historical search with stronger test coverage and explicit SOLID boundaries.

**Architecture:** Policy-driven candidate enumeration and bounded selection feed unchanged shape scoring. A framework-independent asynchronous runner supports progress and cancellation; a worker application service owns dataset lifecycle and dependencies, with Vue responsible for presentation and response identity.

**Tech Stack:** Existing Nuxt/Vue/TypeScript, Web Worker, Vitest, Playwright. No additional runtime libraries.

**Spec:** User-approved Deep search proposal in this conversation: more starting dates and more reranked candidates, unchanged real observations and comparison resolution, measured quality/performance; SOLID principles and meaningful unit/integration/E2E coverage.

## Global constraints

- Quick remains the default: stride 5, shortlist 200, final complete window included.
- Deep: stride 1, shortlist 1,000, plus retained Quick finalists (up to 1,200 unique candidates). Preserve Quick candidates after ticker diversity selection, guaranteeing no worse best distance for the same query/data.
- Retain 64 samples, band-six DTW, five distinct tickers, chronological replay, flat handling, and gap exclusions.
- Keep all search work in the worker. Yield between bounded chunks so cancellation and replacement requests can take effect. Ignore stale progress, results, and errors.
- Real data stays local. No new external dataset or publication.

## Review focus

- A perfect match between five-day starts must be found in Deep mode.
- A larger direct-distance shortlist must not discard a Quick DTW winner.
- Canceled or superseded searches and loads must never publish stale results/progress/errors.
- Flat, gapped, incomplete, and candle histories must remain valid in both modes.
- Progress must be honest and responsive; mode changes cannot relabel existing results.

## Tasks

- [x] Write failing Vitest search-mode regressions; extract policies, candidate pool, window sampling and scoring; implement Deep with baseline retention. Run full Vitest suite.
- [x] Write failing Vitest worker integration tests for real CSV → matching → result, errors, overlapping loads, cancellation, and superseded searches. Implement injected worker service and yielding execution; wire typed messages and UI stale-response handling.
- [x] Write failing Playwright tests for mode choice, broader search results, progress/cancel, keyboard and replay. Implement accessible search controls, progress and result metadata; run desktop/touch E2E.
- [x] Compare Quick/Deep quality and timing on several real sketches/periods. Document architecture, SOLID mapping, tests, benchmark, and limits. Run typecheck, format, static build and static-browser checks; independent review and corrections.
