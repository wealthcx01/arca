# ARCA-56 — Portfolio nav route can't create a portfolio itself; it just points back to Overview

**Status:** Planned · **Area:** Frontend/UX · **Depends on:** ARCA-13

## Context
Filed from the ARCA-43 UI/UX audit. Minor friction finding, included for completeness per the
ticket's instruction to record every route's empty state.

## What I did
Visited `/portfolio` (nav label "Portfolio") on a fresh, unseeded account.

## What happened
The page shows only: "You don't have a portfolio yet. Go to Overview to create one." — a text link
back to `/overview`, where the actual "Create Portfolio" button lives. Clicking "Portfolio" in the nav
(a reasonable first click for a new user looking to start tracking a collection) leads to a dead end
that requires a second hop back to a different page to do anything.

## What I expected
The Portfolio page to offer its own "Create Portfolio" action inline, matching the action already
built for Overview, rather than only linking elsewhere.

## Repro steps
1. Sign up fresh, don't create a portfolio.
2. Click "Portfolio" in the nav.
3. Observe the only option is a link back to `/overview`.

## Acceptance criteria
- [ ] `/portfolio`'s empty state lets a user create a portfolio without leaving the page.
