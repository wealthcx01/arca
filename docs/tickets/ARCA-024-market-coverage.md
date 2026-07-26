# ARCA-24 — Market-wide price coverage & full catalog

**Status:** In progress · **Area:** Cards · **Depends on:** ARCA-3, ARCA-4

## Context
Pricing only refreshes HELD cards (`getHeldCardRefs`), and the catalog seed is capped at 5 pages (~1,250 of ~19k cards).

## Scope
- Raise/parameterize the card seed beyond `MAX_PAGES=5` to the full corpus.
- Price the tradable universe (not only held cards), on a schedule that respects provider limits.
- Reset the `daily_usage` provider counter on a daily boundary.

## Acceptance criteria
- [ ] The catalog covers the intended card universe.
- [ ] Market pages reflect prices for non-held cards.
