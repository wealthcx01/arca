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
One ticket per finding, in `docs/tickets/`, each taking the next free id after the highest already in
the directory — do not reuse a fixed starting number. Each one states what you
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

## Audit findings (completed 2026-08-18)

### How it was run
Ran the app locally (`bun run dev`, backend on :3001, frontend on :5173) against the repo's existing
dev database — market-wide data (cards, prices, OHLC) was already seeded via the documented scripts
from a prior session. No portfolio/watchlist/transaction data was seeded for the audit account — a
brand-new account was created through the real signup form (`audit+<random>@example.com`) and driven
with Playwright (headless Chromium) as a real browser session, since no interactive browser tool was
available in this environment. Console errors, failed network requests (4xx/5xx and aborted
requests), and full-page screenshots were captured for every route at three viewport widths: 1024,
1280, 375.

**Setup path:** the root `README.md` does not match the real quick start — see ARCA-52. The
documented analytics seed script (`bun run scripts/seed-analytics.ts`) crashes in its own
summary-printing code after a successful run, and takes several minutes with coarse progress
reporting — see ARCA-56, which also documents how an interrupted run of that script leaves the
Analytics page showing a badly incomplete, misleading market index with no indication anything is
wrong (observed directly: the existing dev DB had `card_analytics` for 1 of 502 cards before a full
re-run fixed it to 808).

### Route-by-route (all three widths unless noted)
| Route | Renders? | Notes |
|---|---|---|
| `/login` | Yes | Bloomberg/Pokémon tagline — already tracked as ARCA-47, not refiled. |
| `/overview` | Yes | Good empty state (ARCA-46 already shipped: Welcome + per-panel explanations, no fake data). Market Intel panel clips at 1024 — ARCA-59. |
| `/sets` | Yes | Renders full era/set list and detail panel correctly at all widths. |
| `/news` | Yes (no crash) | Shows Price Alerts + a hardcoded release calendar, not news — the real news module/API is unused — ARCA-55. |
| `/cards` | **No — crashes on every load, all widths** | ARCA-51 (most severe finding). |
| `/graded` | Yes | Renders correctly. Grading-alpha ROI% values look implausible (e.g. +7738%) — this is the synthetic-price-history issue already tracked as ARCA-48, not refiled. |
| `/watchlist` | Yes | Minimal but functional empty state ("No watchlists yet" + create action). |
| `/screener` | Yes | Empty state present ("No data matching filters") for a zero-data account. |
| `/portfolio` | Yes | Correct empty state, links to Overview to create a portfolio (matches ARCA-46's intent). |
| `/transactions` | Yes | "No transactions yet" empty state. |
| `/analytics` | Yes | See ARCA-56 for the coverage/seed issue behind what this page shows. |
| `/import` | Yes | CSV drop-zone renders; "WhatNot exports" is a real third-party marketplace reference, not borrowed branding — not a finding. |
| `/settings` | Yes (no crash) | API-key list silently fails to load + spams a misleading error toast — ARCA-54. Sync-source counts always read 0 despite active data — ARCA-57. |
| `/cards/:id` (card detail) | Yes (no crash) | Loads but shows **no card name, no set, no image** on every card — ARCA-53. A truly nonexistent card id is handled gracefully ("Failed to load card" + back link) — not a finding. |

Console errors and failed network requests were observed only on `/cards`, `/settings`, and
`/cards/:id` — captured in ARCA-51, ARCA-53, ARCA-54 respectively. The other nine routes were clean
at all three widths.

### Widths
- **1280:** baseline, used as the reference render for every route above.
- **1024:** all routes match 1280 except the Overview Market Intel panel's VALUE column, which clips
  — ARCA-59.
- **375:** all routes render their page content correctly, but the primary nav bar itself hides 7 of
  12 destinations with no scroll affordance — ARCA-58. No other width-specific clipping/overlap found
  beyond what's noted above (the Settings toast-overlap issue is folded into ARCA-54 since it's the
  same root cause, worse at narrow widths).

### Copy / trust
- Sign-in tagline borrows Bloomberg/Pokémon branding — already tracked (ARCA-47).
- "News" nav item doesn't show news — ARCA-55.
- Pricing Sources panel's "0 cards synced" reads as a broken integration when the integration is
  actually working — ARCA-57.
- Numeric labelling elsewhere (money in cents formatted correctly via `formatMoney`, per-source
  currency shown alongside conflated USD figures on card detail) was accurate and clearly sourced
  where the page rendered at all.

### First five minutes
A brand-new signup lands on Overview, which (thanks to ARCA-46, already shipped) does the right
thing: a "Welcome to ARCA" message, one clear primary action ("+ Create Portfolio"), and every other
panel explains what it's for instead of sitting blank. That's a good first five minutes — **as long
as the user stays on Overview.** The moment they click the second item in the nav bar, "Cards" (the
card catalog — the single most natural thing to explore next on a market terminal for something you
don't yet own), the app crashes to an error screen (ARCA-51). The specific thing a new user should be
offered, beyond what already exists, is a working card catalog: browsing/searching cards is the most
obvious next action after "create a portfolio," and it's currently the one dead end in the front door.

### What could not be established
- The BYOK "Add API Key" save flow (`POST /pricing/keys`) was not exercised end-to-end with a real
  provider key, since the existing-keys list never loads (ARCA-54) and no test API key was available;
  noting this rather than guessing at its behavior.
- Whether `market_news` content, once populated, would display anywhere in the product — the table is
  currently empty in this environment, so only the absence of a UI consumer (ARCA-55) could be
  confirmed, not what rendering it would look like.

### New findings filed
ARCA-51 (Cards page crashes, all widths) · ARCA-52 (README doesn't match real setup) · ARCA-53 (card
detail shows no name/set/image) · ARCA-54 (Settings API-key list broken + error-toast spam) · ARCA-55
(News tab shows alerts, not news) · ARCA-56 (seed-analytics crashes + silent partial-state risk) ·
ARCA-57 (Pricing Sources always show 0 synced) · ARCA-58 (mobile nav hides most destinations) ·
ARCA-59 (Overview panel clips at 1024px). Cross-checked against ARCA-44 through ARCA-50; no
duplicates were refiled — the Bloomberg/Pokémon tagline (ARCA-47) and synthetic price history
(ARCA-48) were both re-observed during the walkthrough and are linked above instead of refiled.
