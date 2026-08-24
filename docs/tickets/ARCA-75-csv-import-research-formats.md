
# ARCA-75 — Research: formats collectors actually use for bulk CSV import

**Status:** Todo · **Area:** Portfolio · **Depends on:** —

## Why this matters (for the founder)
Before we build a "bulk import your collection" feature, we need to know what files people will actually upload — otherwise we build for a format nobody has and the feature fails on the first real user.

## Context
ARCA already ships a CSV import wizard (ARCA-13) for transactions (buy/sell with cost basis, column mapping, preview before commit). This is different: a founder wants to let people bulk-import a *collection* (what they own, graded or not) not just trades. In the wild, the common sources are:
- TCGplayer app collection export, and separate TCGplayer Pricing/Inventory CSV exports (different columns, needs TCGplayer ID/Product ID enabled) \ue202turn0search0\ue202turn0search2\ue202turn0search3
- Collectr, a portfolio tracker for raw/graded/sealed collectibles with its own export/import shape \ue202turn0search5\ue202turn0search6
- ManaBox, which requires at minimum card name + set name/code (or a Scryfall-style ID), and documents per-source quirks \ue202turn0search0
- Informal home-grown spreadsheets (no standard columns at all) \ue202turn0search4

These don't share a schema. Grading info (PSA/BGS cert numbers, grade) is inconsistently present or absent depending on source.

## Scope
- Collect and document real sample CSVs (or column lists) from: TCGplayer app export, TCGplayer inventory export, Collectr, ManaBox, and at least one home-grown spreadsheet example.
- For each, note: column names, how set/card identity is expressed, whether/how PSA or BGS grade + cert number appear, quantity handling, and any quirks (multi-line headers, currency, condition codes).
- Recommend a single "canonical" internal column set ARCA's importer should map everything onto, focused on the current PSA/BGS-graded WOTC-era segment.
- Flag which formats are realistic to support in v1 vs. defer.

## Out of scope
- Any code changes to the importer or UI.
- Supporting non-WOTC-era or ungraded cards (outside current segment focus).

## Acceptance criteria
- [ ] A short written doc lists the sample formats reviewed, their columns, and sourced links.
- [ ] A recommended canonical column mapping is proposed and justified.
- [ ] A clear v1-supported vs. deferred list of source formats is given to the build ticket.
