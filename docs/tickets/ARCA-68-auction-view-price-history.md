
# ARCA-68 — Build: auctions view showing live listings next to card price history

**Status:** Todo · **Area:** Auctions/UI · **Depends on:** Build: ingest live auction listings for graded WOTC-era cards

## Why this matters (for the founder)
This is the actual customer-facing payoff: one screen where a trader can see every live auction for graded WOTC-era cards, each one shown next to what that exact card has actually sold for on ARCA — something no auction site or generic aggregator offers, because they don't have ARCA's price history underneath it.

## Context
Builds on the ingested listings from the previous ticket, paired with ARCA's existing per-card price history (ARCA-48, ARCA-63/64 work on price freshness and "last updated" labelling — this view should follow the same honesty standard: no fabricated numbers, and clear "last updated" timestamps).

## Scope
- New Auctions view listing all live/ending-soon auctions for PSA/BGS-graded WOTC-era cards.
- Each listing shows: card, grade, current bid, time remaining, and ARCA's own price history/current market price for that exact card+grade, side by side.
- Honest empty state if there are no live auctions for a card, or if price history is too thin to show (consistent with ARCA-48's approach — no invented numbers).
- Sort/filter by set, card, or time remaining.

## Out of scope
- No notifications (separate ticket).
- No bidding or transaction functionality — display only.
- No sources beyond what was ingested in the previous ticket.

## Acceptance criteria
- [ ] Auctions view shows all currently ingested live listings for in-scope cards.
- [ ] Each listing displays ARCA's price history/current price for the same card+grade alongside the live auction data.
- [ ] Empty/thin-data states are honest (no placeholder or fabricated numbers) and explain what's missing.
- [ ] View can be sorted/filtered by set, card, or time remaining.
