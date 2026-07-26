# ARCA-22 — Unit-test & smoke baseline

**Status:** Shipped · **Area:** Infra/QA · **Depends on:** ARCA-13

## Context
A first testing safety net.

## Scope
- ~116 unit tests (`money.test.ts`, `returns.test.ts`, `engine.test.ts`).
- Playwright config + smoke (`scripts/e2e-playwright.pw.ts`) loads ~13 routes.

## Acceptance criteria
- [x] Core money/return/holdings math is unit-tested; a route smoke exists.
