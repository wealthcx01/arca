# ARCA-63 — Refresh prices for the whole tradable market, not just held cards

**Status:** Todo · **Area:** Pricing/ETL · **Depends on:** ARCA-4

## Why this matters (for the founder)
Anywhere in ARCA that claims to show "the market" — screeners, trend views, leaderboards — is currently only as fresh as the cards someone happens to hold. That makes market-wide views quietly wrong, which is a trust problem for a product whose whole job is honest market data.

## Context
The price refresh job currently selects its work list via `getHeldCardRefs`, meaning only cards present in at least one holding get their prices updated. This was already flagged internally in ARCA-24 ("Market-wide price coverage & full catalog"), which is in progress and also covers raising the card catalog cap beyond ~1,250 of ~19,000 cards. This ticket is the narrower fix: change what the refresh job prices, independent of the larger catalog-size work, so it can ship on its own without waiting on the full-catalog expansion.

## Scope
- Change the price-refresh job's card selection so it prices all tradable cards currently in the catalog (not filtered down to held-only).
- Make sure the daily provider-usage limits are respected so this doesn't blow through rate limits or costs.
- Confirm market-wide views (screener, trend pages) read from this broader refreshed set, not a held-only subset.

## Out of scope
- Expanding the catalog itself beyond its current size cap (that's the separate full-catalog work, ARCA-24 / bulk-daily-price-feed-plan).
- Real-time/tick-by-tick pricing — this stays on the existing daily refresh cadence.

## Acceptance criteria
- [ ] The refresh job updates prices for cards in the catalog regardless of whether anyone holds them.
- [ ] A market-wide view (e.g. screener) shows fresh prices for a card that no one holds, after a refresh run.
- [ ] Provider daily usage stays within existing limits during a full run.
