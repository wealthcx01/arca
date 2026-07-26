# ARCA-14 — Portfolio analytics

**Status:** Shipped · **Area:** Analytics · **Depends on:** ARCA-13

## Context
Portfolio-level risk and concentration.

## Scope
- `portfolio-analytics.ts`: weighted vol/Sharpe, HHI concentration, top-5, currency exposure, diversification.
- API `/analytics/portfolio/:id/risk`.

## Acceptance criteria
- [x] A portfolio exposes weighted risk, concentration and currency-exposure metrics.
