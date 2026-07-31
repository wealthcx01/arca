# PRP — app-wide-error-boundary

## Intent
When any page crashes, the founder and every user see a plain "something went wrong" message with a way back to a working page — never a blank screen.

## Context
- `client/src/App.tsx` — `Router()` does manual path-based routing (no React Router). It picks a `page` React node based on `window.location.pathname`, then renders `<Layout>{page}</Layout>`. This is the single place all routed pages funnel through, so it's the natural seam for a page-level boundary.
- `client/src/components/Layout.tsx` — renders the sticky header (logo, `RollingTicker`, theme/user menu) and the tab nav (`marketTabs`, `portfolioTabs`) unconditionally, then `<main>{children}</main>`. Per acceptance criteria, header/nav must survive a page crash — the boundary must wrap only the routed page content (the `children`/`page` node), not `Layout` itself.
- No error boundary exists anywhere in the client today (`grep` for `ErrorBoundary`/`componentDidCatch`/`getDerivedStateFromError` in `client/src` returns nothing) — confirms this is a from-scratch addition, not a bug fix to something partially built.
- `client/src/components/ui/Toaster.tsx` shows the existing pattern for a small client-side UI primitive (context + component, Tailwind classes using `var(--color-*)` tokens) — the new error-fallback component should follow the same styling conventions (`--color-background`, `--color-foreground`, `--color-muted-foreground`, `--color-primary`, `--color-border`, `--color-card`) already used in `Layout.tsx` and `App.tsx`'s loading state, for visual consistency.
- `client/src/pages/CardsPage.tsx` currently throws on fresh load (separate ticket, out of scope here) — it's useful as a real trigger to manually verify the boundary catches something, but fixing it is explicitly out of scope.
- React error boundaries must be class components (`componentDidCatch` / `static getDerivedStateFromError`) — there is no hooks-based equivalent — so this needs one new class component; everything else in the codebase is functional/hooks-based, which is an acceptable, necessary exception.

## Approach
Add one new class component, `ErrorBoundary`, and wrap the routed page node with it at the seam identified in `App.tsx`, leaving `Layout` unwrapped so header/nav keep rendering on crash.

Files to touch:
- `client/src/components/ErrorBoundary.tsx` (new) — class component implementing `getDerivedStateFromError`/`componentDidCatch`, rendering children normally, or a fallback UI on error: plain message ("Something went wrong loading this page."), a "Reload" button (`window.location.reload()`), and a link back to `/overview`. Logs the caught error via `console.error` in `componentDidCatch`, never renders the raw error/stack to the user.
- `client/src/App.tsx` — import `ErrorBoundary` and wrap `page` (not `Layout`) before/as it's passed to `Layout`, e.g. `<Layout><ErrorBoundary>{page}</ErrorBoundary></Layout>`. Key the boundary on `path` (or re-mount on navigation) so navigating away from a crashed page and back re-attempts rendering instead of staying stuck in the error state.

No routing library changes, no changes to individual page components, no monitoring/Sentry integration.

## Tasks
- [ ] Create `ErrorBoundary` class component with `getDerivedStateFromError` + `componentDidCatch` (logs via `console.error`, no raw stack shown to user)
- [ ] Build fallback UI: plain on-brand message, "Reload" action, link back to `/overview`, styled with the same `--color-*` tokens used elsewhere in `Layout.tsx`/`App.tsx`
- [ ] Wrap the routed `page` node in `App.tsx`'s `Router()` with `ErrorBoundary`, inside `Layout` so header/tab nav render outside the boundary
- [ ] Key/reset the boundary per route (e.g. `key={path}`) so navigating to a different page after a crash re-renders fresh rather than staying on the error screen
- [ ] Manually trigger the boundary (e.g. via the known-crashing `CardsPage`) and confirm header, ticker, and tab nav remain interactive while the page area shows the fallback

## Validation gates
- [ ] happy path: navigating between all main nav pages (Overview, Sets & Eras, News, Cards, Graded, Watchlist, Screener, Portfolio, Trades, Analytics, Import, Settings) with no thrown errors renders each page exactly as before — the boundary is inert when there's no crash
- [ ] edge cases: after a page-level crash, clicking a different nav tab or the logo successfully navigates to and renders a working page (boundary doesn't persist a stale error state across route changes)
- [ ] errors: triggering a real render error (e.g. loading `/cards` with its known crash) shows the plain fallback message instead of a blank screen, with the header, `RollingTicker`, and tab nav still visible and clickable, and the raw error/stack is not printed to the DOM (only to `console.error`)
- [ ] coverage: `ErrorBoundary` wraps the single routing seam in `App.tsx` that all `marketTabs`/`portfolioTabs`/detail routes pass through, so every main nav page and card-detail page is covered by one boundary instance, not per-page duplicates

<!-- foundry-ticket: 04c1e19293047552 -->
