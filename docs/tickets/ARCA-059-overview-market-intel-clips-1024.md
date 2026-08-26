# ARCA-59 — Overview "Market Intel — By Era" value column clips at 1024px width

**Status:** In progress · **Area:** Client/UI · **Depends on:** —

## Why this matters (for the founder)
1024px is a common laptop width, not an edge case — the ticket that commissioned this audit
specifically calls it out as "the width most people use." A visible data column being cut off on the
Overview page, the first thing every user sees, is a small but real polish gap on the most-viewed
screen in the product.

## Context
Found during the ARCA-43 UI/UX audit, checking Overview at the required 1024px width.

**What happened:** the "Market Intel — By Era" panel (bottom-right of the three-column Overview
grid) has four columns: ERA, SETS, AVG, VALUE. At 1024px, the VALUE column's figures (e.g. "$7675",
"$4187") are cut off at the right edge of the viewport/panel — only partially visible. At 1280px the
same panel displays fully.

**Expected:** all four columns are fully visible at 1024px, matching how they render at 1280px.
**Actual:** the rightmost column is clipped at 1024px.

**Reproduce:** sign in, set viewport width to 1024px, go to `/overview`, look at the bottom-right
"Market Intel — By Era" panel's VALUE column.

## Scope
- Adjust the three-column Overview grid's breakpoints/column widths (or the panel's internal table
  layout) so the Market Intel panel's VALUE column isn't clipped at 1024px.

## Out of scope
- Any other Overview panel — the other eight panels were checked at 1024px and render fully.
- Sub-1024px layouts, which already reflow to fewer columns.

## Acceptance criteria
- [ ] At 1024px width, the Market Intel — By Era panel's VALUE column is fully visible for every row.
