# ARCA-43 — Audit the terminal's interface and file what is broken or missing

**Status:** Shipped · **Area:** Frontend/UX · **Gate:** pr · **Depends on:** —

## Context
Nobody has looked at ARCA the way a new user meets it: sign up, land, and try to get somewhere. The
tests cover the maths and the holdings engine. They do not cover whether the product is
comprehensible, whether every page renders, or what a person sees on their first visit before any
data exists.

This ticket is the audit itself. Work it on the box, drive the running app, and file what you find.

## Scope

**Get it running and use it as a new user would.** Follow the README from a clean state — note
anything in that path that does not work, because that is a finding too. Create a fresh account. Do
not seed yourself special data; the empty state is the state every new user starts in and it is part
of what is being audited.

**Walk every route.** There are twelve in the nav — Overview, Sets & Eras, News, Cards, Graded,
Watchlist, Screener, Portfolio, Trades, Analytics, Import, Settings — plus card detail and login. On
each one, record:
- Does it render at all? A blank page or an unhandled error is the most serious class of finding.
- What does it say when there is no data? Distinguish an *empty state that explains itself* from a
  panel that is simply blank.
- Does anything claim to be loading, saving or working, and never finish?
- Console errors and failed network requests.

**Look at it at three widths** — 1024, 1280 and 375. Note anything clipped, unreachable, or
overlapping. A laptop width is the one most people use; do not only check the extremes.

**Read the words.** Is the copy something a collector would recognise, or is it internal shorthand?
Is any of it borrowed from another company's product? Are numbers labelled well enough to be
trusted?

**Judge the first five minutes.** From a standing start, is there an obvious next action? If a new
user would not know what to do, that is the most valuable finding on the list.

## How to file what you find
One ticket per finding, in `docs/tickets/`, numbered from ARCA-44 upwards. Each one states what you
did, what happened, what you expected, and how to reproduce it. Order the set by what would most
damage a first impression.

**Do not fix anything in this ticket.** The audit is the deliverable; the fixes are the tickets it
produces, worked separately so each is reviewable on its own.

Anything you could not establish — a page you could not reach, a state you could not reproduce — say
so explicitly rather than leaving it out.

## Acceptance criteria
- [x] Every route in the nav has been visited on a real running instance and its state recorded.
- [x] Every page that fails to render, or shows a state that never resolves, has its own ticket.
- [x] Findings at 1024 / 1280 / 375 are recorded, or their absence stated.
- [x] A judgement on the first five minutes, with the specific thing a new user should be offered.
- [x] No fixes in this PR — only the audit and the tickets it produced.

## Audit results

Ran the app from a clean checkout (`bun install`, `cd client && bun install`, `bun run dev` — the
server, database, and price/analytics seed data were already present in this environment from prior
work; the README/setup-path finding below is filed regardless since the ticket asks to note it).
Signed up one fresh account (`audit-user-arca43@example.com`) via the real signup form, added no
portfolio, watchlist, or transactions. Walked all 12 nav routes, card detail, and the login/signup
screen using a scripted Playwright session (the `browse` skill wasn't available in this environment —
see below) at 1280×800 (primary pass: full page text, console errors, and failed network requests
recorded for every route), then re-screenshotted every route at 1024×900 and 375×900.

**Findings filed, most first-impression-damaging first:**
- ARCA-44 — `/cards` (a top-level nav item, and the target of Overview's own "Browse the catalog"
  CTA) crashes to the error boundary for every user, on every load, at all three widths.
