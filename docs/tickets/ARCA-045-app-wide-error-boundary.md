# ARCA-45 — App-wide error boundary for page crashes

**Status:** In progress · **Area:** Client/UI · **Depends on:** —

## Why this matters (for the founder)
Right now, if any page throws an error, the whole app goes to a blank screen with no message and no way back — that's a broken first impression and it erodes trust. This ticket makes crashes fail safely and visibly, with a way to recover.

## Context
Founder observed: opening the app fresh, the Cards page (a main nav item) rendered a completely blank screen. Browser console showed CardsPage threw an error, and React itself suggested adding an error boundary — meaning there's currently no error boundary anywhere in the client, so any component crash takes down the entire UI with zero user-facing feedback. This is a general React failure mode (uncaught render errors unmount the whole tree below the nearest boundary) — the fix is a standard React error boundary component, not something specific to Cards.

## Scope
- Add a top-level React error boundary wrapping the app's routed pages.
- On a page-level crash, show a plain, honest error message (not a blank screen) — e.g. "Something went wrong loading this page."
- Give the user a way back: a reload action and/or a link back to a working page (e.g. home/dashboard).
- Log the underlying error (console/existing logging) so it's diagnosable, without exposing raw stack traces to the user.
- Apply this boundary app-wide so any page (not just Cards) fails safely the same way.

## Out of scope
- Fixing the specific underlying bug that currently crashes CardsPage on fresh load (that's a separate bug ticket).
- Per-component (widget-level) error boundaries inside a page — this is page-level only.
- Error reporting/monitoring integration (e.g. Sentry) — just console/local logging for now.

## Acceptance criteria
- [ ] Opening the app fresh and hitting a page-level component error shows a plain, on-brand error message instead of a blank screen.
- [ ] The error screen offers a clear way back to a working part of the app (reload and/or home link).
- [ ] The error boundary wraps all main nav pages, not just Cards.
- [ ] The underlying error is still logged (console) for debugging.
- [ ] A crash on one page does not take down browser navigation or the nav bar itself.
