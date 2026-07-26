# ARCA-15 — Daily P&L & performance pipeline

**Status:** Shipped · **Area:** Performance · **Depends on:** ARCA-13

## Context
Time-weighted portfolio performance across standard periods.

## Scope
- `calculator.ts` daily P&L (BOD from prior EOD, EOD from holdings x price x FX; return as `_1pr`).
- `/summary` MTD/QTD/YTD/1Y/SI compounded; `/chart` period series; `daily_performance` table.

## Acceptance criteria
- [x] Portfolio performance renders for standard periods.
- [x] Return math unit-tested (`returns.test.ts`).
