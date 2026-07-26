# ARCA-23 — Full P&L attribution (price / FX / transaction)

**Status:** In progress · **Area:** Performance · **Depends on:** ARCA-15

## Context
The performance calculator currently attributes ALL P&L to price (`fx_pnl=0`, `transaction_pnl=0`) though the schema has dedicated columns.

## Scope
- Decompose daily P&L into price, FX and transaction components in `calculator.ts`.
- Populate the existing `daily_performance` columns; expose the split in `/summary` and the chart.
- Backfill historical `daily_performance` (today-only compute today).

## Acceptance criteria
- [ ] Daily P&L splits into price/FX/transaction and reconciles to total.
- [ ] Historical performance is backfillable, not just same-day.
