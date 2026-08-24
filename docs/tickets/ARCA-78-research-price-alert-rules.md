# ARCA-78 — Research: define price alert rules for watched cards

**Status:** Todo · **Area:** Watchlist · **Depends on:** —

## Why this matters (for the founder)
Before anyone builds "price alerts," we need to nail down what an alert actually watches and how it tells the trader — otherwise we build the wrong thing on top of a feature people already rely on.

## Context
Watchlists already exist and are shipped (ARCA-19), with live conflated pricing per item. ARCA-55 found that the "News" nav tab currently shows hardcoded price alerts and a calendar instead of news — meaning some notion of "alerts" already leaked into the UI ad hoc, without a real spec behind it. This research replaces that ad hoc version with an intentional one, scoped only to alerts on cards already on a user's watchlist.

## Scope
- Decide what triggers an alert: fixed price threshold, percent move, or both.
- Decide which price the alert watches: ARCA's own price history, live eBay auction price, or both.
- Decide notification surface for v1 (in-app only, per existing ARCA v1 scope — no email/push).
- Decide alert lifecycle: one-shot vs. recurring, how it's cleared/edited/deleted.
- Produce a short written spec other tickets can build against.

## Out of scope
- Any UI or backend implementation.
- Email, push, or SMS notification channels.
- Alerts on cards not already on a watchlist.

## Acceptance criteria
- [ ] A written spec exists covering: trigger types, price source(s) used, notification channel, and alert lifecycle.
- [ ] Spec is reviewed against existing watchlist (ARCA-19) and pricing (ARCA-4) data models for feasibility.
