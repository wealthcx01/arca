# PRP — ARCA-068-auction-source-research

## Intent
The founder gets a short, sourced decision document that says exactly which auction house(s) ARCA can build a live-listings feed against for v1 — and which ones require a scraping/partnership conversation instead — so ARCA-069's ingestion build starts from confirmed access, not assumptions.

## Context
- Ticket `docs/tickets/ARCA-068-auction-source-research.md` is currently just a status flip (`Todo` → `In progress`, per `git diff`) — no findings have been written yet. This is a from-scratch research pass.
- The ticket's own Context section already asserts several claims with sources that must be verified, not re-derived: eBay Browse API for active listings + `ItemClosed`-style notifications, PWCC inventory largely sold through eBay, eBay's Marketplace Insights (sold/completed data) restricted to approved partners, eBay dev terms forbidding market-research use, Goldin/Heritage having no known public API, Fanatics Collect API access unconfirmed.
- Downstream tickets assume a specific answer before they can start:
  - `docs/tickets/ARCA-069-auction-feed-ingestion.md` says "expected: eBay's Browse API, covering eBay-hosted and PWCC listings" and needs the research ticket to confirm or correct that, plus concrete fields (current bid, end time, grade, seller/source, listing URL) and rate limits to build the ingestion schedule against.
  - `docs/tickets/ARCA-071-auction-in-app-notifications.md` needs to know whether an event-driven notification (e.g. `ItemClosed`) or polling-based "ending soon" check is realistic.
  - `docs/tickets/ARCA-072-auction-aggregator-qa.md` will test the whole chain against whatever source(s) this ticket picks — an honest-failure bar it inherits from `docs/tickets/ARCA-048-real-history-honest-gaps.md`'s standing project principle (real data, or say so — no fabrication).
- `docs/bulk-price-feed-plan.md` is the direct precedent for this deliverable's shape: a standalone decision doc (not code) produced from a research ticket (ARCA-49), with numbered findings sections, exact numbers/links, an explicit "open questions not assumed away" section, and a closing founder go/no-go recommendation. This PRP's output doc should follow that same structure and rigor.
- ARCA's existing external-provider patterns set the bar for what "realistic access" and "rate limits" need to look like in findings: `modules/pricing/providers/` (registry pattern, per-provider `fetchPrices`, BYOK key handling in `modules/pricing/providers/types.ts`), `modules/etl/pipeline.ts` (retry/backoff budget), and `modules/etl/sources/psa-pop.ts` (explicit comment: "PSA does not have an official API... placeholder for manual entry or future scraping" — the same honest-gap pattern this research should apply to Goldin/Heritage if they turn out to have no API).
- Card/grade matching this feed will need to key off already exists in `modules/cards/schema.ts` and grading fields used by `modules/psa/` (PSA cert verification) — relevant to confirming what listing fields (grade, cert number) a source actually returns, since ARCA-069 needs to match listings to catalog entries.

## Approach
No code changes. Produce one new markdown findings doc, `docs/auction-source-research.md`, following the `docs/bulk-price-feed-plan.md` precedent (numbered sections, sourced claims, explicit open questions, closing recommendation). Update `docs/tickets/ARCA-068-auction-source-research.md`'s acceptance-criteria checkboxes and status once the doc is written and reviewed. Research is done via live lookups (API docs, developer portals, ToS pages) for eBay Browse API, eBay Marketplace Insights/notifications, Goldin, Heritage Auctions, and Fanatics Collect — verifying or correcting each claim already asserted in the ticket, since none of it has been independently confirmed yet.

## Tasks
- [ ] Verify eBay Browse API: active/auction-style listing support, fields returned (item, grade if present in title/aspects, end time, current bid), rate limits, and whether it covers PWCC-hosted listings.
- [ ] Verify eBay's real-time notification/webhook options (e.g. Item/Notification API) for detecting listings ending soon, and confirm what `ItemClosed`-equivalent events actually deliver.
- [ ] Confirm eBay Marketplace Insights (sold/completed data) access restriction to approved partners, and pull the exact ToS language forbidding market-research use of listing data.
- [ ] Determine Goldin's public API availability (none expected) and what a scrape-or-partnership path would concretely require.
- [ ] Determine Heritage Auctions' public API availability (none expected) and what a scrape-or-partnership path would concretely require.
- [ ] Determine Fanatics Collect's API access status (confirm or refute "unconfirmed"), including any developer docs or partner-only program.
- [ ] Write `docs/auction-source-research.md` with per-source findings, links, rate limits, ToS risk flags, and a v1 recommendation naming which source(s) ARCA-069 should build against.
- [ ] Flag any source requiring a business/partnership conversation (vs. pure API integration) explicitly in the doc, separate from the technical findings.
- [ ] Update `docs/tickets/ARCA-068-auction-source-research.md` acceptance criteria checkboxes and status to reflect the completed findings doc.

## Validation gates
- [ ] happy path: `docs/auction-source-research.md` exists and states, for each of eBay/Goldin/Heritage/Fanatics Collect, whether a public API exists, what fields it returns, rate limits, and a source link for every claim.
- [ ] edge cases: the doc explicitly addresses PWCC (as an eBay-hosted inventory question, not a separate house) and distinguishes active/auction-style listings from eBay's restricted sold/completed data, since ARCA-069 needs live (not historical) data.
- [ ] errors: any source with no public API (expected: Goldin, Heritage, possibly Fanatics Collect) is documented as requiring scraping or a partnership conversation, not silently omitted or assumed unavailable without a check.
- [ ] coverage: the doc ends with one unambiguous v1 recommendation naming the source(s) to build against, and every legal/ToS restriction found (e.g. eBay's market-research-use prohibition) is called out in its own flagged section rather than buried in prose.

<!-- foundry-ticket: c7f847b107459545 -->
