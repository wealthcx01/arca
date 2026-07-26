# ARCA-13 — Portfolio, transactions & holdings engine

**Status:** Shipped · **Area:** Portfolio · **Depends on:** ARCA-5

## Context
Track holdings derived from a transaction ledger, with cost basis.

## Scope
- Portfolios CRUD (soft-delete, ownership-scoped); BUY/SELL transactions (fees/tax/graded/cert).
- Weighted-average-cost holdings engine (`engine.ts`, `rebuildHoldings`) + enriched P&L; CSV `ImportPage` wizard.
- Well unit-tested (`engine.test.ts`).

## Acceptance criteria
- [x] Holdings reconstruct from transactions with weighted-avg cost.
- [x] CSV import maps columns and previews before commit.
