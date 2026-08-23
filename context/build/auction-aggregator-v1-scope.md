# Auction aggregator v1 — beachhead and moat decision

## Decision
ARCA's auction aggregator starts with **PSA/BGS-graded WOTC-era Pokémon cards only** — the same segment ARCA already has price history for.

## Why this segment
This is the beachhead: it's the group ARCA already serves with pricing data, so it's a narrow, ownable start rather than "all graded cards" or "all TCGs."

## Why this is defensible (not just a feature)
The differentiator is not "we show more auction listings than anyone else" (any competitor can scrape/API the same auction houses). It's pairing a **live auction** next to **ARCA's own accumulated price history** for that exact card — something a pure auction-listing site (or a generic aggregator) doesn't have, because they don't have the pricing terminal underneath it. This is a cornered-resource play: the moat is the existing pricing data asset, not the listings feed itself.

## Sequencing
1. Research ticket — confirm which auction houses actually offer usable live data (eBay has a public Browse API + real-time item notifications; PWCC sells through eBay; Goldin/Heritage have no known public API; sold-data/market-research use of eBay listings is restricted by their terms).
2. Build: data feed ingestion for the confirmed source(s).
3. Build: auctions view paired with existing price history.
4. Build: in-app notifications (v1 is in-app only — no email/push).
5. QA ticket to test the full flow end to end.

## Explicitly out of scope for v1
- Sports cards, non-WOTC-era Pokémon cards, non-graded cards.
- Email or push notifications (in-app only for v1).
- Auction houses without confirmed usable access (pending research ticket).

