
# ARCA-068 — Research: which auction houses we can realistically pull live listings from

**Status:** Shipped · **Area:** Research/Auctions · **Depends on:** —

## Why this matters (for the founder)
Before building anything, we need to know which auction sources will actually give us live data legally and reliably, so we build the aggregator against real access, not assumptions.

## Context
Graded Pokémon card auctions are spread across several houses with very different levels of public data access:
- eBay has a public Browse API for active listings and supports real-time item notifications (e.g. ItemClosed events), and PWCC's inventory is largely sold through eBay itself (https://developer.ebay.com/develop/api/buy/browse_api, https://developer.ebay.com/support/kb-article?KBid=1312).
- eBay's sold/completed-listings data (Marketplace Insights API) is restricted to approved partners like Terapeak and is not generally available, and eBay's developer terms explicitly forbid using listing data for market research (https://community.ebay.com/t5/Traditional-APIs-Search/Active-listing-and-sold-item-search-data/td-p/34152432).
- Goldin and Heritage Auctions do not appear to offer public developer APIs; any access would likely require scraping their site listings or a direct partnership conversation.
- Fanatics Collect is a newer marketplace also running graded card auctions, unconfirmed API access.

This research determines what "Scope" is realistic for the build tickets that follow.

## Scope
- For each of: eBay (incl. PWCC listings), Goldin, Heritage, Fanatics Collect — determine: is there a public API or feed; what data fields are available (item, grade, end time, current bid); rate limits; terms-of-service restrictions on displaying/storing the data; realistic lead time to get access.
- Confirm what eBay's Browse API and notification system concretely return for auction-style (not fixed-price) listings ending soon.
- Recommend which source(s) to build against for v1, and flag any that require a business/partnership conversation rather than a pure API integration.
- Write up findings as a short decision doc for the build tickets to reference.

## Out of scope
- No code, no live integration — this is a findings/decision document only.
- No sports card or non-WOTC-era sources.

## Acceptance criteria
- [x] Written findings covering eBay, Goldin, Heritage, and Fanatics Collect access options, with
      sources/links. See `docs/auction-source-research.md` §1–2 (eBay), §7 (Goldin), §8 (Heritage),
      §9 (Fanatics Collect).
- [x] Clear recommendation on which source(s) v1 should build against. See
      `docs/auction-source-research.md` §11 (v1 recommendation) — eBay Browse API only.
- [x] Any legal/terms-of-service risk flagged explicitly (e.g. eBay's restriction on market-research
      use of listing data). See `docs/auction-source-research.md` §10 (Legal / ToS risk).
- [x] Findings saved somewhere the build tickets can reference before work starts. See
      `docs/auction-source-research.md`, referenced from ARCA-069/ARCA-071's scope.