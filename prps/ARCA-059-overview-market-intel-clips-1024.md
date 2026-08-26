# PRP — ARCA-059-overview-market-intel-clips-1024

## Intent
At the 1024px laptop breakpoint, every user sees the full ERA/SETS/AVG/VALUE table in the Overview
page's "Market Intel — By Era" panel — no column cut off at the panel edge — matching what already
renders correctly at 1280px.

## Context
- `client/src/pages/OverviewPage.tsx` — the Overview page. The three-column grid is
  `grid gap-3 lg:grid-cols-[30%_35%_35%]` (line ~189); Tailwind's `lg:` breakpoint is a 1024px
  min-width, so the 3-column layout (and its narrowest right-column width) first kicks in exactly at
  the clipping width. The "Market Intel — By Era" panel is the last block in the right column
  (lines ~296-348): a hand-rolled `<table className="w-full terminal-dense">` with 4 columns
  (Era, Sets, Avg, Value), wrapped in `<div className="max-h-[240px] overflow-auto">`.
- `client/src/components/terminal/DataPanel.tsx` — the shared panel chrome every panel uses. Its
  root div is `overflow-hidden`, so any content that overflows the panel's own width (rather than the
  inner scroll div) is clipped, not scrolled — this is what makes the last column disappear instead
  of becoming reachable via a scrollbar.
- `client/src/index.css` (`.terminal-dense`, ~line 162) — sets `white-space: nowrap` on every `td`/
  `th` app-wide. Combined with `table-auto` (the default) and no per-column width, the browser
  expands the table past its `w-full` container to fit the widest unwrapped cell. The long Era labels
  produced by `categorizeByEra()` (OverviewPage.tsx ~line 356) — "DP / Platinum", "Sword & Shield",
  "Scarlet & Violet" — are the widest cells and are what push the Value column past the visible edge
  once the right column narrows to ~35% of a 1024px viewport (roughly 330-340px after page padding
  and grid gaps, versus ~420px+ at 1280px).
- `.terminal-dense` is shared by 10 other files (SetPerformancePanel, GradingPremiumPanel,
  DataTable.tsx, AnalyticsPage, SetsErasPage, GradedMarketPage, CardDetailPage, and analytics
  panels). The ticket confirms only this one panel clips at 1024px, so the fix must not touch the
  shared class or the grid's effect on the other eight Overview panels, which already render
  correctly at this width.
- `client/src/components/terminal/DataTable.tsx` is a reusable dense-table component that already
  supports a per-column `width` (see `Column<T>.width`, used via inline `style`), but the Market
  Intel panel does not use it — it hand-rolls its own `<table>`. Not required reading for the fix,
  but establishes the existing app pattern for giving a column a reserved width.
- `docs/tickets/ARCA-059-overview-market-intel-clips-1024.md` — ticket scope explicitly allows
  either adjusting the Overview grid's breakpoints/column widths, or the panel's internal table
  layout. Given the other 8 panels are confirmed fine at 1024px, changing the panel's internal table
  layout is the narrower, lower-risk option and is preferred over touching the shared grid.

## Approach
Fix inside the Market Intel panel's own table markup in `OverviewPage.tsx` only — do not touch the
grid column split, `DataPanel.tsx`, or the shared `.terminal-dense` class (both used by unrelated
panels). Give the table fixed/reserved column widths (e.g. `table-fixed` with explicit widths, or
per-column `width` styles) so the three numeric columns (Sets, Avg, Value) always keep enough space
to render fully, and let the Era column — the one with genuinely variable-length content — truncate
(`truncate`/`overflow-hidden` with `title` for full text on hover) instead of forcing the table wider
than its container. This guarantees Value is never pushed past the panel edge at any viewport width
down to 1024px, while leaving the 1280px+ rendering visually unchanged (nothing truncates once there
is room).

Files touched:
- `client/src/pages/OverviewPage.tsx` — Market Intel table markup only (`<table>`, `<th>`, `<td>`
  classes/widths for the Era/Sets/Avg/Value columns).

## Tasks
- [ ] Reserve fixed widths for the Sets, Avg, and Value columns in the Market Intel table so they
      cannot be squeezed by the Era column's content.
- [ ] Constrain the Era column to truncate with an ellipsis (and expose the full label via `title`)
      instead of forcing the table wider than its container.
- [ ] Confirm the table no longer exceeds the width of its `overflow-auto` wrapper at 1024px, so
      `DataPanel`'s `overflow-hidden` has nothing left to clip.
- [ ] Visually diff the panel at 1280px before/after to confirm no unintended change once columns
      already fit.

## Validation gates
- [ ] happy path: at exactly 1024px viewport width, on `/overview`, every row of the Market Intel —
      By Era panel shows all four columns (Era, Sets, Avg, Value) fully, with the Value figure
      completely visible for every era row, including "DP / Platinum", "Sword & Shield", "Scarlet &
      Violet", and "Other".
- [ ] edge cases: the longest Era label present in `categorizeByEra()`'s output truncates cleanly
      (ellipsis, no overlap into the Sets column) rather than forcing horizontal overflow; the
      largest expected Value figure (4-digit dollar amount, e.g. "$9999", the ceiling before
      `formatCompact` switches to the "$X.XK" form at $10,000) renders in full without wrapping or
      clipping.
- [ ] errors: the panel's existing loading, error (`PanelErrorState`), and empty (`PanelEmptyState`)
      states are unaffected by the table markup change — verify by triggering `setsError` and the
      zero-eras empty state and confirming layout is unchanged from before the fix.
- [ ] coverage: manually verified (or screenshot-diffed) at 1024px and 1280px, and spot-checked at
      the grid's other breakpoint boundaries (e.g. 1279px, 1280px) to confirm the fix holds across
      the full `lg:`-to-`xl:`-equivalent range and doesn't regress the already-correct 1280px+
      rendering; confirm no other Overview panel's width or layout changed as a side effect.

<!-- foundry-ticket: 5a83801b40297edf -->
