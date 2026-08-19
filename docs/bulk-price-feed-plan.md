# Bulk Daily Price Feed Plan — Full ~19k Card Catalog

**Ticket:** ARCA-49 · **Status:** Plan complete, awaiting founder go/no-go · **Depends on:** ARCA-24, ARCA-4

This is a planning document only — no pricing code changes ship with it. It answers, with real
numbers, whether ARCA can price its whole ~19,000-card catalog every day for free, and what has to
change in `modules/pricing/` to do it. The actual build is ARCA-24.

## 1. The shape mismatch, precisely

`syncPrices()` (`modules/pricing/jobs.ts:271-374`) calls `getHeldCardRefs()`
(`modules/pricing/jobs.ts:39-60`) once per run, then hands that same held-card list to every
provider's `fetchPrices(cards: CardRef[], config)` (`modules/pricing/providers/types.ts:56`). Two
providers matter for a bulk feed:

- `modules/pricing/providers/tcgcsv.ts:139-183` — groups the *requested* cards by set, calls
  `fetchGroupPrices(groupId)` (lines 93-114) which fetches `/products` and `/prices` for that one
  TCGCSV group, then matches each held card to a product by name (`matchProduct`, lines 117-129) and
  discards every product in the response that isn't a match.
- `modules/pricing/providers/tcgdex.ts` — per-card HTTP calls to `/cards/{externalId}`, batched 5 at
  a time with 500ms delays. Genuinely per-card, not bulk.

The useful finding: **TCGCSV's provider is already fetching bulk, per-group data** — `/products` and
`/prices` return every product/price in that group, not just the held ones. The current code just
throws away everything that doesn't name-match a held card, and it only ever visits groups that
contain a held card. So the gap isn't "make TCGCSV bulk" — it's (a) visit *every* group, not just
held-card groups, and (b) persist every product in the response, not just matches.

## 2. Request volume for one full daily sync

TCGCSV (`https://tcgcsv.com/tcgplayer`, game id 3 = Pokemon) exposes:

- `GET /tcgplayer/3/groups` — 1 request, returns every group (set) TCGPlayer lists for Pokemon.
- Per group: `GET /tcgplayer/3/{groupId}/products` + `GET /tcgplayer/3/{groupId}/prices` — 2
  requests per group (this is exactly what `fetchGroupPrices` already does).

Pokemon TCG has on the order of ~180 TCGPlayer groups (mainline sets + promos + supplemental
products) covering the ~19k-card universe. That puts one full daily crawl at:

```
1 (groups list) + 180 groups × 2 requests/group  ≈  361 requests/day
```

Even with the ETL framework's default retry budget (`modules/etl/pipeline.ts:33,37` — `maxRetries = 3`
with a `for (attempt = 0; attempt <= maxRetries; attempt++)` loop, i.e. **4 total attempts**, confirmed
by its own log line `Attempt ${attempt + 1}/${maxRetries + 1}`) applied to every request in the worst
case, that's ≈361 × 4 ≈ 1,444 requests — **14.4% of TCGCSV's ~10,000-request/day guidance**, comfortably
within budget but not "well under 10%." There is no scenario at today's catalog size where a full daily
crawl threatens the limit; the ~10k budget leaves ~7x headroom over the worst-case retry figure for
growth (new sets, retries, TCGdex cross-check calls).

