# ARCA-50 — Price chart shows a garbled, overlapping numeral label in its bottom-left corner

**Status:** Planned · **Area:** Frontend/Visual · **Depends on:** ARCA-8

## Context
Filed from the ARCA-43 UI/UX audit's "look at it at three widths" pass — reproducible at 1280, 1024,
and 375px, on two different pages that both embed a lightweight-charts price chart.

## What I did
Visited `/cards/ht254dhrynyj` and `/analytics` (Market tab) at 1280, 1024, and 375px and inspected the
chart area closely (screenshots captured for all six combinations).

## What happened
In the bottom-left corner of the price chart's plot area, two overlapping numeral glyphs render
stacked on top of each other (reads roughly as garbled "17" characters), independent of the
underlying data — same artifact on the Card Detail candlestick chart and the Analytics market-index
line chart, at every width tested. It looks like a leftover/duplicate axis label or crosshair value
that isn't being cleared or repositioned, distinct from the normal price-scale labels running down
the right edge (which render correctly).

## What I expected
No stray overlapping text in the chart's corner — only the intended axis labels and current-value
marker.

## Repro steps
1. Sign in, visit `/cards/ht254dhrynyj` (or any card detail page with price history).
2. Look at the bottom-left corner of the "Price Chart" panel — reproduces at 1280, 1024, and 375px.
3. Same artifact visible on `/analytics`, "ARCA Market Index" chart, bottom-left corner.

## Acceptance criteria
- [ ] No overlapping/garbled text renders in the chart area on Card Detail or Analytics, at any of
      the three widths.
