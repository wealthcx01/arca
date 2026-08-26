# PRP — ARCA-062-arca-brand-redesign

## Intent
Give ARCA a premium-terminal visual identity — logo, palette, typography, and a restyled UI — that visibly ties its "premium" feel to ARCA's real data edge (ARCA Score, grading alpha, market coverage), with zero change to app behavior.

## Context
- Brand direction (`context/sell/arca-brand-positioning`, decided 2026-08-03): premium is *earned* through data, not applied as decoration. Palette/type/logo choices must trace back to something ARCA actually proves (Score, grading alpha, coverage) — this needs to show up in the rationale doc, not just be asserted.
- Market note (`context/sell/market-note-terminal-wedge`): positioning is a serious trading terminal for graded-card flippers, competing against Card Ladder ($150/yr institutional) and Market Movers ($10/mo hobbyist) — the visual bar is "terminal," not "app."
- Current baseline, confirmed by direct inspection:
  - Tailwind CSS v4, CSS-first config, no `tailwind.config.js`. All tokens live in `client/src/index.css` under `@theme {...}` (Pearl/light) and `.dark {...}` (Diamond/dark) blocks, already labeled "ARCA Design System — Diamond & Pearl Themes." Current primary: `#b04a82` (Pearl) / `#4a8fe7` (Diamond); positive/negative `#16a34a`/`#dc2626` and `#34d399`/`#f87171`.
  - Theme toggle + persistence: `client/src/components/Layout.tsx` (`useTheme()`, localStorage key `arca-theme`), plus a pre-paint inline script in `client/index.html`.
  - Typography is declared (`font-family: "Geist", "Inter", system-ui...` in `client/src/index.css`) but never loaded — no `@font-face`, no font files, no CDN link — so it silently falls back to `system-ui` today. This is a real bug the redesign must fix, not preserve.
  - No logo/brand mark exists anywhere. `client/index.html` favicon still points at the default `client/public/vite.svg`. The "ARCA" wordmark in `Layout.tsx` (~lines 79–86) is plain text plus a "BETA" badge span.
  - No shared UI primitive layer. `client/src/components/ui/` only has `Skeleton.tsx` and `Toaster.tsx`. Every feature component (`terminal/DataPanel.tsx`, `terminal/DataTable.tsx`, `terminal/QuoteBox.tsx`, `terminal/PriceCell.tsx`, plus `analytics/`, `cards/`, `portfolio/`, `pricing/`) hand-rolls Tailwind classes, mostly via `var(--color-*)` arbitrary values, not a shared Button/Card/Table/Badge.
  - Charts are theme-inconsistent: `client/src/components/charts/types.ts` (~lines 42–61) hardcodes literal hex per theme fed to lightweight-charts (not driven by CSS vars), and `CandlestickChart.tsx` / `IndicatorPane.tsx` hardcode an `INDICATOR_COLORS` map. Recharts usage (e.g. `analytics/PopReportChart.tsx`) already consumes `var(--color-*)` and is theme-reactive.
  - 14 pages under `client/src/pages/` are the restyle surface: `OverviewPage`, `SetsErasPage`, `MarketNewsPage`, `CardsPage`, `CardDetailPage`, `GradedMarketPage`, `WatchlistPage`, `ScreenerPage`, `DashboardPage`, `AnalyticsPage`, `ImportPage`, `SettingsPage`, `TransactionsPage`, `LoginPage`.
  - Regression net: Playwright suites in `scripts/` (`e2e-playwright.pw.ts`, `cards-set-name.pw.ts`, `card-detail-identity.pw.ts`, `analytics-coverage.pw.ts`), config at `client/playwright.config.ts`, wired into CI per ARCA-66. These assert on DOM/selectors, not visuals — they are the functional-regression check, not a style check.

