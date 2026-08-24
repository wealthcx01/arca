
# ARCA-76 — Build: bulk-import a collection from CSV

**Status:** Todo · **Area:** Portfolio · **Depends on:** csv-import-research-formats

## Why this matters (for the founder)
Traders and collectors already have their PSA/BGS-graded WOTC-era cards tracked somewhere else (TCGplayer, Collectr, ManaBox, or a spreadsheet). Letting them bulk-import a whole collection in one go — instead of typing each card in by hand — is the difference between someone trying ARCA and someone bouncing off it.

## Context
ARCA already has a working CSV import wizard (ARCA-13: column mapping + preview before commit) built for buy/sell transactions with cost basis. This ticket extends that same wizard pattern to also accept a plain "this is what I own" collection file — no transaction/price data required — rather than building a separate importer. Exact source formats and the canonical column mapping come from the research ticket.

## Scope
- Extend the existing CSV import flow to accept a "collection" import mode alongside the current transaction mode.
- Map the canonical columns from the research ticket (card name, set, grading company, grade, cert number, quantity) onto ARCA holdings.
- Reuse the existing column-mapping + preview-before-commit UI so the founder sees what will be imported before anything is saved.
- Handle the v1-supported source formats identified by research; show a clear, honest error for anything else (see acceptance criteria) rather than a silent failure or partial import.

## Out of scope
- Supporting source formats the research ticket marks as "defer."
- Any change to the transaction ledger, cost-basis engine, or portfolio analytics.
- Automated/scheduled re-import or sync with external accounts — this is a one-off file upload.

## Acceptance criteria
- [ ] A user can upload a CSV in any v1-supported format and preview the parsed collection before committing.
- [ ] Rows that fail to match a known card/grade are shown to the user individually, not dropped silently.
- [ ] Committing an import creates holdings without requiring buy/sell price data.
- [ ] An unsupported file format produces a clear, plain-English error, not a crash or blank screen.
