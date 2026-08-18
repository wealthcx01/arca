# ARCA-48 — Replace synthetic price history with real accumulated data, and say so when there isn't enough yet

**Status:** Todo · **Area:** Analytics · **Depends on:** ARCA-4, ARCA-5, ARCA-8

## Why this matters (for the founder)
Right now every indicator, the ARCA Score, and all volatility numbers are computed on a
fabricated 30-day random walk (`seed-prices.ts`), not real prices. For a market-analytics
product this is the worst kind of bug: the terminal looks confident while showing numbers
that mean nothing. This fixes that by using only real data as it accumulates, and — more
importantly — making the terminal honest the moment it doesn't have enough real history
yet, rather than quietly filling the gap with something fake-looking-real.

## Context
- Confirmed in the backlog: analytics currently sit on synthetic data — `seed-prices.ts`
  fabricates a 30-day random walk, already flagged in
  `docs/analytics-continuation-prompt.md` (ARCA-27, "Planned").
- Checked what the six existing providers (ARCA-4: tcgdex, tcgcsv, pokemon-tcg,
  pokemon-price-tracker, poketrace, pricecharting) can actually supply, since the honest
  fix depends on knowing there's no shortcut available:
  - **PriceCharting** (closest thing to a graded-card source) states plainly in its own
    docs that historic prices and historic sales are not supported via API/CSV — current
    values only. Sales-history/trend data exists only behind their paid "Legendary" tier,
    and even that is aggregate trend charts, not a raw exportable series.
  - **TCGdex** embeds rolling `avg1/avg7/avg30` averages in current-price responses — a
    rolling window on raw-card (TCGPlayer/Cardmarket) pricing, not graded, and not a real
    daily series.
  - **pokemon-tcg.io (free)** has no price history or price-change tracking at all.
  - No provider in the registry, free or paid, supplies ready-made backdated graded-card
    history. This means there is no way to backfill the past — the only honest path is
    to start accumulating real daily snapshots from today and be upfront about how little
    history exists until it builds up.

## Scope
- Remove the synthetic 30-day random-walk seed (`seed-prices.ts`) from the analytics path
  entirely — no fabricated data feeds any indicator, score, or vol number, ever.
- Confirm/ensure the existing daily price job (ARCA-4/5's pipeline into `price_history`)
  is running and accumulating one real snapshot per day per priced card, starting today.
- Compute OHLC, indicators, ARCA Score and vol only from whatever real `price_history`
  actually exists for a card — nothing padded, backfilled, or approximated.
- Define and apply a minimum-real-history threshold per metric (e.g. a 30-day indicator
  needs 30 real days). Below that threshold, the UI must show a clear, plain "building
  history — N of 30 days collected" state instead of a computed value.
- Apply this honesty rule everywhere a real number currently appears: card detail,
  analytics pages, ARCA Score, and anywhere vol/indicators surface.

## Out of scope
- Backfilling years of real historical graded-card prices — no current provider (free or
  paid) supplies this; sourcing it separately (e.g. historical sold-listing data) is a
  future, larger effort, not part of this ticket.
- Changing indicator formulas, the ARCA Score composite logic, or adding new data
  providers (e.g. evaluating PriceCharting's paid tier) — separate decisions.

## Acceptance criteria
- [ ] `seed-prices.ts`'s synthetic random-walk generator is removed from the analytics path.
- [ ] Real daily snapshots are confirmed accumulating into `price_history` starting today.
- [ ] Every indicator, the ARCA Score, and all vol numbers are computed strictly from real
      accumulated history — never from fabricated or padded data.
- [ ] Any card/metric with less real history than its minimum threshold shows a plain
      "building history" state (with progress, e.g. "12 of 30 days") instead of a number.
- [ ] No page in the terminal can display an indicator/score/vol figure that is backed by
      fabricated data.
