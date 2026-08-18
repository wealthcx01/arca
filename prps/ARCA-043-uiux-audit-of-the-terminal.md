# PRP — ARCA-043-uiux-audit-of-the-terminal

## Intent
The founder gets a first-hand, evidence-backed map of every place ARCA fails or confuses a brand-new
user, delivered as a prioritized set of individually reviewable tickets rather than a wall of prose.

## Context
- This is a documentation/audit ticket, not a code-fix ticket — the acceptance criteria explicitly
  forbid fixing anything (`docs/tickets/ARCA-043-uiux-audit-of-the-terminal.md:45`). The deliverable
  is the audit itself plus the tickets it produces.
- The nav in `client/src/components/Layout.tsx:26-42` confirms the twelve routes named in the ticket:
  `/overview`, `/sets`, `/news`, `/cards`, `/graded`, `/watchlist`, `/screener` (market tabs), and
  `/portfolio`, `/transactions`, `/analytics`, `/import`, `/settings` (portfolio tabs) — plus card
  detail (`/cards/:id`) and `/login`, which sit outside the tab bar. Routing itself is a hand-rolled
  path switch in `client/src/App.tsx` (`function Router()`), already wrapped per-page in
  `<ErrorBoundary key={path}>` — worth confirming that boundary actually catches render crashes on
  each route rather than assuming ARCA-45 already covers it.
- The repo root `README.md` is the unmodified `bun init` stub (`bun install` / `bun run index.ts`)
  and does **not** match the real quick start documented in `/opt/foundry/lane/arca/CLAUDE.md`
  (`bun install`, `cd client && bun install`, `bun run db:push`, `bun run db:seed`,
  `seed-prices.ts`, `seed-analytics.ts`, `bun run dev`). The ticket says to follow "the README" from
  a clean state and note anything that doesn't work — this mismatch is itself the first finding to
  record, not something to silently work around by using CLAUDE.md instead.
- `docs/tickets/` already contains a founder-authored backlog through ARCA-050, including several
  tickets that plausibly overlap with what this audit would surface first-hand: ARCA-44 (seed script
  silent failure), ARCA-45 (app-wide error boundary, in progress), ARCA-46 (Overview welcome/empty
  states, in progress), ARCA-47 (sign-in tagline), ARCA-48 (synthetic price history), ARCA-50 (set
  name on card pages). These are pre-existing backlog items, not prior audit output — the ticket
  numbering convention (`docs/tickets/README.md`) assigns ids by "next free id after the highest
  already in the directory," so new findings start at ARCA-051 regardless of these. Where a finding
  during this audit duplicates one of these, note the duplicate and link to the existing ticket
  instead of re-filing it; only file a new ticket for what isn't already tracked.
- Auth is session-based (bcrypt + cookies) per CLAUDE.md, with routes at `/api/auth/*` and a
  `useAuth` hook (`client/src/hooks/useAuth.ts`, referenced from `Layout.tsx`) — signup/login is the
  first thing to exercise from a clean database.
- No existing browser-automation config for this repo; the `browse` skill (headless browser for QA)
  and `run` skill (launch + drive the app) are available in this environment and are the natural
  tools to drive the running app across the three required widths (1024/1280/375) and capture
  console errors and failed network requests.

## Approach
Run the audit as a real user session against a freshly-seeded local instance, recording findings as
they're found, then convert the findings into one ticket per finding under `docs/tickets/`, numbered
sequentially from the next free id (ARCA-051 onward) per the directory's convention. No application
code changes. Files touched:
- New files: `docs/tickets/ARCA-051-*.md`, `ARCA-052-*.md`, … one per finding, in the existing ticket
  format (`# ARCA-N — Title`, `**Status:** Todo`, `**Area:**`, `**Depends on:**`, `## Context`,
  reproduction steps, expected vs. actual).
- No edits to `docs/tickets/README.md` unless the numbering convention needs a clarifying note.
- Optionally a single audit summary (e.g. `docs/tickets/ARCA-043-audit-findings.md` or appended to
  the existing ARCA-043 ticket file) listing all routes visited, their state, the three-width notes,
  and the first-five-minutes judgement, with links to the tickets each finding produced — this is
  the artifact that proves the acceptance criteria were met.

## Tasks
- [ ] Follow the actual setup path from a clean state (`bun install`, client install, `db:push`,
      `db:seed`, price/analytics seed scripts, `bun run dev`), noting every step that fails, is
      undocumented, or diverges from the stub `README.md`.
- [ ] Create one fresh account through the real signup flow — no manual data seeding beyond the
      standard seed scripts.
- [ ] Visit all twelve nav routes plus `/login` and a card-detail page (`/cards/:id`) on the running
      instance; for each, record render success/failure, empty-state quality, any stuck
      loading/saving indicator, and console/network errors.
- [ ] Re-check each route at viewport widths 1024, 1280, and 375, noting clipping, overlap, or
      unreachable controls at each width (or explicitly note "no issues found" per width).
- [ ] Review the copy on every visited page for jargon, mismatched terminology, or borrowed
      third-party branding, and check whether numeric values are labelled clearly enough to trust.
- [ ] Form and record a first-five-minutes judgement: what a new user should be offered as the
      obvious next action, and whether ARCA currently offers it.
- [ ] Cross-check each candidate finding against the existing ARCA-044…050 backlog; drop or link
      duplicates instead of re-filing.
- [ ] File one ticket per remaining finding in `docs/tickets/`, ids starting at the next free number
      after the current highest, ordered/described so severity (blank/broken pages first) is evident
      from the set.
- [ ] Record any route, state, or width that could not be established, with the reason, rather than
      omitting it.
- [ ] Update `docs/tickets/ARCA-043-uiux-audit-of-the-terminal.md` status/content to reflect the
      audit's completion and link out to the findings, without adding any application code changes
      in this PR.

## Validation gates
- [ ] happy path: all twelve nav routes, `/login`, and at least one card-detail page were loaded on
      a real running instance seeded only via the documented scripts, with render outcome recorded
      for each.
- [ ] happy path: every recorded finding of "does not render" or "never resolves" has a corresponding
      ticket file in `docs/tickets/` with reproduction steps.
- [ ] edge cases: the fresh-account, zero-data empty state (not a pre-seeded/demo account) is what
      was actually audited on Overview and every other data-driven page.
- [ ] edge cases: findings are recorded for all three widths (1024/1280/375) on each route, or the
      audit explicitly states which route/width combination could not be checked and why.
- [ ] errors: console errors and failed network requests observed during the walkthrough are captured
      in the relevant finding tickets, not just visual/layout issues.
- [ ] errors: any setup-path failure (README mismatch, seed script issue, etc.) encountered before
      reaching the app is itself filed as a finding.
- [ ] coverage: the new ticket ids used are contiguous and start immediately after the current
      highest id in `docs/tickets/` (verify via `ls docs/tickets/` before and after).
- [ ] coverage: this PR's diff contains only `docs/` changes (new/updated ticket files) — no changes
      under `client/`, `modules/`, or other application source.

<!-- foundry-ticket: 0c9f308febc4a902 -->
