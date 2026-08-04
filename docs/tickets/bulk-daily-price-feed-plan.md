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

### 1. Request volume — measured against the live API, not assumed
`GET https://tcgcsv.com/tcgplayer/3/groups` was called directly against the live TCGCSV API on
2026-07-31 and returns **217 groups** for Pokémon (game id 3) today — everything from "Base Set"
(1999) through 2026 releases, mainline sets and supplemental/promo groups alike.

A full daily pull needs:
- 1 request for the group list (`/3/groups`)
- 2 requests per group (`/3/{groupId}/products` + `/3/{groupId}/prices`)

**Total: 1 + (2 × 217) = 435 requests/day.** That's ~4.4% of TCGCSV's own ~10,000-request/24h
guidance for a full sync — enormous headroom, including room for the group count to roughly
double before approaching the limit. This is a single bulk pull once a day, not a per-card or
per-held-card loop, and it covers the entire TCGPlayer Pokémon catalog (all ~19k cards' sets), not
just the ~1,250 cards currently seeded.

Cost: **$0**. TCGCSV requires no API key and no paid tier for this data.

### 2. Shape change needed in the pricing job
Today, `modules/pricing/jobs.ts::syncPrices()` is driven by `getHeldCardRefs()` — it joins
`holdings` → `cards` and only fetches prices for cards a user actually holds, on a flat 6-hourly
`setInterval` (`registerPricingJobs()`). `modules/pricing/providers/tcgcsv.ts::fetchPrices()`
mirrors that shape: it groups the *passed-in* cards by set, then does `findGroupId` +
`fetchGroupPrices` per set the caller cares about — i.e. it already fetches a whole group's
products/prices in 2 calls, but only for sets that appear in the held-cards list, and re-derives
that per invocation.

To cover the full catalog, this needs to invert from "fetch prices for these specific cards" to
"pull everything, then match against whatever cards exist locally":
- A new full-catalog bulk-sync path (either a new function alongside `syncPrices()`, or a mode
  argument) that calls `getGroups()` once, then loops **all** 217 groups — not the subset implied
  by held cards — calling `fetchGroupPrices()` for each and persisting every returned product's
  prices, joined against the local `cards` table by `set_code`/`set_name` + product match rather
  than being handed a pre-filtered `CardRef[]`.
- This bulk path only needs to run **once daily**, not every 6h — the source file itself only
  refreshes once a day (~20:00 UTC), so 6-hourly re-pulls of an unchanged snapshot are wasted
  requests today at held-card scale, and would be 4x the request cost at full-catalog scale for
  no new data three-quarters of the time.
- The existing held-cards-only, 6-hourly `syncPrices()` loop can stay as-is for other providers
  (TCGdex cross-check, BYOK graded prices) that are legitimately per-card-shaped; only the TCGCSV
  leg needs to move to the bulk-full-catalog shape.
- `priceSourceStatus` (existing table, no schema change needed) is the natural place to record
  the bulk run's health/volume — `cards_synced` becomes "products matched," with `last_error`
  surfacing partial-run failures (see gap 3 below).

### 3. Card-matching gap — no stored TCGCSV productId
`cards` has no column storing a TCGCSV `productId` today (confirmed: no `productId`/`product_id`
reference anywhere in `modules/cards/schema.ts` or `modules/pricing/schema.ts`). Matching is done
by `matchProduct()` in `tcgcsv.ts`: exact match on `cleanName`, falling back to substring
containment — both name-only, no numeric/set-position disambiguation.

At ~1,250 held cards this is a small, human-checkable surface. At ~19k cards it's a real accuracy
risk: substring matching gets materially more ambiguous at scale (e.g. "Pikachu" vs "Pikachu ex"
vs "Pikachu VMAX" inside the same group, or reprints/alt-arts sharing a base name within one set)
and there is no way to verify or correct a specific mismatch without a stable join key.

**Decision point, not deferred silently:** the existing name-only `matchProduct()` is not judged
good enough as the *sole* match strategy at full-catalog scale. Recommended prerequisite for the
full build (ARCA-24): add a `tcgcsv_product_id` column to `cards`, populated by running
`matchProduct()` once during the bulk pull and persisting the resolved id, so every subsequent
day's pull can join on `productId` directly (exact, O(1)) and only fall back to name-matching for
newly-seeded cards that haven't been resolved yet. This turns a per-day fuzzy-match cost into a
one-time-per-card resolution cost.

### 4. Scheduling gap — no wall-clock alignment
`src/lib/scheduler.ts` is `setInterval`-only: it fires once immediately on `start()` then every
fixed `intervalMs`, with no concept of time-of-day. TCGCSV's bulk file refreshes once daily around
20:00 UTC. A plain interval registered at server start will drift relative to that refresh time
(e.g. a server restarted at 03:00 UTC would poll TCGCSV at 03:00, 03:00+24h, etc., missing the
20:00 UTC refresh by hours every day, and running the earlier-run-of-the-day-old data more often
than necessary if the interval is shorter than 24h).

Since 435 requests/day leaves ample headroom, exact wall-clock alignment isn't required for cost
reasons — but for freshness, the full build should either (a) add a lightweight "run once daily at
or after HH:MM UTC" check on top of the existing scheduler rather than a bare interval, or (b) keep
the interval but set it to run twice daily (e.g. every 12h) so at least one of the two runs lands
after the ~20:00 UTC refresh, accepting the second run as a wasted duplicate call — 2x the daily
cost (870 requests) is still ~8.7% of the 10,000 guidance. Recommended: (a), since it costs nothing
extra in requests and gets same-day-fresh data reliably instead of by chance.

### 5. Coverage/data-quality open questions (explicit, not assumed away)
- **Promos:** TCGCSV groups include supplemental/promo sets (`isSupplemental` flag on the group
  list), but whether every ARCA-catalog promo card has a corresponding TCGPlayer product listing
  is unverified — some convention-exclusive or online-redemption promos may not be sold on
  TCGPlayer at all. Open question: what fraction of ARCA's promo cards (once the catalog seed is
  raised) have no TCGCSV product match, and what should the UI show for those (no price vs. an
  explicit "unpriced" state, per the existing no-fake-data policy)?
