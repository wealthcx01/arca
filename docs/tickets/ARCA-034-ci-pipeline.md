# ARCA-34 — CI pipeline

**Status:** Done — the browser smoke is ARCA-66 · **Area:** Infra/QA · **Depends on:** ARCA-22

## Context
There was no CI (`.github/workflows` absent); tests ran only locally. Eleven pieces of work were
merged on 2026-08-19 verified by nothing but a person reading them.

## What shipped
Four gates, each **green on `master` the day it was added**. A gate that is red from birth gets
ignored, and an ignored gate is worse than none because it looks like cover.

| Gate | Runs | Note |
| --- | --- | --- |
| Lint | `biome check --changed --since=<base>` | changed files only — see below |
| Typecheck | `bun run typecheck` | was failing; fixed here |
| Test | `bun run db:push` then `bun test` | 118 tests, was 2 failing |
| Build | `bun run build` | was already green |

Every job is bounded with `timeout-minutes`. The studio's own UI gate once hung for six hours on an
unbounded browser install and blocked all merges for a day; that lesson is applied here up front.

### Three things had to be fixed before the gates could be green

1. **Typecheck failed** — `ErrorBoundary.tsx` needed `override` on three members. Fixed.
2. **Two tests failed on any machine without a seeded catalog.** `modules/cards/handlers.test.ts`
   assumed the catalog was populated, so on a clean checkout it fell over reading `data[0].id` of an
   empty list. It now brings its own two cards and deletes them afterwards — verified by wiping the
   database, pushing the schema and running the suite on an empty one: 118 pass.
3. **The linter was reading vendored code.** 613 of ~750 diagnostics were in
   `trkd_scraper/output/js_bundles/` — jQuery, Highcharts exporting, json2. Scraped third-party
   output, now excluded. It was measuring someone else's code style.

### Why lint is scoped to changed files
ARCA's own code still carries ~198 biome errors (**ARCA-65**). Blocking on all of it would stop
every PR from day one. New code is held clean; the debt is named and worked down separately.

`--no-errors-on-unmatched` is load-bearing: biome exits 1 when it processes no files, and a
ticket-only change touches nothing it lints — without it, every ticket the composer files would
fail lint for containing no code.

## Acceptance criteria
- [x] Every PR runs lint + typecheck + tests automatically, and blocks on red.
- [ ] **Playwright smoke.** Not running — it needs a populated catalog and a running stack, and
      seeding it calls an external API. Scoped as **ARCA-66** rather than ticked.
