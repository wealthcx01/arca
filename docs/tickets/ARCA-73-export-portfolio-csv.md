# ARCA-73 — Export portfolio to CSV

**Status:** Todo · **Area:** portfolio · **Depends on:** —

## Why this matters (for the founder)
Traders often need their holdings outside ARCA (spreadsheets, tax prep, sharing with a partner). A one-click CSV export makes ARCA useful even when someone needs to work elsewhere.

## Context
Portfolio tracking already exists in ARCA. This adds a standard export action; no new data fields or pricing logic are needed.

## Scope
- Add an "Export to CSV" button on the Portfolio page
- Export includes: card name, set, grade, grading company, quantity, cost basis, current value, date added
- Downloads a .csv file named with the user's account and today's date

## Out of scope
- Export formats other than CSV (e.g. PDF, Excel)
- Scheduled or automatic exports
- Any change to portfolio data, pricing, or layout

## Acceptance criteria
- [ ] Clicking "Export to CSV" on Portfolio downloads a valid .csv with all current holdings
- [ ] CSV columns match: card name, set, grade, grading company, quantity, cost basis, current value, date added
- [ ] Works with an empty portfolio (downloads a CSV with headers only, no error)
- [ ] No changes to any other page's behavior
