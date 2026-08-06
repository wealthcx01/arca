# ARCA-55 — Watchlist and Trades empty states have no clear call to action

**Status:** Planned · **Area:** Frontend/UX · **Depends on:** ARCA-13, ARCA-19

## Context
Filed from the ARCA-43 UI/UX audit — distinguishing "an empty state that explains itself" from "a
panel that is simply blank," per the ticket's scope. Compare against Overview and Portfolio, which
both do this well ("Welcome to ARCA... Create Portfolio" / "You don't have a portfolio yet. Go to
Overview to create one").

## What I did
Visited `/watchlist` and `/transactions` on a fresh, unseeded account.

## What happened
- `/watchlist`: left panel says "No watchlists yet" with a small unlabeled "+" icon in the panel
  header as the only way to act — no explanatory copy, and no visible button with a text label like
  Overview's "Create Portfolio." The right-hand cards table just says "Select a watchlist" beneath
  empty headers. Below both panels, roughly 600px of viewport (at 1280px height 800) is entirely
  blank.
- `/transactions`: "0 transactions" / "No transactions yet," with no CTA at all — no link to Import,
  no link to add a transaction from a portfolio, nothing explaining that a portfolio needs to exist
  first (the way Portfolio's empty state explicitly says "Go to Overview to create one").

## What I expected
Both empty states to name the next action in words, not rely on an icon-only affordance (Watchlist)
or say nothing at all (Trades) — consistent with how Overview and Portfolio already handle their
empty states.

## Repro steps
1. Sign up fresh, don't create a portfolio or watchlist.
2. Visit `/watchlist` — note the "+" icon is the only way to create one, with no text label.
3. Visit `/transactions` — note there's no CTA or explanation at all.

## Acceptance criteria
- [ ] Watchlist's empty state includes a labelled "Create Watchlist" action, not just an icon.
- [ ] Transactions' empty state explains the next action (e.g. link to Import or to creating a
      portfolio first).
