
# ARCA-072 — QA: test the auction aggregator end to end

**Status:** Todo · **Area:** QA/Auctions · **Depends on:** ARCA-069, ARCA-070, ARCA-071

## Why this matters (for the founder)
Before this ships to any real user, we need to know the whole chain — ingestion, display, notifications — actually works together honestly, with no silent failures or fabricated data.

## Context
Covers the full flow built across the three preceding tickets: ingest → display paired with price history → in-app notify. Consistent with ARCA's standing bar of honest failure over silent failure.

## Scope
- Verify listings ingest correctly and are correctly matched to catalog card+grade entries.
- Verify the Auctions view shows accurate live data and correct paired price history, including correct empty states when data is missing or thin.
- Verify watching a card and receiving an in-app notification works end to end, including at/near the defined lead-time boundary.
- Verify failures at any stage (ingestion failure, API rate limit hit, no price history) are surfaced honestly, not silently dropped or shown as blank/zero.
- Cross-check a sample of live listings and price history against the real source to confirm accuracy.

## Out of scope
- No new features — testing and bug-filing only. New issues found get filed as separate tickets, not fixed inline here.
- No load/performance testing beyond confirming the refresh schedule holds under normal use.

## Acceptance criteria
- [ ] Full flow (ingest → view → notify) tested end to end with real data.
- [ ] All failure modes (missing data, rate limits, no match) confirmed to fail honestly and visibly, not silently.
- [ ] Sample of displayed listings and prices verified accurate against source.
- [ ] Any bugs found are filed as their own tickets, referencing this QA pass.