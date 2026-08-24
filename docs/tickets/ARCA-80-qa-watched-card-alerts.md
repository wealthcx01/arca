# ARCA-80 — QA: price alerts on watched cards

**Status:** Todo · **Area:** Watchlist · **Depends on:** ARCA-79 (build-watched-card-alerts)

## Why this matters (for the founder)
Confirms alerts actually fire correctly and that adding them didn't quietly break the watchlist people already depend on.

## Context
Tests the alert feature built in ARCA-79 against the spec from ARCA-78, and regression-tests the existing shipped watchlist (ARCA-19) it sits on top of.

## Scope
- Verify alerts trigger correctly for each trigger type defined in the research spec.
- Verify alert scoping: a user only sees/edits/deletes their own alerts.
- Verify editing and deleting alerts works and doesn't leave orphaned triggers.
- Regression-check that existing watchlist CRUD and live price display are unaffected.
- Log any silent failure modes found (e.g. alert doesn't fire, fires late, fires for wrong user).

## Out of scope
- Performance/load testing of alert evaluation at scale.
- Testing notification channels not built (email/push).

## Acceptance criteria
- [ ] Each trigger type from the research spec is verified to fire correctly.
- [ ] Alert privacy/scoping is confirmed per user.
- [ ] Existing watchlist behavior (ARCA-19) shows no regression.
- [ ] Any bugs found are written up as separate tickets, not fixed silently in this one.
