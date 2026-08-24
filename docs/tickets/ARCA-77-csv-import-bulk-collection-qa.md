
# ARCA-77 — QA: bulk-import a collection from CSV

**Status:** Todo · **Area:** Portfolio · **Depends on:** csv-import-bulk-collection-build

## Why this matters (for the founder)
An import feature that silently drops or mis-maps someone's collection is worse than no feature at all — it erodes the trust ARCA needs on day one.

## Context
This tests the build ticket's output against the real sample files gathered in research, plus deliberately broken files, to confirm the import is honest about what it can and can't do.

## Scope
- Test import using real sample files (or close reconstructions) for each v1-supported format from research.
- Test with malformed/unsupported CSVs: missing required columns, empty file, wrong file type, duplicate rows, unmatched card/grade.
- Confirm the preview-before-commit step accurately reflects what will be saved.
- Confirm holdings created match the source file's cards, grades, and quantities exactly.

## Out of scope
- Performance/load testing for very large files (thousands of rows) — file separately if it becomes a real need.
- Testing formats marked "defer" in the research ticket.

## Acceptance criteria
- [ ] Each v1-supported sample format imports correctly end-to-end with correct holdings created.
- [ ] Each malformed/unsupported test case produces a clear error, not a crash, blank screen, or silent partial import.
- [ ] Preview step is verified to match final committed holdings in every test case.
- [ ] Results (pass/fail per case) are written up for the founder in plain language.
