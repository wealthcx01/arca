# ARCA-38 — Analytics performance & depth

**Status:** Planned · **Area:** Analytics · **Depends on:** ARCA-9

## Context
The analytics pipeline computes every indicator for every card with no batching (perf risk flagged in the continuation doc); portfolio risk is simple-weighted, 'not covariance-aware'.

## Scope
- Batch indicator/analytics computation for large card sets.
- Add covariance-aware portfolio risk (correlation matrix).

## Acceptance criteria
- [ ] Analytics scale to the full card universe within budget.
- [ ] Portfolio risk accounts for cross-asset correlation.