## Approach
Smallest correct change: redesign at the token + primitive layer so restyling every page is a consequence of the new tokens, not 14 separate rewrites.
- Design tokens: replace the Pearl/Diamond palettes and add real typography loading in `client/src/index.css` (`@theme` and `.dark` blocks) — keep the same CSS-variable names (`--color-background`, `--color-primary`, `--color-positive`, `--color-negative`, `--color-chart-1..5`, etc.) so every existing `var(--color-*)` reference across the app repaints automatically without touching those call sites.
- Typography: either self-host/`@font-face` the declared fonts or pick fonts that actually load, and fix the dead font-family declaration.
- Logo: add an SVG brand mark + favicon, replace the plain-text "ARCA" wordmark in `client/src/components/Layout.tsx` and the favicon reference in `client/index.html`.
- Charts: fix `client/src/components/charts/types.ts` DIAMOND/PEARL objects and the `INDICATOR_COLORS` maps in `CandlestickChart.tsx`/`IndicatorPane.tsx` to derive from the new palette, so lightweight-charts stops drifting from the CSS-var-driven rest of the UI.
- Shared primitives: introduce (or lightly extend) `client/src/components/ui/` with the small set of primitives actually reused across pages (button, panel/card shell, badge, table shell) only insofar as needed to apply the new identity consistently — not a full design-system rebuild.
- Page sweep: after tokens/primitives/logo land, walk the 14 pages and the `terminal/`, `analytics/`, `cards/`, `portfolio/`, `pricing/` component folders for any hardcoded hex or non-token Tailwind colors that would fight the new palette.
- Rationale doc: a short design-rationale artifact (palette, type system, logo usage) that explicitly states which choice maps to which data-credibility signal (Score, grading alpha, coverage) — this is an acceptance criterion, not a nice-to-have.
- No touching: route logic, data fetching, handlers, schema, or any `modules/` backend code — this ticket is UI/visual only.

## Tasks
- [ ] Design and add an ARCA logo/brand mark (SVG) plus updated favicon
- [ ] Replace the plain-text wordmark in `client/src/components/Layout.tsx` with the new logo
- [ ] Redefine the Pearl and Diamond palettes in `client/src/index.css` (`@theme` / `.dark`) under the new premium-terminal direction, preserving existing variable names
- [ ] Load the chosen typography for real (font files or verified CDN) and fix the currently-dead `font-family` declaration
- [ ] Update `client/src/components/charts/types.ts` DIAMOND/PEARL chart color objects and the `INDICATOR_COLORS` maps in `CandlestickChart.tsx` / `IndicatorPane.tsx` to match the new palette
- [ ] Add/extend minimal shared UI primitives in `client/src/components/ui/` for consistent restyling (button, panel/card, badge, table shell)
- [ ] Sweep all 14 pages and feature component folders (`terminal/`, `analytics/`, `cards/`, `portfolio/`, `pricing/`) for hardcoded/non-token colors and update them to the new tokens
- [ ] Write the design-rationale note tying palette/type/logo choices to ARCA's data credibility (ARCA Score, grading alpha, market coverage)
- [ ] Run the full Playwright suite against both light (Pearl) and dark (Diamond) themes and confirm no functional regressions

## Validation gates
- [ ] happy path: every one of the 14 pages in `client/src/pages/` renders with the new logo, palette, and typography in both Pearl and Diamond themes, with the theme toggle in `Layout.tsx` still switching correctly
- [ ] edge cases: lightweight-charts (candlestick, indicator panes) and recharts visuals match the new palette in both themes — no leftover hardcoded hex from `charts/types.ts`, `CandlestickChart.tsx`, or `IndicatorPane.tsx` clashing with the new tokens
- [ ] errors: no missing-font fallback to unstyled `system-ui` (typography actually loads, checkable via network/font-face inspection) and no broken favicon/logo asset path (checkable via 404s in dev server console)
- [ ] coverage: the full Playwright suite (`e2e-playwright.pw.ts`, `cards-set-name.pw.ts`, `card-detail-identity.pw.ts`, `analytics-coverage.pw.ts`) passes unchanged post-restyle, proving the visual change introduced no functional/DOM regression; the design-rationale doc exists and explicitly names ARCA Score, grading alpha, and market coverage as the basis for the premium treatment

<!-- foundry-ticket: fb8a95522a7eb0bf -->
