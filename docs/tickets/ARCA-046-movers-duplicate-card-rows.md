# ARCA-46 — Top Movers / Gainers / Alerts show the same card twice at two different prices

**Status:** Planned · **Area:** Backend/Data · **Depends on:** ARCA-5, ARCA-17

## Context
Filed from the ARCA-43 UI/UX audit, under "Read the words" / "are numbers labelled well enough to be
trusted?" — a ranked "Top Gainers" list where the same card appears twice at two different percentage
changes is not trustworthy, independent of the React warning it also throws.

## What I did
Loaded `/overview`, `/news`, and `/screener` as a fresh user and inspected the browser console, then
queried the backend directly:
```
curl "http://localhost:3001/api/market/movers?period=7d&limit=50"
```

## What happened
Console shows, on every page that renders a movers/gainers list (Overview, News, Screener), repeated
React warnings:
```
Encountered two children with the same key, `%s`. ... z5gi48ileic2
Encountered two children with the same key, `%s`. ... 2o3nh529xhk5
```
The `/api/market/movers` response confirms why: the same card id appears twice, each time with a
*different* current price and percent change:
```
{"id": "z5gi48ileic2", "name": "Rotom", ... "current_price_cents": 552,  "pct_change": 64.29}
{"id": "z5gi48ileic2", "name": "Rotom", ... "current_price_cents": 438,  "pct_change": 30.36}
{"id": "2o3nh529xhk5", "name": "Plusle", ... "current_price_cents": 4483, "pct_change": 125.62}
{"id": "2o3nh529xhk5", "name": "Plusle", ... "current_price_cents": 2572, "pct_change": 29.44}
```
This looks like a multi-source pricing join that isn't deduplicated/conflated to one row per card
before ranking — the exact thing the "conflated multi-provider pricing" pipeline (CLAUDE.md) is
supposed to produce. The visible symptom is a "Top Gainer" table where Rotom shows up twice with two
different jumps, which reads as broken math to anyone checking the numbers.

## What I expected
One row per card per period in movers/gainers/alerts, using the conflated best price, matching the
per-card conflated pricing shown correctly on the card detail page's "Best Price (Conflated)" panel.

## Repro steps
1. `curl "http://localhost:3001/api/market/movers?period=7d&limit=50"` and grep for duplicate `id`
   values — reproduces without a browser. Confirmed the same duplicate ids
   (`z5gi48ileic2`, `2o3nh529xhk5`) also appear in
   `curl "http://localhost:3001/api/market/alerts?limit=50&period=7d"` — this is not isolated to one
   endpoint.
2. Or: sign in, open `/overview`, open devtools console, observe the duplicate-key warnings.

## Acceptance criteria
- [ ] `/api/market/movers` and `/api/market/alerts` each return at most one row per card per
      requested period.
- [ ] No duplicate-key console warnings on Overview, News, or Screener.