- ARCA-45 — Card detail pages silently render with no card name, set, or image (same class of bug as
  ARCA-44, but doesn't error — just shows blank identity).
- ARCA-46 — Top Movers / Gainers / Alerts show the same card twice at two different prices
  (Overview, News, Screener all affected); root-caused to unduplicated rows in
  `/api/market/movers` and `/api/market/alerts`.
- ARCA-47 — The "News" nav item shows no actual news; it reuses the Price Alerts table and a release
  calendar hardcoded as a fake, static array in the client source.
- ARCA-48 — `GET /api/pricing/keys` is unreachable due to a route-ordering bug (shadowed by an
  earlier `/:cardId` wildcard route), so Settings can never list saved API keys; surfaces as stray
  "No prices found for this card" toasts that, at 375px, cover the Save Key button.
- ARCA-49 — Analytics' market index shows implausible, unlabeled numbers ("Cards Tracked: 1",
  "Market Cap: US$9.45") that contradict Overview's "502 total / 439 priced" for the same account.
- ARCA-50 — A garbled, overlapping numeral label renders in the bottom-left corner of the price chart
  on both Card Detail and Analytics, at all three widths.
- ARCA-51 — At 375px, 8 of 12 nav items sit off-screen; the nav scrolls horizontally but gives no
  visual cue that more items exist.
- ARCA-52 — Card Detail's price tables clip at 375px with no scroll handling.
- ARCA-53 — "Market Intel — By Era" values crowd/touch the panel edge at 1024 and 1280px (not just
  the narrow width).
- ARCA-54 — Top-level `README.md` is the unmodified `bun init` default and does not describe the real
  setup path (client install, db:push/seed, seed scripts, `.env`, `bun run dev`) — that only lives in
  `CLAUDE.md`. A contributor following only the README cannot start the app.
- ARCA-55 — Watchlist and Trades empty states give no clear, labelled call to action (contrast with
  Overview/Portfolio, which do this well).
- ARCA-56 — The Portfolio nav route can't create a portfolio itself; it only links back to Overview.
- ARCA-57 — Analytics' "Market / Screener / Portfolio" control looks like an in-page tab switcher but
  actually navigates away to the standalone Screener/Portfolio pages.

**Routes that rendered cleanly with a self-explaining empty state, no errors, at all three widths:**
Overview, Sets & Eras, Graded, Screener, Portfolio (aside from ARCA-56's indirection), Import, and
the Login/Signup screen. These are not filed as findings.

**Copy review:** No wording was found that reads as borrowed from another company's product (Import's
mention of "WhatNot exports" is a genuine reference to a real third-party CSV format ARCA supports,
not copied UI copy). Numbers were generally well-labelled except where noted in ARCA-48/49/46.

**First five minutes judgement:** Overview itself gets this right — "Welcome to ARCA... Create your
first portfolio to get started" with a single obvious "Create Portfolio" button is exactly the kind
of unambiguous next action a brand-new, empty account needs. The audit's most important finding is
that the *second* natural action — browsing the card catalog, which Overview itself offers via
"Browse the catalog" — leads directly into the ARCA-44 crash. **The specific thing a new user should
be offered instead:** a working `/cards` catalog reachable from Overview's own CTA, since right now
the app's best-designed onboarding moment hands the user a broken page one click later.

**What could not be established (explicitly recorded per the ticket's instruction):**
- The `browse` skill (the environment's normal headless-browser QA tool) returned an immediate
  `Execute skill: browse` error with no further detail in this environment, as did `connect-chrome`.
  Substituted a direct Playwright session (via `client/node_modules/playwright`, launched with
  `node`) driving the same running dev server, so the routes/widths/console/network coverage below
  is equivalent, but this substitution is worth noting as environment friction in its own right.
- CSV import's actual upload/parse behavior was not exercised (only the empty drop-zone state was
  observed) — uploading a file would create transaction data, which the ticket asks not to do beyond
  the real signup flow.
- Adding a transaction, watchlist, or portfolio holding was intentionally not tested, per "do not seed
  yourself special data" — so the *non-empty* states of Portfolio, Trades, and Watchlist (charts,
  P&L, holdings tables) were not observed and are not covered by this audit.
- Password/email validation error paths on login/signup (e.g. wrong password, duplicate email) were
  not exercised — only the successful signup path was walked.
