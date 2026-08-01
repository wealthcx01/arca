# ARCA-NEW — Show set name on card list and card detail views

**Status:** Todo · **Area:** Client/UI · **Depends on:** ARCA-3

## Why this matters (for the founder)
Right now cards look interchangeable because the set they belong to isn't shown, making it hard to tell visually similar cards apart. Showing the set name fixes a basic trust/usability gap on a product meant to be a precise market terminal.

## Context
The card catalog (ARCA-3) already ingests and stores set data, and the API supports filtering by set plus a `/sets` endpoint with per-set counts. The card detail page (ARCA-21/26) currently focuses on price/analytics panels but does not clearly surface the set name/logo alongside the card identity. This ticket only adds the missing display — no new data ingestion needed.

## Scope
- Show the set name (and set symbol/logo if already available in the data) on each card row/tile in card search results.
- Show the set name prominently near the card title/image on the card detail page.
- Make set name a clickable link/filter where a "view by set" pattern already exists (e.g. links to Sets/Eras page), if trivial — otherwise plain text is fine.

## Out of scope
- Any changes to the Sets/Eras page itself.
- Any new set-level analytics or data ingestion.
- Sorting/filtering behavior changes beyond what already exists.

## Acceptance criteria
- [ ] Every card in card search/list results visibly shows its set name.
- [ ] The card detail page visibly shows the set name near the card's title/image.
- [ ] No changes to existing set data, analytics, or the Sets/Eras page.
