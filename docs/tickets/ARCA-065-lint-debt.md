# ARCA-65 — Clear the lint debt so the whole repo can be gated, not just changed files

**Status:** Shipped · **Area:** Infra/QA · **Depends on:** ARCA-34

## Context
ARCA-34 turned on CI. Lint is scoped to **only the files a change touches**, because the repository
as it stands does not pass its own configured linter:

```
$ bunx biome check .
Checked 145 files. Found 198 errors. Found 171 warnings.
```

Blocking on all of that would have stopped every PR from the day CI existed, and a gate that blocks
everything gets switched off within a week. So new code is held clean and the debt is named here.

(The count was ~750 before ARCA-34 excluded `trkd_scraper/` from the linter — 613 of those
diagnostics were in vendored third-party bundles: `jquery.ui.sschart.js`, `exporting.js`, `json2.js`.
Those are scraped output, not ARCA's code, and linting them measured nothing.)

## What the remaining debt is

| Rule | Count | Shape of the fix |
| --- | --- | --- |
| `style/noNonNullAssertion` | 78 | each `!` is a claim the value cannot be null — check it or explain it |
| `suspicious/noExplicitAny` | 38 | give the real type, or `unknown` plus a narrowing |
| `style/useTemplate` | 34 | mechanical: string concatenation → template literal |
| `correctness/useExhaustiveDependencies` | 21 | React hook dependency arrays — the only group here that can change behaviour |
| `suspicious/noArrayIndexKey` | 12 | list keys that break when the list reorders |
| `suspicious/noAssignInExpressions` | 8 | assignment inside a condition, usually a typo risk |

The last three are real defects waiting to happen. The first three are mostly mechanical, and
`biome check --fix` handles a large share of `useTemplate` on its own.

## Scope
- Work the table down, ideally rule by rule so each change is reviewable as one idea.
- `useExhaustiveDependencies` last and most carefully: changing a dependency array changes when
  effects re-run, which is a behaviour change, not a tidy-up.
- When the count reaches zero, change the CI lint step from `--changed --since=…` to a plain
  `bunx biome check .` and delete this ticket's reason for existing.

## Explicitly NOT here
- Reconfiguring rules to make errors disappear. Turning off `noExplicitAny` would produce the same
  green as fixing it and none of the benefit.

## Acceptance criteria
- [x] `bunx biome check .` passes on the whole repository — exit code 0. What remains is 157
      warnings, which are warnings because *this project chose that* in `biome.json`
      (`noNonNullAssertion`, `noArrayIndexKey`, four a11y rules). Reclassifying them is a separate
      decision, not this ticket's to make quietly.
- [x] The CI lint step gates the whole repository, not only changed files.
- [x] **No rule was disabled.** Two `biome-ignore` lines were added, both on the same false positive
      and both explaining it: `rebuildSeries` is a function declaration, biome does not look inside
      it, and it reads all four of the dependencies the rule calls unnecessary. Verified by reading
      its body. Obeying the tool there would have stopped the chart rebuilding when the data
      changed — the rule being wrong is not the same as the code being wrong.

## What it found on the way

Three things that were bugs, not untidiness:

- **`seed-analytics.ts` was ARCA-56.** Four `as any` casts hid a libsql argument shape being passed
  to a drizzle driver. The cast is what let it compile; at runtime it throws. Part A of that ticket
  is fixed as a consequence, and it is marked as such rather than closed.
- **Charts never applied theme or height changes.** `LightweightChart` read both only at creation,
  so toggling dark mode left every chart on the old palette until the component happened to remount.
  The missing-dependency finding was pointing straight at it.
- **The toast context re-rendered every consumer.** `toast` and the context value were fresh objects
  on every provider render. That was also what made the dependency undeclarable: naming it would
  have turned "load once" effects into "reload whenever a toast appears".

## Two fixes that would have been bugs

- Adding `doFetch` to `usePolling`'s effect would clear and recreate the interval every render.
  The latest-`fetcher`-in-a-ref pattern keeps the dependency honest and the behaviour identical.
- Adding `activeId` to WatchlistPage's loader would refetch the whole list every time the user
  selected a different watchlist. The functional `setState` form removes the read entirely.

Both are the shape this rule punishes: the obvious fix is a regression.
