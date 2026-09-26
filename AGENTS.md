# Engineering expectations

Stock Drawer is Jarrod Savard's portfolio project. Preserve clarity, correctness, and maintainability alongside its playful interface.

- Apply SOLID principles to every change. Give modules one responsibility; extend behavior through small policies and explicit contracts rather than mode checks scattered across layers.
- Prefer composition and pure functions. Use classes only when they own meaningful state or behavior. Avoid speculative abstractions and inheritance hierarchies.
- Keep interfaces narrow. Search logic must not depend on Vue, DOM APIs, HTTP, or worker globals. Inject external I/O and scheduling at application boundaries.
- Alternative policies and implementations must honor the same ordering, original-data, cancellation, and error contracts.
- Write meaningful Vitest unit and integration tests for changed algorithms and boundaries, and Playwright end-to-end tests for changed user flows. Assert observable behavior, not private implementation or incidental copy. Observe regression tests fail before fixing behavior.
- Run unit/integration tests, Playwright desktop/touch tests, typecheck, formatting, and static generation before delivery. Benchmark algorithm changes on the real local dataset; never imply shape resemblance predicts returns.
- Preserve source provenance. Never publish restricted prices, silently fabricate prices, or upload a visitor's CSV.

See docs/architecture.md for module boundaries and docs/testing.md for verification guidance.
