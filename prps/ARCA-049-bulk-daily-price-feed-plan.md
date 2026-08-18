# PRP — ARCA-049-bulk-daily-price-feed-plan

## Intent
Give the founder a written, decision-ready plan for pricing the entire ~19k-card catalog every day
using free bulk provider feeds — with volumes, timing, required job changes, and coverage gaps
spelled out — so they can approve moving to the ARCA-24 build with no cost or limit surprises.

## Context
This is a planning ticket: the deliverable is a document, not code. `docs/tickets/ARCA-049-bulk-daily-price-feed-plan.md`
already carries the ticket text (status just flipped to "In progress" in the current diff) and states
the bottom line: TCGCSV and TCGdex are free and rate-limit-tolerant, but ARCA's pricing job is shaped
wrong for them — it fetches per-card, per-held-card, on demand, where a bulk daily feed wants one pull
for everything.

What exists today, confirmed by reading the code:
- `modules/pricing/jobs.ts` — `syncPrices()` (lines 271–374) is the only orchestrator, on a 6-hour
  schedule (line 465). It calls `getHeldCardRefs()` (lines 39–60) once, which joins `holdings` → `cards`
  and returns only cards the app's users actually hold — never the full catalog. Each provider's
  `fetchPrices(cardRefs, config)` is then called with that same held-card list.
- `modules/pricing/providers/types.ts` (lines 45–61) — the `PriceProvider` interface is
  `fetchPrices(cards: CardRef[], config): Promise<PriceResult[]>`, i.e. built around "give me prices
  for these specific cards," not "give me everything you have."
- `modules/pricing/providers/tcgcsv.ts` (lines 131–187) — despite TCGCSV publishing one bulk daily
  file, this provider currently groups the requested cards by set (lines 140–146) and calls
  `fetchGroupPrices(groupId)` per set, matching by name. It does not use the bulk file at all.
- `modules/pricing/providers/tcgdex.ts` — per-card HTTP calls to `/cards/{externalId}`, batched 5 at
  a time with 500ms delays. Also not bulk.
- `modules/pricing/schema.ts` — `cardPrices` (upsert by card_id+source+variant), `priceHistory`
  (append-only), `priceSourceStatus` (per-provider health), and `userApiKeys.daily_usage` (line 61,
  incremented in `jobs.ts` lines 334–342) with **no reset mechanism** — an open gap ARCA-24 already
  flagged and this plan should account for when estimating request budgets against a bulk-feed model.
- `modules/cards/jobs.ts` line 8 — `MAX_PAGES = 5` caps the seeded catalog at ~500–1,250 cards, far
  short of the ~19k universe this plan must size against.
- `modules/etl/pipeline.ts` — a generic `runETL()` framework with exponential-backoff retry (3
  attempts default) already exists and is unused by pricing; worth naming as the natural home for a
  bulk daily job, without committing to using it (that's ARCA-24's call).
- `docs/analytics-implementation.md` is the closest existing precedent in this repo for a standalone,
  narrative planning/implementation doc (as opposed to a per-ticket file) — a reasonable model for
  where and how to write this plan's output.

## Approach
Write one new markdown planning document (e.g. `docs/bulk-price-feed-plan.md`) containing the actual
technical plan — this is the artifact the acceptance criteria call for, distinct from the ticket file
itself. No source code changes. The doc must translate the research already captured in the ticket
into concrete numbers and a job-redesign sketch:
- Full-catalog volume: ~19k cards against TCGCSV's bulk file and ~10k-request/day guidance — show
  the math (groups/products/prices endpoints vs. a single bulk pull) and land on a number well under
  the limit.
- Timing: TCGCSV's ~20:00 UTC daily refresh vs. ARCA's current 6-hour `syncPrices()` cadence — state
  what cadence the new job should run on and why once-daily is correct for this feed.
- Job/provider changes needed: contrast today's `fetchPrices(cardRefs)` per-card shape (types.ts
  lines 45–61) against a bulk-ingest shape (e.g. a new `fetchAll()`/full-snapshot method, or a
  separate bulk job that populates `cardPrices`/`priceHistory` directly) — described, not built.
  Include the `MAX_PAGES=5` catalog cap and the un-reset `daily_usage` counter as prerequisites/risks
  the ARCA-24 build will need to resolve.
- Coverage gaps: which cards/variants TCGCSV/TCGdex may not carry (e.g. promos, non-TCGplayer-listed
  variants), called out as open questions, not assumed away.
- Cost/feasibility summary and an explicit founder decision point (proceed to ARCA-24 build: yes/no).

Files touched:
- New: `docs/bulk-price-feed-plan.md` (the plan itself).
- Edit: `docs/tickets/ARCA-049-bulk-daily-price-feed-plan.md` — mark acceptance criteria checked off
  and set `Status: Shipped` once the plan doc exists, following the same convention visible in
  ARCA-004's ticket file (`[x]` boxes, Status line update).

## Tasks
- [ ] Compute and document full-catalog request/storage volume for one daily TCGCSV bulk sync against
      the ~10,000-request guidance, referencing actual groups/products/prices endpoint shape.
- [ ] Document the timing plan: TCGCSV's ~20:00 UTC daily refresh window vs. ARCA's current 6-hour
      `syncPrices()` cadence, and what cadence the bulk job should run on.
- [ ] Document the concrete job/provider changes needed — contrasting the current per-card
      `fetchPrices(CardRef[])` interface (`modules/pricing/providers/types.ts`) with what a bulk
      ingest path requires — as a description for ARCA-24, not an implementation.
- [ ] Call out `MAX_PAGES=5` (`modules/cards/jobs.ts:8`) and the unreset `userApiKeys.daily_usage`
      counter (`modules/pricing/schema.ts:61`) as named prerequisites/risks for the full build.
- [ ] List coverage/data-quality gaps between TCGCSV/TCGdex bulk data and the full ~19k catalog as
      explicit open questions.
- [ ] Write the cost/feasibility summary ($0 expected provider cost) and a single clear go/no-go
      decision point for proceeding to ARCA-24.
- [ ] Update `docs/tickets/ARCA-049-bulk-daily-price-feed-plan.md` acceptance criteria checkboxes and
      status to reflect the plan doc's existence.

## Validation gates
- [ ] happy path: `docs/bulk-price-feed-plan.md` exists and independently states request volume,
      timing, required job changes, cost, and a founder decision point — readable without needing the
      ticket file open alongside it.
- [ ] edge cases: the plan explicitly addresses the `MAX_PAGES=5` catalog cap and the unreset
      `daily_usage` counter as things the full build must resolve, not silent assumptions.
- [ ] errors: coverage gaps between free bulk feeds and the full catalog (cards/variants TCGCSV or
      TCGdex may not carry) are listed as named open questions, not glossed over.
- [ ] coverage: all four ARCA-49 acceptance criteria boxes in
      `docs/tickets/ARCA-049-bulk-daily-price-feed-plan.md` are checked and traceable to a specific
      section of the new plan doc.

<!-- foundry-ticket: cd320adb21486cb9 -->
