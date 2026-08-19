# ARCA-65 — Clear the lint debt so the whole repo can be gated, not just changed files

**Status:** Todo · **Area:** Infra/QA · **Depends on:** ARCA-34

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
- [ ] `bunx biome check .` passes on the whole repository.
- [ ] The CI lint step gates the whole repository, not only changed files.
- [ ] No rule was disabled to get there.
