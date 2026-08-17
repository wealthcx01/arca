# PRP — bulk-daily-price-feed-plan

## Intent
The founder gets a written, decision-ready plan showing exactly how ARCA can price its full
~19,000-card catalog every day using TCGCSV's free bulk feed — with the request volume proven
against TCGCSV's own limits, the pricing-job changes required, and the coverage gaps named — so
they can say yes/no to committing to the ARCA-24 full build with no cost or rate-limit surprises.

## Context
- `docs/tickets/bulk-daily-price-feed-plan.md` is the ticket itself, already flipped to
  "In progress" — this is a planning ticket, not a code ticket. The deliverable is the plan
  document, appended into this same file.
- `modules/pricing/providers/tcgcsv.ts` is today's TCGCSV integration: it fetches the group
  (=set) list once (`getGroups`, 6h cache), then per set does `findGroupId` (fuzzy
  abbreviation/name match) and `fetchGroupPrices` (2 requests: `/{game}/{groupId}/products` +
  `/{game}/{groupId}/prices`). Card-to-product matching is name-only (`matchProduct`, exact then
  substring) — there is no stored TCGCSV `productId` on our `cards` row, so this is a real
  accuracy gap at full-catalog scale, not just a held-card one.
- `modules/pricing/jobs.ts` — `syncPrices()` is driven by `getHeldCardRefs()` (join
  `holdings`→`cards`, held cards only), runs every 6h via `scheduler.register`. This is the
  function that would need to change shape to cover the full catalog instead of only holdings.
- `modules/cards/jobs.ts` — `syncCards()` caps at `MAX_PAGES=5` (500 cards) from
  `api.pokemontcg.io`, one page = one request. This is ARCA-24's cap to raise, referenced here
  only to size the target universe (~19k cards / ~165 Pokémon TCG set groups on TCGPlayer).
- `src/lib/scheduler.ts` is a plain `setInterval` scheduler — it fires immediately on start and
  then every `intervalMs`, with no wall-clock/time-of-day alignment. TCGCSV's bulk file refreshes
  around 20:00 UTC daily; the current scheduler has no way to target "run shortly after refresh,"
  which matters for a once-a-day bulk-pull design.
- `modules/pricing/providers/tcgdex.ts` — per-card fetch (`/cards/{externalId}`), batched 5 at a
  time with a 500ms delay between batches. At ~19k cards this is ~3,800 sequential batches — this
  is the shape reference for why TCGdex is secondary/cross-check only, not primary, at full scale.
- `modules/pricing/schema.ts` — `priceSourceStatus` (per-provider health/last-sync) and
  `userApiKeys.daily_usage` (BYOK provider usage counter) are the existing tables any bulk-pull
  design should report health/volume through, without new tables (out of scope to build here).
- Venture knowledge confirms: TCGCSV ~10,000 requests/24h guidance for a full sync; TCGdex has no
  hard limit but asks for caching; pokemon-tcg.io is per-card-shaped and rate-capped, wrong fit for
  daily full-market pricing; PriceCharting free tier has zero API access.

## Approach
No code changes — this ticket is scoped to investigation and a written plan. Smallest correct
output: append a findings/plan section to `docs/tickets/bulk-daily-price-feed-plan.md` covering (a)
the proven request-volume math for a full TCGCSV pull, (b) the shape change `syncPrices()` and
`tcgcsv.ts` need (bulk-pull-once-daily over all groups, not per-held-card), (c) the card-matching
gap given no stored `productId`, (d) the scheduler timing gap versus TCGCSV's ~20:00 UTC refresh,
and (e) explicit open questions on coverage gaps, closing with a $0-cost summary and an explicit
founder decision point. Files touched: `docs/tickets/bulk-daily-price-feed-plan.md` only.

## Tasks
- [ ] Confirm the real Pokémon TCG group count on TCGCSV (`GET /tcgplayer/3/groups`) and compute
      exact daily request volume for a full pull (1 groups call + 2 calls/group) against the
      ~10,000-request guidance.
- [ ] Document the shape change needed in `modules/pricing/jobs.ts`/`tcgcsv.ts`: bulk pull over
      all groups once daily, persisted for the whole catalog, versus today's held-cards-only,
      6-hourly loop.
- [ ] Document the card-matching gap: `matchProduct()` is name-only with no stored `productId`,
      and what that costs in accuracy at ~19k cards versus ~1,250.
- [ ] Document the scheduling gap: `scheduler.ts` is interval-only with no wall-clock alignment to
      TCGCSV's ~20:00 UTC daily refresh, and what (if anything) that requires.
- [ ] List coverage/data-quality open questions explicitly (promos, non-English exclusives, variant
      subtypes TCGCSV may not carry) rather than assuming full coverage.
- [ ] Write the $0-cost/feasibility summary and an explicit founder yes/no decision point into
      `docs/tickets/bulk-daily-price-feed-plan.md`.

## Validation gates
- [ ] happy path: the plan states the exact number of daily requests for a full-catalog TCGCSV
      pull (1 + 2×group-count), computed from the actual group count returned by
      `GET https://tcgcsv.com/tcgplayer/3/groups`, and shows it falls well under TCGCSV's
      ~10,000-request guidance.
- [ ] edge cases: the plan names, as explicit open questions rather than silent assumptions, the
      catalog segments TCGCSV may not cleanly cover (promos, non-English-only cards, variant
      subtypes not present in `normalizeVariant`'s mapping).
- [ ] errors: the plan states what happens when a group's `products` or `prices` request fails
      mid-pull (skip-and-retry-next-run vs. partial persist) so a bad day doesn't silently leave
      stale `conflated_rank = 1` prices in `card_prices`.
- [ ] coverage: the plan states how card-to-product matching would work for the full ~19k catalog
      given `cards` has no stored TCGCSV `productId` today — i.e., whether the existing
      name-only `matchProduct()` is good enough at this scale or a `productId` column is a
      prerequisite, named as a decision point, not deferred silently.

<!-- foundry-ticket: 13fa422544f03c6f -->

<!-- foundry-ticket: 13fa422544f03c6f -->
