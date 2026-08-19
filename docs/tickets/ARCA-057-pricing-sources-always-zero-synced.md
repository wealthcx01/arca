# ARCA-57 — Settings "Pricing Sources" always shows "0 cards synced" for active free sources

**Status:** Todo · **Area:** Settings/Pricing · **Depends on:** —

## Why this matters (for the founder)
ARCA's entire premise is trustworthy market data. The Settings page's job is partly to reassure a
user that the data sources are actually working. Right now it tells every user that TCGdex and
TCGCSV — the two free, no-key sources — have synced zero cards, even while the app is actively
serving prices sourced from them everywhere else (Graded, card detail, Overview's set indices).

## Context
Found during the ARCA-43 UI/UX audit. Steps taken: signed in, opened Settings, viewed "Pricing
Sources."

**What happened:** both `TCGdex (CardMarket + TCGPlayer)` and `TCGCSV (TCGPlayer)` show
"Free · 0 cards synced." Meanwhile, `card_prices` has 851 rows and card detail pages show live
`TCGdex`-sourced prices (e.g. `/cards/ht254dhrynyj`'s conflated price panel shows
`market_source: "tcgdex"` for both variants). The displayed sync count doesn't match reality.

**Expected:** the sync count reflects how many cards each source has actually priced, so a user can
tell the data pipeline is healthy.
**Actual:** it reads zero regardless of actual coverage, which reads as "this integration is broken"
to anyone checking — the opposite of the reassurance the panel is meant to provide.

**Reproduce:** sign in, open `/settings`, compare the "X cards synced" labels against
`SELECT source, COUNT(*) FROM card_prices GROUP BY source` (or any page showing a `tcgdex`-sourced
price, e.g. any card detail or the Graded page).

**Root cause:** `pricingRouter.get("/sources", ...)` (`modules/pricing/handlers.ts:45-63`) reads
`cards_synced` from the `price_source_status` table, defaulting to `0` when no row exists for a
provider (`status?.cards_synced ?? 0`). Checked the table directly — it has **zero rows**, for any
provider, despite `card_prices` holding 851 `tcgdex`-sourced rows:
```
$ select * from price_source_status;   -> []
$ select source, count(*) from card_prices group by source;  -> tcgdex: 851
```
So the handler's fallback logic is fine. The real job (`modules/pricing/jobs.ts:63-101`,
`updateProviderStatus`) is also fine — it does upsert a `price_source_status` row with
`cards_synced` after each provider run, called from the sync orchestrator in that same file. The gap
is that this environment's `card_prices` rows were never populated by that job — they came from
`scripts/seed-prices.ts`, the documented seed path (see README / CLAUDE.md quick start), which
inserts directly into `card_prices` and never touches `price_source_status` at all. So a freshly
seeded dev environment (or any environment that only ever ran the seed script, not a live sync) shows
851 priced cards and zero status rows — not because the status-writing code is missing, but because
the seed script bypasses it entirely.

## Scope
- Have `scripts/seed-prices.ts` write/update `price_source_status` (status, `last_sync_at`,
  `cards_synced`) after it seeds `card_prices`, e.g. by calling the same upsert logic
  `updateProviderStatus` in `modules/pricing/jobs.ts` uses, so a seeded environment isn't
  distinguishable from a synced one on this panel.
- Confirm the count updates as new prices sync in via the real job (it already should, per
  `updateProviderStatus` — verify rather than assume).

## Out of scope
- Any change to the BYOK sources' "Requires API key" labeling — that's accurate as-is.
- The unrelated `/pricing/keys` routing bug on the same page (ARCA-54).

## Acceptance criteria
- [ ] The Pricing Sources panel shows a non-zero, accurate synced-card count for TCGdex and TCGCSV
      once prices from those sources exist in `card_prices`.
- [ ] The count is verified against the actual row count for that source, not hardcoded.
