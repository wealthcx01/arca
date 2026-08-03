# PRP — ARCA-043-uiux-audit-of-the-terminal

## Intent
The founder gets a written audit of what a brand-new user actually experiences in ARCA today —
every nav route walked on a real running instance, at three widths, with a ranked stack of
follow-on tickets (ARCA-44+) for whatever is broken, blank, or confusing. No product code changes.

## Context
- Ticket text lives at `docs/tickets/ARCA-043-uiux-audit-of-the-terminal.md` — the ticket body
  above is authoritative; this PRP does not add scope beyond it.
- The nav has 12 routes, hand-routed on `window.location.pathname` in `client/src/App.tsx`
  (no router library despite `@tanstack/react-router`/`react-router` being installed — see
  `docs/tickets/ARCA-036-client-routing.md`). Path → page mapping to walk:
  `/overview` (OverviewPage), `/sets` (SetsErasPage), `/news` (MarketNewsPage), `/cards`
  (CardsPage) and `/cards/:id` (CardDetailPage), `/graded` (GradedMarketPage), `/watchlist`
  (WatchlistPage), `/screener` (ScreenerPage), `/portfolio` (DashboardPage), `/transactions`
  (TransactionsPage — "Trades" in nav), `/analytics` (AnalyticsPage), `/import` (ImportPage),
  `/settings` (SettingsPage), plus `LoginPage` for unauthenticated state.
- `client/src/components/ErrorBoundary.tsx` wraps each page (keyed by path in `App.tsx:74`) — a
  route that fails will render the boundary's fallback rather than a blank white screen; the audit
  should note when this fallback fires vs. a true blank/hang.
- The top-level `README.md` is just the bun-init default (install + `bun run index.ts`) and does
  **not** match the real setup path. The real quick-start lives in `CLAUDE.md`: `bun install`,
  `cd client && bun install`, `bun run db:push`, `bun run db:seed`, `bun run
  scripts/seed-prices.ts`, `bun run scripts/seed-analytics.ts`, `bun run dev` (backend :3001,
  frontend :5173, see `package.json` scripts). The ticket says "follow the README from a clean
  state" and "note anything in that path that does not work" — the README/CLAUDE.md mismatch is
  itself a finding to file, not something to silently paper over by just using CLAUDE.md.
- `docs/tickets/overview-welcome-empty-states.md` (status: In progress) already identifies
  Overview's nine blank panels and a founder policy: **ARCA never shows fake/demo data to fill
  empty states**. The audit should note where this work already lands vs. where gaps remain, not
  re-file it as new.
- `client/e2e-playwright.pw.ts` and `playwright.config.ts` exist at the repo root/scripts —
  Playwright is present but this audit is manual/exploratory (a human-driving-the-app record), not
  a new automated test suite; ARCA-42 (`docs/tickets/arca-042-analytics-test-coverage.md`) is the
  separate ticket for automated e2e coverage.
- `docs/tickets/README.md` sets the filing convention: one file per ticket in `docs/tickets/`,
  header format `# ARCA-N — Title`, a `**Status:**` field, `**Depends on:**` ids, one ticket = one
  branch = one PR going forward (this audit itself does not need to follow that for filing findings
  — filing is part of this same PR per the ticket).
- The `browse` skill (headless-browser QA) is the mechanism available in this environment for
  actually driving the running app and capturing console/network errors at specific viewport
  widths; `qa-only`/`design-review` skills are report-only variants worth checking but are not a
  substitute for walking the ticket's specific route list and viewport list.

## Approach
No application code changes. The work is: get the app running from a clean state, create one fresh
account with no manual seeding beyond what the ticket allows, drive all 12 nav routes plus card
detail and login through the `browse` skill (or equivalent live-driving) at widths 1024 / 1280 /
375, record render state / empty-state quality / stuck-loading / console+network errors / copy
quality at each stop, then write the findings as new files in `docs/tickets/` numbered ARCA-044
upward, ordered by first-impression damage, plus update
`docs/tickets/ARCA-043-uiux-audit-of-the-terminal.md`'s status.

Files touched:
- New: `docs/tickets/ARCA-044-*.md`, `ARCA-045-*.md`, … one per finding (exact count and names
  depend on what the audit surfaces).
- Edit: `docs/tickets/ARCA-043-uiux-audit-of-the-terminal.md` — status update once the audit is
  filed (no scope/content changes to the ticket body itself).
- No other files change. If the README setup path is broken, that becomes a filed finding
  ticket (e.g. proposing a README fix), not a direct edit here — "do not fix anything in this
  ticket" applies to the app and to the README.

## Tasks
- [ ] Stand up the app from a clean state following `README.md`, recording every step that fails
      or diverges from `CLAUDE.md`'s quick start.
- [ ] Create one fresh account through the real signup flow; do not manually seed portfolio/user
      data.
- [ ] Walk `/overview`, `/sets`, `/news`, `/cards`, a `/cards/:id` detail page, `/graded`,
      `/watchlist`, `/screener`, `/portfolio`, `/transactions`, `/analytics`, `/import`,
      `/settings`, and the login page — one pass each — recording render success/failure, empty-
      state quality, stuck loading/saving states, and console/network errors.
- [ ] Re-check each route at viewport widths 1024, 1280, and 375, recording clipping, unreachable
      controls, or overlap — or explicitly note if a route was not re-checked at a given width and
      why.
- [ ] Review copy across all visited pages for collector-recognizable language, unlabeled numbers,
      and any wording that reads as borrowed from another product.
- [ ] Form a first-five-minutes judgement: is there an obvious next action from a standing start,
      and what specific thing should a new user be offered instead if not.
- [ ] File one ticket per finding in `docs/tickets/`, numbered from ARCA-044 upward, each with
      what was done / what happened / what was expected / repro steps, ordered by first-impression
      damage.
- [ ] Explicitly record any route, state, or width that could not be established, rather than
      omitting it.
- [ ] Update `docs/tickets/ARCA-043-uiux-audit-of-the-terminal.md` status; open the PR containing
      only the new/updated ticket files (no application code diffs).

## Validation gates
- [ ] happy path: all 12 nav routes + card detail + login were reached on a real running instance
      from a freshly created, unseeded account, and each has a recorded render/empty-state/error
      observation.
- [ ] edge cases: findings are recorded at all three widths (1024, 1280, 375) for each route, or
      the PR states explicitly which route/width combinations could not be checked and why.
- [ ] errors: every route that renders blank, throws to the `ErrorBoundary`, or shows a
      loading/saving state that never resolves has its own numbered ticket in `docs/tickets/`
      describing repro steps.
- [ ] coverage: the PR diff contains only `docs/tickets/` additions/edits (new ARCA-044+ files plus
      the ARCA-043 status update) — no `client/`, `modules/`, `db/`, or other application-code
      changes — and includes the first-five-minutes judgement with a specific recommended next
      action.

<!-- foundry-ticket: 0900d8af0262246a -->

<!-- foundry-ticket: 0900d8af0262246a -->
