# ARCA-49 — Plan full-catalog daily price coverage using bulk provider feeds

**Status:** Shipped · **Area:** Pricing/ETL · **Depends on:** ARCA-24, ARCA-4

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
- [x] A written plan exists showing how to price the full ~19k-card catalog daily via bulk feeds,
      with request volume and timing spelled out against provider limits. See
      `docs/bulk-price-feed-plan.md` §2 (Request volume) and §3 (Timing).
- [x] The plan states clearly what it costs (expected: $0 in provider fees) and what changes are
      needed in the existing pricing job to use it. See `docs/bulk-price-feed-plan.md` §4 (Job/provider
      changes) and §6 (Cost/feasibility summary).
- [x] Any coverage gaps between free bulk feeds and the full catalog are listed as explicit open
      questions, not silently assumed away. See `docs/bulk-price-feed-plan.md` §5 (Coverage /
      data-quality gaps).
- [x] Founder has a clear yes/no decision point on whether to proceed to the full build (ARCA-24). See
      `docs/bulk-price-feed-plan.md` §7 (Founder decision point).
