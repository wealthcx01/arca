# PRP — overview-welcome-empty-states

## Intent
A brand-new user who signs up lands on the Overview page and is welcomed with a clear "get started" message, then sees nine honest, single-purpose empty panels instead of a blank, confusing terminal — with no invented numbers anywhere.

## Context
- `client/src/pages/OverviewPage.tsx` renders the nine post-signup panels in a 3-column grid: `SetPerformancePanel`, `DataPanel "Portfolio"`, `FxRatesPanel`, `GradingPremiumPanel`, `TopMoversPanel`, `NewsPanel`, `DataPanel "Market Stats"`, `PriceChartPanel`, `DataPanel "Market Intel — By Era"`.
- Each panel currently handles its own empty case ad hoc: `SetPerformancePanel`, `FxRatesPanel`, `GradingPremiumPanel`, `TopMoversPanel`, `NewsPanel` render terse strings ("No set data available", "No FX data", "No graded price data", "No gainers"/"No losers", "No significant price movements"); `PriceChartPanel` renders "Select a card to view price chart" / "No price history available"; the three `DataPanel`-based panels (Portfolio, Market Stats, Market Intel) render **zero-valued numbers** (£0, 0%, empty table rows) rather than an empty-state message — this is the fake-data-adjacent gap the founder's policy targets (see venture knowledge: "Product policy: never show fake/demo data in empty states").
- `client/src/components/terminal/DataPanel.tsx` is a plain header+body shell (title, optional toolbar, children) — no empty-state awareness of its own; the three `DataPanel` instances would need their *children* (the panel-specific content components, inline in `OverviewPage.tsx`) to add a conditional empty branch.
- The existing "Welcome to ARCA" state lives in `client/src/pages/DashboardPage.tsx` (lines 327–394, function `EmptyState`), gated on `portfolios.length === 0`. It has a two-step UI: icon + heading + copy + "Create Portfolio" CTA, which expands to an inline form (name + base_currency select). This is the ticket's designated content to relocate — not to redesign.
- No shared `EmptyState` component exists in the client yet; every panel currently in-lines its own empty text. This ticket is the first place a reusable pattern (icon/heading + one-line explanation + single CTA) would be introduced, matching the ticket's spec of "what it's for, what would fill it, one next action" per panel.
- Post-signup redirect: `client/src/pages/LoginPage.tsx` sends users to `/dashboard` (`window.location.href = "/dashboard"`) after signup, and `client/src/App.tsx` maps both `/portfolio` and `/dashboard` to `DashboardPage`. Today a new user therefore sees the welcome state on Portfolio, never Overview — this redirect must change to `/overview` for the acceptance criteria to hold.
- Related prior work: ARCA-17 (market overview panels, shipped) and ARCA-26 (card-detail wiring, in progress) touch some of the same data-fetch hooks (`usePolling`) feeding these panels — no changes to those hooks are in scope here, only what renders when they return empty.

## Approach
Smallest correct change: add a small reusable empty-state building block, wire each of the nine panels (and their zero-value `DataPanel` children) to use it when their underlying data is empty, move `EmptyState`/welcome content from `DashboardPage.tsx` to `OverviewPage.tsx`, and repoint the post-signup redirect.

Files to touch:
- `client/src/components/terminal/PanelEmptyState.tsx` (new) — small shared component: icon, one-line "what this is for", one CTA button/link.
- `client/src/pages/OverviewPage.tsx` — render the relocated welcome block above/around the panel grid when the user has no portfolio/holdings yet; pass empty-state copy + single CTA into each of the nine panels or their content components.
- `client/src/components/terminal/SetPerformancePanel.tsx`, `FxRatesPanel.tsx`, `GradingPremiumPanel.tsx`, `TopMoversPanel.tsx`, `NewsPanel.tsx`, `PriceChartPanel.tsx` — replace terse "No X data" strings with `PanelEmptyState` (explanation + CTA).
- The inline Portfolio/Market Stats/Market Intel content within `OverviewPage.tsx` (the three `DataPanel` children) — add a conditional empty branch using `PanelEmptyState` instead of rendering zero values.
- `client/src/pages/DashboardPage.tsx` — remove the `EmptyState` function and its render branch (lines ~101, 327–394); Portfolio page falls back to whatever non-welcome empty behavior is appropriate (e.g. a minimal "no portfolio" notice without the full welcome treatment, since welcome now lives on Overview only).
- `client/src/pages/LoginPage.tsx` — change post-signup redirect target from `/dashboard` to `/overview`.

