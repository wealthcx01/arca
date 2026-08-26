# ARCA-58 — At 375px, 7 of 12 nav destinations are hidden with no scroll affordance

**Status:** In progress · **Area:** Client/UI · **Depends on:** —

## Why this matters (for the founder)
At phone width, more than half the product's primary navigation is invisible and there is nothing
on screen suggesting it's reachable by scrolling sideways. A mobile visitor sees Overview, Sets &
Eras, News, Cards, and a sliver of "Gr..." (Graded) — Watchlist, Screener, Portfolio, Trades,
Analytics, Import, and Settings are all off-screen with no arrow, fade, or scroll hint.

## Context
Found during the ARCA-43 UI/UX audit, checking all routes at the required 375px width.

**What happened:** the tab bar (`client/src/components/Layout.tsx:146-191`) is a flex row inside a
`overflow-x-auto` container with no visual scroll indicator. At 375px viewport width, the visible
tabs cut off mid-icon after "Graded" — everything after it (Watchlist, Screener, the divider,
Portfolio, Trades, Analytics, Import, Settings) requires a horizontal swipe/scroll a user has no
reason to attempt, since nothing about the cut-off edge signals more content is there. The same
truncation affects the header's rolling ticker.

**Expected:** on a phone-width screen, either all nav destinations are reachable through an obviously
scrollable/collapsible control (e.g. a hamburger/menu affordance, visible scroll shadow, or a
condensed mobile nav), or the tab bar wraps.
**Actual:** most of the product is undiscoverable at 375px unless the user already happens to guess
that the header scrolls sideways.

**Reproduce:** open the app at a 375px viewport width (e.g. browser dev tools device toolbar), sign
in, look at the tab bar — count how many of the twelve labels are visible without scrolling.

## Scope
- Add a mobile-appropriate nav pattern at narrow widths: a visible scroll affordance (edge fade/
  shadow + arrow) at minimum, ideally a proper collapsed/hamburger menu listing all twelve
  destinations.
- Ensure the active tab (whichever page you're on) is scrolled into view automatically on load, so
  users on, say, Settings aren't dropped at the start of the bar with no indication where they are.

## Out of scope
- Any redesign of the desktop (1024+) nav — it fits without scrolling and isn't in scope here.
- The ticker's own truncation at narrow widths — cosmetic, secondary to primary navigation.

## Acceptance criteria
- [ ] At 375px width, a new user can identify that more nav destinations exist beyond what's
      initially visible (scroll affordance, menu button, or equivalent).
- [ ] All twelve nav destinations remain reachable at 375px width without guessing.
