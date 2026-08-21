# ARCA-66 — Run the browser smoke test in CI

**Status:** Shipped · **Area:** Infra/QA · **Depends on:** ARCA-34

## Context
ARCA-34 shipped four gates — lint, typecheck, tests, build. Its fifth, the Playwright smoke test,
is **not** running, and this ticket is why rather than a tick nobody checked.

`client/playwright.config.ts` points at `scripts/*.pw.ts` with `baseURL: http://localhost:5173`, and
the one test there (`cards-set-name.pw.ts`, from ARCA-50) needs more than a browser:

- the backend on `:3001` and the Vite dev server on `:5173`,
- a working sign-up flow — it registers a fresh account per run,
- **and a catalog with cards in it**, since it asserts a set name is visible on a card page.

That last one is the real obstacle. The unit tests solved it by bringing their own two cards and
deleting them afterwards; a browser test cannot, because it drives the real UI, which paginates and
filters a catalog it expects to be populated.

Seeding it the normal way (`bun run db:seed`) calls the Pokémon TCG API. A gate that fails when
someone else's service is slow is not a gate — the same reason ARCA-34's test job does not call it.

## Scope
- **A committed catalog fixture** — a small, fixed set of cards (tens, not thousands) loadable
  offline, so the smoke test has a known catalog and known cards to assert against.
- A CI job that: creates the schema, loads the fixture, starts the backend and the client, waits for
  both to answer, runs the smoke test, and uploads screenshots on failure.
- Bounded like every other job (`timeout-minutes`), and the browser install cached and bounded —
  the studio's own UI gate hung for six hours on exactly that step.

## Explicitly NOT here
- Growing the browser suite. One honest smoke test that runs is worth more than ten that do not.
- Testing against a live external pricing source.

## Acceptance criteria
- [x] The suite runs on every PR against a committed catalog fixture, with **no external network
      call** — `scripts/fixtures/cards.json` (12 cards, 3 sets) loaded by `scripts/seed-fixture.ts`.
- [x] **It fails when the set name is missing — demonstrated, not argued.** The set-name `<p>` was
      removed from `CardsPage.tsx`, the suite was run, and *"shows set name on every card"* failed
      on `locator.textContent` while the list-view and detail-page tests correctly still passed —
      the regression was localised, not a blanket red. Reverted, and 26/26 green again.
- [x] Screenshots and the HTML report upload on failure, plus the last 50 lines of both server logs.
- [x] ARCA-34's fifth criterion can now be ticked.

## What it took, and the two things that nearly made it useless

**The artwork had to be served by us.** `CardDetailPage` swaps to the `ImageOff` placeholder on the
`<img>`'s `onError`. A fixture pointing at `images.pokemontcg.io` would have failed the test in CI —
not because the code was wrong, but because the image could not be fetched. `client/public/
fixture-card.svg` is served by the stack itself and the fixture points at it.

**The suite was flaky, and retries were hiding it.** Every test in `cards-set-name.pw.ts` drove the
sign-up *form*: it waited 3s for a "Sign up" toggle, silently skipped the click if the app had not
rendered, then timed out 30s later on a `#name` field that only exists once that toggle is clicked.
A different test in the file failed on every local run, never the same one twice. It now signs up
through the API like the other two suites — 26 tests, no retries, 15s instead of 1.6 minutes.

A gate that fails randomly teaches people to re-run it rather than read it, which is worse than not
having one. `workers: 1` under CI for the same reason: the database is SQLite, one writer, and
parallel sign-ups contend.

## Also changed

- `PLAYWRIGHT_BASE_URL`, `VITE_PORT` and `VITE_API_TARGET` are now overridable, so a second stack can
  run beside a developer's existing one. Defaults unchanged. This is how the suite was verified here
  without disturbing a dev server that had been up for twenty days.
- No `--with-deps` on the browser install: that shells out to apt, which hung the studio's own UI
  gate for six hours and then failed it at eight minutes on an unreachable mirror (FB-114).
