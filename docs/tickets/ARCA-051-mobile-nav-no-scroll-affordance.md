# ARCA-51 — At 375px, 8 of 12 nav items are off-screen with no visual cue that they're reachable

**Status:** Planned · **Area:** Frontend/UX · **Depends on:** ARCA-1

## Context
Filed from the ARCA-43 UI/UX audit's three-widths pass.

## What I did
Signed in and loaded `/overview` at 375px width, then inspected the nav bar's DOM/CSS directly via a
script (`getComputedStyle`) to confirm whether the off-screen items were truly unreachable or just
not visually indicated.

## What happened
At 375px, only "Overview," "Sets & Eras," "News," and "Cards" are visible in the primary nav, with
"Graded" clipped mid-word at the right edge. "Watchlist," "Screener," "Portfolio," "Trades,"
"Analytics," "Import," and "Settings" (7 of 12 items) are positioned off the right edge of the
viewport (confirmed via `getBoundingClientRect()` — e.g. "Settings" sits at x=918–1000 in a 375px-wide
viewport).

The nav container does have `overflow-x-auto` (confirmed via computed style), so these items are
reachable by scrolling/swiping the nav bar sideways — this is not a hard blocker. But there is no
visual affordance indicating this: no fade/gradient at the edge, no arrow/chevron, no scrollbar, and
"Graded" being cut off mid-word is easy to read as "that's the end of the list" rather than "keep
scrolling." A new mobile user has no reason to suspect 7 more routes exist unless they try swiping the
nav bar specifically (as opposed to the page body, which is the natural swipe target).

## What I expected
Some visible signal — a partial next-item peek with a fade edge, a scroll indicator, or a collapse
into a menu/hamburger pattern — that communicates "more nav items exist here."

## Repro steps
1. Sign in, set viewport to 375px wide.
2. Load `/overview`; observe the nav bar cuts off after "Cards"/"Graded" with no scroll cue.
3. Manually swipe/scroll the nav bar horizontally to confirm the remaining items are present but
   undiscoverable without that action.

## Acceptance criteria
- [ ] At 375px, some visible signal indicates additional nav items exist beyond the visible ones.
