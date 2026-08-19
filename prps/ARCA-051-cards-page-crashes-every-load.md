# PRP — ARCA-051-cards-page-crashes-every-load

## Intent
Every signed-in user can open the Cards tab and see the paginated card catalog with a correct
total count — no crash, no ErrorBoundary fallback — and that guarantee is locked in by a
regression check so it can't silently regress again.

## Context
- The crash as originally reported (`TypeError: Cannot read properties of undefined (reading
  'toLocaleString')` at `client/src/pages/CardsPage.tsx:163`) was caused by `CardsPage.tsx` reading
  `res.total` when the real API shape from `GET /api/cards` is `{ data: [...], pagination: { page,
  limit, total, totalPages } }` (confirmed in `modules/cards/handlers.ts:64-86`).
- **This is already fixed on this branch/master.** Commit `b9cd3ea` (ARCA-050, "show set name on
  card pages") incidentally touched the same lines and changed `CardsPage.tsx` to type the response
  as `{ data: Card[]; pagination: { total: number } }` and read `res.pagination.total` (see
  `client/src/pages/CardsPage.tsx:61-66`). Diffing `git show b9cd3ea -- client/src/pages/CardsPage.tsx`
  confirms the exact `res.total` → `res.pagination.total` change is in place. There is no remaining
  crash to fix in this file.
- Per the ticket's own scope, the remaining work is (a) confirm this fix holds and isn't regressed,
  (b) audit other client call sites of the `/cards` list endpoint for the same undefined-field
  assumption, and (c) add a regression check.
- Audit of other call sites of `GET /cards` (list endpoint, not `/cards/:id`) found:
  - `client/src/components/cards/CardSearch.tsx:36` types the response as `{ data: CardResult[];
    total: number }` (wrong shape, `total` is not top-level) but never reads `res.total` — dead/
    misleading type only, not a runtime crash.
  - `client/src/pages/ImportPage.tsx:176` and `client/src/pages/WatchlistPage.tsx:128` type the
    response as `{ data: ... }` only and never touch pagination fields — no bug.
  - `client/src/pages/CardDetailPage.tsx:97` calls `/cards/:id` (single-card shape), out of scope
    per the ticket (tracked separately as ARCA-53).
- Existing regression coverage: `scripts/e2e-playwright.pw.ts` already has a generic route smoke
  test that loads `/cards` and fails on any console error containing `"Uncaught"` — this would have
  caught the original crash, but it doesn't assert the total count actually renders a real number
  (it could silently render `NaN`/`0 cards found` without failing). Confirmed no other client test
  framework/directory exists (`client/package.json` has no test script; only `playwright.config.ts`
  and the `scripts/e2e-*.ts` files use Playwright).

## Approach
The smallest correct change is: no fix needed in `CardsPage.tsx` (already correct); tighten the
one inaccurate type in `CardSearch.tsx` for consistency with the real API shape; add a targeted
assertion to the existing Playwright smoke suite that the Cards page renders a real, non-crashing
total count. Files touched:
- `client/src/components/cards/CardSearch.tsx` — correct the response type to match the real
  `/cards` shape (drop the unused/incorrect top-level `total`, or nest it under `pagination` to
  match reality) so the type doesn't mislead future edits into the same mistake.
- `scripts/e2e-playwright.pw.ts` — extend or add a `/cards`-specific test asserting the rendered
  total count text is a real number (not blank, not "NaN", not "undefined") and that at least one
  card renders, in addition to the existing generic no-console-error check.

## Tasks
- [ ] Confirm via `git show b9cd3ea -- client/src/pages/CardsPage.tsx` and a manual run that the
      Cards page currently loads without crashing at `/cards`.
- [ ] Correct `CardSearch.tsx`'s response type (`client/src/components/cards/CardSearch.tsx:36`) to
      match the actual `/cards` API shape.
- [ ] Add a Cards-specific Playwright assertion (in `scripts/e2e-playwright.pw.ts` or a new spec
      alongside it) that the "N cards found" count renders a real, non-zero, non-NaN number and the
      card grid/list has at least one item.
- [ ] Run the Playwright suite locally against the dev servers and confirm the new/updated test
      passes.
- [ ] Manually verify `/cards` at 1024, 1280, and 375 px widths per the ticket's acceptance
      criteria.

## Validation gates
- [ ] happy path: visiting `/cards` while signed in renders the card grid with a "N cards found"
      count matching the real total from `GET /api/cards` (502 cards / 26 pages at time of audit),
      with no ErrorBoundary fallback and no console error.
- [ ] edge cases: pagination controls (page N of totalPages, prev/next disabled at bounds) behave
      correctly against `res.pagination`, and applying a search/set/rarity/supertype filter that
      changes `total` updates the count and page count without crashing.
- [ ] errors: the `/cards` fetch failure path (e.g. network error) still shows the existing toast
      error instead of an uncaught exception; no code path reads `res.total` (only `res.pagination.total`) anywhere in the client.
- [ ] coverage: the Playwright smoke suite (`scripts/e2e-playwright.pw.ts`) includes an assertion
      specific to Cards that would fail if the total-count field were ever read from the wrong
      place again, and it passes on a run against the local dev servers at 1024, 1280, and 375 px.

<!-- foundry-ticket: 192fb5a0069571de -->
