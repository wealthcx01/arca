# PRP — ARCA-058-mobile-nav-hides-most-tabs

## Intent
At phone width (375px), every one of the twelve primary nav destinations is reachable, and a user
can tell more destinations exist even before they scroll or tap.

## Context
- The tab bar lives in `client/src/components/Layout.tsx:145-191`: a `<nav className="overflow-x-auto ...">`
  wrapping a single `flex items-center` row that renders `marketTabs` (7 items, `Layout.tsx:26-34`),
  a divider, then `portfolioTabs` (5 items, `Layout.tsx:36-42`) — twelve links total, each
  `shrink-0`. There is no scroll shadow/fade, no arrow, and no logic that scrolls the active tab
  into view.
- `isActive(href)` (`Layout.tsx:61-65`) already computes which tab is current from
  `window.location.pathname` — this is the hook to use for "scroll active tab into view on load."
  Active tabs get `border-[var(--color-primary)] text-[var(--color-primary)]`; inactive get
  `border-transparent text-[var(--color-muted-foreground)]`.
  `client/src/components/Layout.tsx:156-160,179-183`.
  variables like `--color-card`, `--color-border`, `--color-muted-foreground` — reuse these, don't
  hardcode colors.
- `Layout` also renders a header with a `RollingTicker` (`Layout.tsx:88-91`) and a user menu that
  already implements a dropdown pattern with an overlay-click-to-close (`Layout.tsx:105-141`) — a
  useful reference for building a menu affordance (backdrop div + `onClick` to close, no external
  library).
- No existing hamburger/mobile-menu component exists anywhere in `client/src` (only Layout.tsx
  matches menu-related search terms) — this is new UI, not a variant of existing UI.
- Ticket ARCA-58 doc: `docs/tickets/ARCA-058-mobile-nav-hides-most-tabs.md`. Explicitly out of
  scope: desktop (1024+) nav changes, and the ticker's own truncation.
- Sibling ticket ARCA-43 (UI/UX audit) is the source of this finding; ARCA-59 (Market Intel column
  clipping at 1024px) is a separate, unrelated ticket from the same audit — do not conflate.
- Testing precedent: this repo has a Playwright e2e suite at `scripts/*.pw.ts`
  (`client/playwright.config.ts`, testDir `../scripts`, testMatch `**/*.pw.ts`), run via
  `bun run test:e2e -- scripts/<file>.pw.ts`. Existing specs (`scripts/cards-set-name.pw.ts`) show
  the pattern: sign up via `page.request.post("/api/auth/signup", ...)` in a `beforeEach`, then
  `page.goto(...)`. Playwright supports per-test viewport via `test.use({ viewport: { width, height } })`
  — use this to assert 375px behavior. There are no component/unit tests for `Layout.tsx` today.

## Approach
Smallest correct change that satisfies both acceptance criteria without touching desktop or the
ticker:
1. In `Layout.tsx`, add a visible scroll affordance on the tab bar at narrow widths — an edge fade/
   shadow (CSS gradient overlay, width-conditioned via a `sm:hidden`/media-query class) is the
   minimum bar; prefer pairing it with a collapsed menu button (hamburger/"More") below the desktop
   breakpoint that opens a dropdown/sheet listing all twelve destinations, styled after the existing
   user-menu dropdown pattern (`Layout.tsx:114-140`).
2. Add a `ref` + `useEffect` on the tab bar's scroll container that runs on mount (and on path
   change) to scroll the active tab (`isActive(tab.href)`) into view (`scrollIntoView({ inline: ... })`
   or manual `scrollLeft` calc), so a user on e.g. Settings doesn't land at the far-left edge.
3. Keep `marketTabs` / `portfolioTabs` data and `isActive` unchanged — this is a rendering/
   affordance change, not a navigation-structure change.
4. Do not touch `fullWidthPaths`, the `RollingTicker`, or any desktop (≥1024px) styling.

Files touched: `client/src/components/Layout.tsx` only. Possibly a new small e2e spec file under
`scripts/` (e.g. `scripts/mobile-nav.pw.ts`) following the existing `.pw.ts` pattern.

## Tasks
- [ ] Add a scroll-into-view effect for the active tab in the nav bar on mount/path change.
- [ ] Add a visible scroll affordance (edge fade/shadow and/or arrow) shown when the tab bar has
      overflow content, scoped to narrow (sub-1024px) widths only.
- [ ] Add a collapsed nav menu (hamburger/"More" button + dropdown or sheet) at narrow widths
      listing all twelve destinations, reusing the existing user-menu dropdown pattern
      (backdrop-click-to-close) for consistency.
- [ ] Verify desktop (≥1024px) nav rendering is visually unchanged (no affordance/menu button
      shown, tab bar renders as before).
- [ ] Verify the ticker's own truncation is untouched (out of scope, don't regress or fix it).

## Validation gates
- [ ] happy path: at 375px viewport width, a user on `/overview` can see a menu button or scroll
      affordance immediately, and opening it (or scrolling) reaches all twelve nav destinations
      (`marketTabs` + `portfolioTabs`) without guessing.
- [ ] happy path: at 375px viewport width, navigating directly to a tab near the end of the bar
      (e.g. `/settings`) scrolls that tab into view automatically on load — verified by checking
      the active link's bounding box is within the visible scroll container width.
- [ ] edge cases: at exactly the 1024px breakpoint boundary, the desktop tab bar (no affordance/
      menu) renders correctly and all twelve tabs remain reachable without scrolling, matching
      current (pre-change) behavior — confirms the narrow-width change doesn't leak into desktop.
- [ ] edge cases: if a mobile menu/sheet is added, opening it does not break the existing user-menu
      dropdown (`Layout.tsx:105-141`) — both can't visually collide or fight for the same overlay
      click-to-close handler.
- [ ] errors: if the active route doesn't match any tab (e.g. an unmapped path), the scroll-into-
      view effect does not throw and the nav bar renders at its default scroll position.
- [ ] coverage: a Playwright spec (new `scripts/*.pw.ts` file, following the `cards-set-name.pw.ts`
      sign-up-via-API pattern) sets `viewport: { width: 375, height: ... }` and asserts (a) a
      scroll-affordance or menu-button element is visible, and (b) each of the twelve nav hrefs is
      reachable/clickable from the page (via the menu, or via scrolling the container and checking
      `href` presence in the DOM).

<!-- foundry-ticket: 35e694eef0477e5f -->