- **Non-English-only cards:** TCGCSV's groups list is TCGPlayer's US-market catalog. Cards that
  only exist in non-English printings (or region-exclusive releases) may have no US TCGPlayer
  listing and therefore no TCGCSV price. Open question: how many cards in the full ~19k catalog
  fall into this bucket, and whether TCGdex (which has broader regional data) should be promoted
  from cross-check to primary for that specific subset.
- **Variant subtypes `normalizeVariant` doesn't map:** `normalizeVariant()` in `tcgcsv.ts` only
  recognizes "reverse", "1st edition", and "holofoil"/"holo" substrings, defaulting everything
  else to `"normal"`. TCGPlayer's `subTypeName` field has grown more variant strings over time
  (e.g. special-edition foils, "Cosmos Holofoil," staff/prerelease stamps); anything not matched
  falls into `"normal"`, which would silently misclassify a rarer variant as the base variant's
  price. Open question: what is the full current set of `subTypeName` values across all 217
  groups, and does `normalizeVariant` need new branches before full-catalog rollout (an unmapped
  variant is more likely to surface at 19k cards than at today's ~1,250).

### 6. Failure handling for a bad day
A once-daily bulk pull raises the stakes of a single failed run in a way the current 6-hourly
per-held-card loop does not: if the current job fails, it's likely to succeed within the next 6h;
if a once-daily bulk pull fails, stale prices sit for a full day. Plan: on a per-group
`products`/`prices` request failure (already possible today — `fetchGroupPrices()` catches and
returns empty arrays on any error), **skip that group and retry it on next run**, not a full-pull
abort — persist whatever groups succeeded rather than an all-or-nothing pull, and record the
failed groups' count via `updateProviderStatus()`'s existing `last_error` field so a partial day
is visible instead of silent. Critically, a failed/skipped group must **leave that group's
existing `conflated_rank = 1` rows untouched** rather than clearing them — i.e. persistPrices/
runConflation should only touch cards belonging to groups that returned data this run, so a
provider hiccup degrades to "yesterday's price, visibly stale via `fetched_at`" rather than "no
price at all."

### Cost/feasibility summary
- **Cost: $0.** TCGCSV requires no key and no paid tier for full-catalog product/price data.
- **Volume: 435 requests/day** (measured against the live API today, 217 groups), ~4.4% of
  TCGCSV's ~10,000-request/24h guidance — large headroom even as the catalog grows.
- **Job changes needed:** a new full-catalog bulk-pull path (loop all groups, not held-card-derived
  sets), moved to once-daily instead of 6-hourly for the TCGCSV leg specifically, with per-group
  failure isolation so a bad day doesn't wipe good prices.
- **Prerequisite flagged, not silently deferred:** a `tcgcsv_product_id` column on `cards` is
  recommended before full rollout, since name-only matching is judged insufficient at ~19k-card
  scale.
- **Open risk, not silently assumed away:** coverage gaps for promos, non-English-only cards, and
  unmapped variant subtypes need a follow-up decision on acceptable "unpriced" states.

### Founder decision point
**Proceed to ARCA-24 full build?** The bulk-feed approach is confirmed free and well within rate
limits (435 of ~10,000 requests/day). The two items that need an explicit yes/no before or during
that build are: (1) whether to add the `tcgcsv_product_id` column as a prerequisite for
full-catalog matching accuracy, and (2) how to handle the coverage gaps in Section 5 (show
"unpriced" vs. exclude those cards from market-wide views). Everything else in this plan (bulk-pull
shape, once-daily timing, per-group failure isolation) is ready to build against as scoped.
