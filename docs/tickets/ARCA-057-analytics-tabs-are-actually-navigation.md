# ARCA-57 — Analytics page's "Market / Screener / Portfolio" look like tabs but navigate away entirely

**Status:** Planned · **Area:** Frontend/UX · **Depends on:** ARCA-21

## Context
Filed from the ARCA-43 UI/UX audit while checking whether the Analytics route has sub-views.

## What I did
Visited `/analytics`, which shows a segmented control top-right reading "Market | Screener |
Portfolio" (Market active by default), styled like an in-page tab switcher. Clicked "Screener," then
separately clicked "Portfolio" from a fresh Analytics load.

## What happened
Both clicks navigate the whole app away from `/analytics` to `/screener` and `/portfolio`
respectively — the main nav bar's highlighted item changes too ("Screener"/"Portfolio" become active
instead of "Analytics"). There is no Analytics-scoped screener or portfolio view; "Screener" and
"Portfolio" here are just links to the same pages already reachable from the primary nav. Visually,
though, the control is indistinguishable from a real in-page tab switcher (compare to the genuine
in-page toggle on the Screener page itself: "Top Gainers | Top Losers | Most Expensive | Biggest
Movers," which does stay on the same page).

## What I expected
Either real Analytics-scoped sub-views for Screener/Portfolio analytics, or this control styled as
what it actually is (plain navigation), so it doesn't read as "switch view within Analytics" when it
actually means "leave Analytics."

## Repro steps
1. Sign in, visit `/analytics`.
2. Click "Screener" in the top-right segmented control — observe the URL and nav highlight change to
   the full Screener page, not a sub-view.
3. Repeat for "Portfolio."

## Acceptance criteria
- [ ] The Market/Screener/Portfolio control on `/analytics` either provides real in-page sub-views, or
      is visually distinguished from an in-page tab switcher (e.g. styled as plain links).
