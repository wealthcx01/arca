# ARCA-52 — Data tables clip at the 375px edge instead of scrolling, on Card Detail

**Status:** Planned · **Area:** Frontend/UX · **Depends on:** ARCA-21

## Context
Filed from the ARCA-43 UI/UX audit's three-widths pass.

## What I did
Visited `/cards/ht254dhrynyj` at 375px width and inspected the "Best Price (Conflated)" and "Graded
Prices" tables.

## What happened
Both tables render at full desktop column width (Variant/Market/Low/Mid/High, and
Company/Grade/Price/Type/Source) and are simply clipped by the 375px viewport with no scroll wrapper
engaged — values in the rightmost columns ("High," "Source") are cut off entirely (e.g. "US$2,349.90"
reads as "US$2,349..." with the rest off-screen, and "€37..." is fully unreadable). Unlike the chart
panel above it (which resizes down cleanly), these tables don't adapt or scroll independently at this
width.

## What I expected
Either a horizontally scrollable table container at narrow widths, or a responsive column
layout/stacking, so no data is permanently unreadable.

## Repro steps
1. Sign in, set viewport to 375px wide.
2. Visit `/cards/ht254dhrynyj`.
3. Scroll to "Best Price (Conflated)" and "Graded Prices" — rightmost column values are cut off at
   the viewport edge with no way to reveal them.

## Acceptance criteria
- [ ] All table columns/values are reachable (via scroll or responsive layout) at 375px width.