## Tasks
- [ ] Create `PanelEmptyState` component (icon, explanation text, single CTA) for reuse across panels.
- [ ] Move the "Welcome to ARCA" block (heading, copy, create-portfolio CTA/form) from `DashboardPage.tsx` into `OverviewPage.tsx`, gated on the user having no portfolio/holdings.
- [ ] Remove the welcome/`EmptyState` render path from `DashboardPage.tsx` so Portfolio no longer shows it.
- [ ] Update `LoginPage.tsx` so post-signup navigation lands on `/overview` instead of `/dashboard`.
- [ ] Replace `SetPerformancePanel`'s "No set data available" with a `PanelEmptyState` explaining what set indices are and a CTA (e.g. browse/track sets).
- [ ] Replace `FxRatesPanel`'s "No FX data" with a `PanelEmptyState` explaining FX rates and a CTA (e.g. set base currency).
- [ ] Replace `GradingPremiumPanel`'s "No graded price data" with a `PanelEmptyState` explaining grading premiums and a relevant CTA.
- [ ] Replace `TopMoversPanel`'s "No gainers"/"No losers" with a `PanelEmptyState` explaining movers and a relevant CTA (collapse to one coherent message per panel, not two competing ones).
- [ ] Replace `NewsPanel`'s "No significant price movements" with a `PanelEmptyState` explaining alerts and a relevant CTA.
- [ ] Add an empty-state branch to `PriceChartPanel` for the no-card-selected / no-history cases using the same pattern (avoid three different ad hoc messages).
- [ ] Add empty-state branches to the Portfolio, Market Stats, and Market Intel — By Era `DataPanel` content in `OverviewPage.tsx` so they show a message + CTA instead of zero-valued numbers/empty tables.
- [ ] Verify the welcome block and the nine panel empty states read as one coherent screen (no duplicate/conflicting "get started" messaging).

## Validation gates
- [ ] happy path: a freshly signed-up user (no portfolio, no holdings) is redirected to `/overview` and sees the "Welcome to ARCA" block plus all nine panels in their empty-state form, each with distinct explanatory copy and exactly one CTA.
- [ ] happy path: an existing user with real data continues to see live panel content unchanged (empty-state branches only trigger when the underlying array/value is genuinely empty).
- [ ] edge cases: a user who has created a portfolio but has zero holdings still sees appropriate per-panel empty states (not the top-level welcome block, which is gated on true first-run) — Portfolio/Market Stats/Market Intel panels no longer render 0 / £0 / 0% as if it were real data.
- [ ] edge cases: `TopMoversPanel` and `PriceChartPanel`, which have more than one possible empty condition (gainers vs. losers; no card selected vs. no history), each collapse to a single coherent panel-level message rather than two conflicting sub-messages.
- [ ] errors: if a panel's data fetch fails (API error, not just empty), it is visibly distinguishable from the "no data yet" empty state (no silent fallback to empty-state copy that misrepresents an error as normal first-run absence).
- [ ] coverage: `grep` confirms `DashboardPage.tsx` no longer contains the "Welcome to ARCA" string or the `EmptyState` function.
- [ ] coverage: `grep` confirms every one of the nine panels (and the three `DataPanel`-based ones) has a `PanelEmptyState`/equivalent empty-state usage, and no panel in `OverviewPage.tsx` renders a hardcoded zero/placeholder value when its source array or object is empty.
- [ ] coverage: `LoginPage.tsx` post-signup redirect points at `/overview`, verified by reading the changed line.

<!-- foundry-ticket: e4fe9882f20c7d85 -->
