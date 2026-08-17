# ARCA-NEW — Plan full-catalog daily price coverage using bulk provider feeds

**Status:** In progress · **Area:** Pricing/ETL · **Depends on:** ARCA-24, ARCA-4

## Why this matters (for the founder)
Right now the screener and any market-wide view only ever look at a sliver of the market — held
cards, from a catalog capped at ~1,250 of ~19,000. This piece of work figures out exactly how to
price the WHOLE tradable universe every day, and confirms it can be done for free/near-free — so
you can decide to commit to the full build with no surprises on cost or provider limits.

## Context
ARCA-24 already flagged the two-part gap: pricing only refreshes held cards, and the catalog seed
stops at 5 pages (~1,250 cards) instead of the full ~19k. Checking what the providers ARCA already
uses actually allow:

- **TCGCSV** (already integrated, free, no key) publishes the entire TCGplayer catalog — every
  game, every product, every price — as one bulk daily download, refreshed once per day around
  20:00 UTC. Their own guidance: a full sync should take at most ~10,000 requests, done once every
  24 hours (https://tcgcsv.com/docs, https://tcgcsv.com). They also maintain a daily price-history
  archive back to Feb 2024 (https://tcgcsv.com/faq) — directly relevant to ARCA-27's real-history
  problem too.
- **TCGdex** (already integrated, free, no key) publishes no hard rate limit for catalog/price
  data — just asks callers to cache rather than re-poll (https://tcgdex.dev/faq).
- **pokemon-tcg.io** (already integrated) is capped at 20,000 requests/day with a key, 1,000/day +
  30/min without one (https://docs.pokemontcg.io/getting-started/rate-limits). Fine for metadata
  lookups, wrong shape for daily full-market pricing since it's a per-card call.
- **PriceCharting** (BYOK provider) gives zero API access at all on its free tier — any API access,
  and all historical data, sits behind the paid "Legendary" subscription
  (https://www.pricecharting.com/pricecharting-pro, https://www.pricecharting.com/api-documentation).

Bottom line: the real constraint isn't rate limits on the free providers — it's that ARCA's current
pricing job is built to call providers per-card, per-held-card, on demand. TCGCSV wants the opposite:
one bulk file, once a day, for literally everything. The job needs to be redesigned around that
shape to cover the full catalog affordably.

## Scope
- Investigate and document a concrete plan to price the full ~19,000-card catalog daily using
  TCGCSV's bulk daily file as primary source, with TCGdex as secondary/cross-check.
- Confirm exact request/storage volume and timing needed for one full daily sync (target: single
  bulk pull, once per day, well inside TCGCSV's ~10,000-request guidance).
- Identify what changes the current pricing job (`jobs.ts`, provider registry) needs to consume a
  bulk snapshot instead of per-card/per-held-card requests.
- Flag any coverage or data-quality gaps between the free bulk feed and the full card catalog (e.g.
  cards/variants TCGCSV doesn't carry) as an explicit open question for a follow-up decision.
- Produce a short cost/feasibility summary: what it takes, what it costs (expect: $0 for the feed
  itself), and what's left as a risk.

## Out of scope
- Actually rebuilding the pricing job or raising the catalog seed cap (that's ARCA-24's build work).
- Real historical price backfill (that's ARCA-27).
- Any paid-tier provider upgrade (e.g. PriceCharting Legendary) — noted as an option, not adopted here.

## Acceptance criteria
- [ ] A written plan exists showing how to price the full ~19k-card catalog daily via bulk feeds,
      with request volume and timing spelled out against provider limits.
- [ ] The plan states clearly what it costs (expected: $0 in provider fees) and what changes are
      needed in the existing pricing job to use it.
- [ ] Any coverage gaps between free bulk feeds and the full catalog are listed as explicit open
      questions, not silently assumed away.
- [ ] Founder has a clear yes/no decision point on whether to proceed to the full build (ARCA-24).

## Findings & plan

### (a) Request-volume math — proven against TCGCSV's own limits
Confirmed live: `GET https://tcgcsv.com/tcgplayer/3/groups` returns `"totalItems": 217` Pokémon
groups today (categoryId 3). A full daily pull is:

- 1 request → `/tcgplayer/3/groups` (get all group IDs; can stay 6h-cached as it is today)
- 2 requests per group → `/tcgplayer/3/{groupId}/products` + `/tcgplayer/3/{groupId}/prices`

**Total: 1 + 2 × 217 = 435 requests/day**, vs. TCGCSV's ~10,000-request guidance — about 4.4% of
budget, with ~23x headroom for group-count growth (new sets, reprints) before the guidance is even
approached. This is a single bulk pull, not per-held-card or per-card, so cost is flat regardless of
whether the catalog is 1,250 cards or 19,000 — the group count (currently 217, ~165 core Pokémon TCG
sets plus promos/specials/Mega Evolution sub-sets) is what drives request volume, not card count.

### (b) Shape change needed in `jobs.ts` / `tcgcsv.ts`
Today: `syncPrices()` (`modules/pricing/jobs.ts:271`) calls `getHeldCardRefs()` — holdings-joined,
held-cards-only — then each provider's `fetchPrices(cardRefs, config)` is driven by that list.
`tcgcsvProvider.fetchPrices` (`modules/pricing/providers/tcgcsv.ts:136`) already groups by set and
calls `findGroupId` + `fetchGroupPrices` once per distinct set in the input — so it's already
group-shaped internally, but it's gated by which sets appear in `cardRefs`, and re-fetches those
same groups on every 6-hourly run regardless of whether TCGCSV's daily file changed.

For full-catalog coverage the shape needs to invert control:
1. A new bulk entry point (e.g. `tcgcsvProvider.fetchAllGroups()` or a standalone job) iterates
   *every* TCGCSV group once, independent of `cardRefs` — not "for each set present in my card
   list," but "for each group TCGCSV has."
2. `syncPrices()`'s all-providers-driven-by-`getHeldCardRefs()` loop needs to split: TCGCSV becomes
   a full-catalog bulk job on its own daily schedule; TCGdex/pokemon-tcg.io stay held-cards-only
   (or a secondary cross-check subset) on the existing 6h/12h cadence, since neither is
   bulk-shaped (see Context: ~3,800 sequential TCGdex batches at 19k cards).
3. `persistPrices()`/`runConflation()` (`modules/pricing/jobs.ts:104`, `:214`) are keyed by
   `card_id`, not `product_id` — so the bulk job still needs a resolved `card_id` per matched
   product before it can write to `card_prices`. That resolution step is the matching gap in (c).
4. This is a job/provider-shape change only — `card_prices`, `price_history`, `price_source_status`
   need no schema change; the bulk job would just call the same `persistPrices()` /
   `updateProviderStatus()` helpers with a full-catalog result set.

### (c) Card-to-product matching gap at ~19k scale
`matchProduct()` (`modules/pricing/providers/tcgcsv.ts:117`) is exact-then-substring on
`cleanName` only — no stored TCGCSV `productId` on the `cards` row anywhere in the schema. At
~1,250 held/seeded cards this is a tolerable approximation; at ~19k it is a real accuracy risk:
Pokémon TCG has many cards that share a base name across variants within the same set (e.g.
multiple "Pikachu" prints, alt-art/full-art duplicates, promo reprints of the same name) where
substring matching against `cleanName` cannot disambiguate — it will silently attach the wrong
product's price to a card, or attach one product's price to several cards.

**Decision point (not deferred silently):** name-only matching is not good enough at full-catalog
scale. A `tcgcsv_product_id` column on `cards` (nullable, backfilled once via a one-time
match-and-confirm pass, then trusted going forward) is a prerequisite for trustworthy full-catalog
pricing — this is `ARCA-24` build scope, flagged here so it isn't discovered mid-build.

### (d) Scheduler timing gap vs. TCGCSV's ~20:00 UTC refresh
`scheduler.ts` (`src/lib/scheduler.ts`) is `setInterval`-only: `register(name, fn, intervalMs)`
fires immediately on `start()` then every fixed `intervalMs`, with no wall-clock/time-of-day
targeting. TCGCSV's bulk file refreshes once daily around 20:00 UTC. Running a 24h-interval job
with no alignment means the sync will drift to fire at whatever time-of-day the server happened to
start, which could land hours before that day's refresh (pulling yesterday's data) or hours after
(needlessly stale wait). This is not blocking for a once-per-day design (worst case: prices are up
to ~24h stale rather than ~mins stale) but a "run once daily shortly after 20:00 UTC" job needs
either (i) a small wall-clock-aware scheduling primitive added to `scheduler.ts`, or (ii) an
external cron trigger calling a `runOnce("pricing:sync-tcgcsv-bulk")`-style entry point — both are
ARCA-24 build decisions, named here as a real gap rather than assumed solved by the existing
interval scheduler.

### (e) Error handling — skip-and-retry vs. partial persist
`fetchGroupPrices()` (`modules/pricing/providers/tcgcsv.ts:93`) already fails soft per group today:
if either the `products` or `prices` request for a group errors or returns non-OK, it returns empty
arrays for that group and the loop `continue`s to the next set — it does not throw and does not
abort the whole run. For the bulk job this same per-group-soft-fail behavior is what should carry
over: **skip-and-retry-next-run, not partial persist of a half-fetched group.** Concretely: if a
group's `products` or `prices` call fails, that group's existing `card_prices` rows are left
untouched (not zeroed, not conflated_rank-reset) for that day, and the group is retried on
tomorrow's scheduled run — that already-existing behavior in `runConflation()`
(`modules/pricing/jobs.ts:214`, only touches `cardIds` that has results this run) means a failed
group does not silently wipe `conflated_rank = 1` down to 0 for cards it couldn't fetch; those
cards simply keep yesterday's conflated price until the next successful pull. `price_source_status`
(`priceSourceStatus`) should record partial-failure runs (e.g. `"ok (211/217 groups)"` or a
separate per-group failure count) rather than collapsing to a single ok/error boolean, so a
degraded day is visible rather than silently masked as full success.

### Coverage / data-quality open questions (explicit, not assumed)
1. **Promos** — TCGCSV groups include some promo sets (e.g. "Player Placement Trainer Promos" seen
   in the live group list) but coverage of every Pokémon TCG promo card (League promos, Prerelease
   promos, McDonald's promos) against TCGplayer's own catalog gaps is unverified — open question,
   not assumed complete.
2. **Non-English-only exclusives** — TCGCSV/TCGplayer is a US/English secondary market; cards only
   released outside English print runs (JP/KR-exclusive promos, some Trainer Gallery variants) may
   have no TCGplayer product at all, meaning no bulk-feed price is possible for them regardless of
   matching quality — open question on whether these fall back to TCGdex, go unpriced, or need a
   different source.
3. **Variant subtypes `normalizeVariant()` doesn't map** — `normalizeVariant()`
   (`modules/pricing/providers/tcgcsv.ts:48`) maps `subTypeName` to only four buckets (`normal`,
   `holofoil`, `reverseHolofoil`, `1stEdition`) via substring checks. TCGPlayer's `subTypeName`
   values include additional strings this function doesn't special-case (e.g. "Unlimited Holofoil",
   "1st Edition Normal" combinations) — today these silently fall through to `normal`, which is a
   variant-identity error, not just a missing price. Open question: does full-catalog scale surface
   enough of these silent misclassifications to warrant expanding `normalizeVariant()`'s mapping
   before/alongside the bulk-pull build.

### Cost / feasibility summary
- **Cost: $0.** TCGCSV and TCGdex are both free, keyless, and the entire plan uses only providers
  already integrated — no new provider, no paid tier, no BYOK key required.
- **Volume: 435 requests/day** for a full-catalog TCGCSV pull (217 groups today), ~4.4% of TCGCSV's
  ~10,000-request/24h guidance, with wide headroom for catalog growth.
- **What's required to build (ARCA-24 scope, not this ticket):** (1) invert `syncPrices()`/
  `tcgcsv.ts` from held-cards-driven to all-groups-driven for TCGCSV specifically; (2) add a
  `tcgcsv_product_id` column to `cards` and a one-time backfill match pass — name-only matching is
  not trustworthy at ~19k cards; (3) either extend `scheduler.ts` with wall-clock alignment or wire
  an external daily trigger for the ~20:00 UTC TCGCSV refresh window; (4) keep the existing
  per-group soft-fail/skip-and-retry behavior, and make `price_source_status` report partial-group
  failures instead of a single ok/error flag.
- **What's left as risk:** the three coverage/data-quality open questions above (promos,
  non-English exclusives, unmapped variant subtypes) are not resolved by this plan — they are named
  so the founder decides explicitly whether to accept the gap, source a supplement, or scope it into
  ARCA-24's build.

### Founder decision point
**Proceed to ARCA-24 full build using TCGCSV bulk-pull-once-daily as primary pricing source for the
full catalog?** Cost is $0 and request volume (435/day) is well inside provider limits — the
blocking prerequisite before build is the `tcgcsv_product_id` matching decision in (c), and the
three coverage gaps above are open items to accept or scope in, not blockers to a yes.