TCGdex cross-check: TCGdex publishes no hard rate limit, only a "cache, don't re-poll" ask
(https://tcgdex.dev/faq). Since it's per-card today, a full-catalog cross-check at ~19k cards, even
batched 5-at-a-time with 500ms delays, is ~19,000/5 × 0.5s ≈ 31.7 minutes of wall-clock — acceptable
for a once-daily secondary pass, but worth a bulk equivalent (TCGdex publishes bulk JSON data dumps
separately from its live API) as a follow-up optimization rather than a blocker.

**Storage volume:** ~19k products × ~1.5-2 price rows/product (normal/holo/reverse/1st-edition
variants) ≈ 30-35k price rows per sync. `card_prices` (`modules/pricing/schema.ts:4-20`) is an
upsert, so its size stays bounded near that count. `price_history` (lines 22-35) is append-only —
one full daily sync adds ~30-35k rows/day, ≈11-13M rows/year. Not a cost problem (SQLite handles this
fine) but worth flagging as a future pruning/archival concern for ARCA-24.

## 3. Timing

TCGCSV refreshes its bulk data once per day, around 20:00 UTC (per ARCA-49 ticket research). ARCA's
current `syncPrices()` runs every 6 hours (`modules/pricing/jobs.ts:465`), unaligned to that refresh
— most of those runs re-fetch a TCGCSV snapshot that hasn't changed since the previous run, wasting
requests against held-card groups for no new data.

**Recommendation:** a new, separate job (e.g. `pricing:sync-bulk-catalog`) on a 24-hour interval,
scheduled to start shortly after TCGCSV's ~20:00 UTC refresh (e.g. 21:00 UTC) to avoid racing a
still-updating file. The existing 6-hourly `syncPrices()` either narrows to providers that are
genuinely real-time (TCGdex spot checks, BYOK graded-price providers) or is retired in favor of the
once-daily bulk job plus an on-demand path for newly-added holdings — that tradeoff is ARCA-24's call,
not decided here.

## 4. Job/provider changes required (described, not built)

- **Provider interface** (`modules/pricing/providers/types.ts:46-61`): `fetchPrices(cards, config)`
  assumes a caller-supplied card list. A bulk path needs either a new method (e.g.
  `fetchCatalog(config): Promise<PriceResult[]>` with no `cards` argument) or a distinct job that
  bypasses the `PriceProvider` interface entirely and writes `cardPrices`/`priceHistory` directly from
  the full TCGCSV crawl.
- **Group coverage**: `tcgcsv.ts` must iterate *all* groups from `getGroups()` (already fetches the
  full list, `tcgcsv.ts:61-76`) instead of only the groups implied by held cards.
- **Matching, not filtering**: today's `matchProduct()` (`tcgcsv.ts:117-129`) is a filter — keep only
  what matches a held card. A bulk path needs it to be a *join key* — every product in the response
  should map to a `card_id` (or be recorded as unmatched) rather than being discarded when there's no
  held-card match to test against.
- **Stable identity risk**: `matchProduct` matches by exact/substring name (`tcgcsv.ts:121-126`).
  That's workable at held-card scale (dozens of cards) but is expected to produce wrong or missing
  matches at ~19k-card scale (duplicate names across reprints/promos, punctuation differences). ARCA-24
  should plan to persist TCGCSV's `productId` against `cards.id` during/after the catalog seed so
  later syncs join on a stable numeric key instead of re-matching by name every run.
- **Catalog cap is a hard prerequisite**: `modules/cards/jobs.ts:8` — `MAX_PAGES = 5` caps the seeded
  catalog at ~500-1,250 cards. A bulk price sync can fetch and match against the full TCGCSV catalog,
  but there is nothing to attach most of those prices *to* until the card catalog itself is seeded past
  this cap. This is explicitly ARCA-24's build work, not ARCA-49's, but it blocks the bulk job from
  being useful until resolved.
- **`daily_usage` non-reset** (`modules/pricing/schema.ts:61`, incremented at
  `modules/pricing/jobs.ts:334-342`): this only tracks BYOK provider usage today, not TCGCSV/TCGdex
  (both keyless, free). It doesn't block the bulk-feed plan directly, but if ARCA-24 adds any
  request-budget tracking for the new bulk job (e.g. to self-monitor against TCGCSV's ~10k guidance),
  it should not copy this pattern — `daily_usage` accumulates forever with no daily reset job, which
  would make any usage-based guardrail built the same way silently wrong within days.

## 5. Coverage / data-quality gaps (open questions, not assumed away)

- **TCGPlayer-only universe**: TCGCSV mirrors what TCGPlayer lists. Cards/variants never listed on
  TCGPlayer — some Japanese-only cards, certain promos, regional exclusives — will have no TCGCSV
  price regardless of crawl completeness. Open question: how large is this gap against the ~19k
  target, and does TCGdex fill it?
- **Name-matching fragility at scale**: even with full-group iteration, matching by
  `cleanName`/substring (`tcgcsv.ts:117-129`) is expected to misfire on reprints, promo variants, and
  cards sharing a name across sets, without a stable `productId ↔ card_id` mapping (see §4). Open
  question: what mismatch rate is acceptable before this needs the stable-key fix as a hard
  prerequisite rather than a nice-to-have?
- **Subtype/variant coverage**: TCGCSV's `subTypeName` values (`tcgcsv.ts:30`, normalized in
  `normalizeVariant`, lines 48-54) cover normal/holo/reverse-holo/1st-edition. Unclear whether staff
  promos, alt-art secret rares, or other niche print variants get distinct, correctly-labeled rows —
  needs a data spot-check, not assumed.
- **TCGdex catalog completeness unverified**: proposed as secondary/cross-check, but its own coverage
  of the full ~19k-card universe (vs. TCGCSV's or Pokemon TCG API's) hasn't been measured — open
  question for whoever builds the cross-check pass.
- **Historical archive format unexamined**: TCGCSV's daily price-history archive back to Feb 2024
  (https://tcgcsv.com/faq) is directly relevant to ARCA-27's real-history backfill, but its file
  format/schema hasn't been inspected here — explicitly out of scope for ARCA-49, flagged for ARCA-27.

## 6. Cost / feasibility summary

- **Provider cost: $0.** TCGCSV and TCGdex are both free, keyless, and comfortably within their
  respective guidance (§2). No PriceCharting or other paid tier is needed for this plan.
- **Request budget:** ≈361 requests/day nominal, ≈1,444/day worst-case with full retries (4 attempts
  each) — against a ~10,000/day guidance. Large headroom (~7x).
- **Storage cost:** ~30-35k new `price_history` rows/day (~11-13M/year) — negligible for SQLite, but
  worth an archival/pruning line item in ARCA-24's plan.
- **Real risk isn't cost or rate limits** — it's data quality (name-matching at scale, TCGPlayer
  coverage gaps) and the fact that the catalog seed cap (`MAX_PAGES=5`) must be lifted before a bulk
  price sync has enough cards to attach prices to. Both are ARCA-24 build items, not blockers to
  approving this plan.

## 7. Founder decision point

**Proceed to the ARCA-24 build: yes/no?**

Recommendation: **yes**, on the numbers above — the bulk approach is free, well within provider
limits, and the job-shape changes are well-scoped. ARCA-24 should sequence its work as: (1) lift
`MAX_PAGES` to seed the full catalog, (2) add the stable `productId ↔ card_id` mapping, (3) build the
full-group bulk crawl + once-daily job, (4) layer in the coverage-gap and archival open questions from
§5 as fast-follow investigation rather than launch blockers.
