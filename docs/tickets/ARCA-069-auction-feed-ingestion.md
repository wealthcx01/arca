
# ARCA-069 — Build: ingest live auction listings for graded WOTC-era cards

**Status:** Todo · **Area:** Auctions/ETL · **Depends on:** ARCA-068

## Why this matters (for the founder)
Before we can show anyone a live auction, ARCA needs a working pipe that pulls in current auction listings and keeps them fresh — this is the plumbing everything else sits on.

## Context
Follows directly from the research ticket's recommendation on which source(s) are realistic for v1 (expected: eBay's Browse API, covering eBay-hosted and PWCC listings). Scope here is intentionally limited to PSA/BGS-graded WOTC-era Pokémon singles, matching ARCA's existing catalog and pricing coverage (see ARCA-24, ARCA-4).

## Scope
- Build an ingestion job that pulls active/auction-style listings from the source(s) confirmed by the research ticket.
- Filter to PSA/BGS-graded WOTC-era Pokémon cards only.
- Match each listing to ARCA's existing catalog entries (card + grade), so it can be paired with price history later.
- Store listing data needed for display: current bid, end time, grade, seller/source, listing URL.
- Refresh on a schedule that respects the source's rate limits.

## Out of scope
- No UI — this is data ingestion only.
- No notifications yet.
- No sources beyond what the research ticket confirmed as viable for v1.
- No sports cards, non-WOTC-era cards, or ungraded cards.

## Acceptance criteria
- [ ] Listings for in-scope cards are ingested and stored on a regular refresh schedule.
- [ ] Each stored listing is correctly matched to an existing ARCA catalog entry (card + grade).
- [ ] Ingestion respects the source API's rate limits and terms of service as documented in the research ticket.
- [ ] Failed or partial ingestion runs fail loudly (logged/visible), not silently.