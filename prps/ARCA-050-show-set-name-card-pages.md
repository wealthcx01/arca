# PRP — ARCA-050-show-set-name-card-pages

## Intent
Every card a user looks at — in the list or on its own page — should unambiguously show which set it's from, so collectors can tell apart similarly-named cards from different sets/editions.

## Context
- Venture knowledge: ARCA-3 (shipped) already ingests and stores set data per card and supports filtering/searching by set. ARCA-21 (shipped) built `CardsPage` and `CardDetailPage` as the terminal-style card list/detail UI. This ticket's own dependency chain assumes set name is *not yet* surfaced — but code inspection shows it already is.
- `modules/cards/schema.ts:10-11` — `cards.set_name` (`notNull`) and `cards.set_code` (`notNull`) are denormalized onto every card row; no separate `sets` table, no symbol/logo/icon URL field exists anywhere in the schema.
- `modules/cards/handlers.ts` — `GET /api/cards` and `GET /api/cards/:id` both return full card rows including `set_name`/`set_code` already; `GET /api/cards/sets` returns `{set_code, set_name, card_count}` for the filter dropdown. No API change needed.
- `client/src/pages/CardsPage.tsx:188-193` (grid view) already renders `{card.set_name}` under the card name; `CardsPage.tsx:203` (list view "Set" column header) and `:229` already render `{card.set_name}` per row.
- `client/src/pages/CardDetailPage.tsx:144-146` — the terminal header bar already renders `{card.name}` immediately followed by `{card.set_name} #{card.card_number}`, i.e. set name is already next to the title.
- Git history: `058b577` ("ARCA-NEW — Show set name on card pages") only added the ticket markdown doc — zero lines of `CardsPage.tsx`/`CardDetailPage.tsx` changed by it or any other commit. The set-name rendering has existed since the initial commit (predates this ticket), most likely shipped as part of ARCA-21.
- No `symbolUrl`/`logoUrl`/`symbol_url` field or asset exists anywhere (schema, API, seed job, or `client/src/assets/`), so the ticket's "if a set symbol/icon is available... otherwise text-only is fine" clause resolves to text-only by default — no new work implied there.
- No test coverage exists today for `CardsPage`, `CardDetailPage`, or the `/api/cards*` handlers (only `src/lib/*.test.ts` and `modules/portfolio/engine.test.ts` exist repo-wide).

## Approach
This is functionally already done — the smallest correct change is to verify the existing behavior against the acceptance criteria, close the one real gap (zero automated coverage protecting this display), and fix any rendering edge cases found during verification (e.g. long set-name truncation, missing `card_number`). No schema, API, or data-ingestion changes are in scope.
Files to touch:
- `client/src/pages/CardsPage.tsx` — only if verification surfaces a real display bug (e.g. truncation clipping the full set name unreadably).
- `client/src/pages/CardDetailPage.tsx` — only if verification surfaces a real display bug in the header line.
- New test file(s) alongside existing test patterns (e.g. `modules/cards/handlers.test.ts` and/or a client component test) to lock in that set name renders in both places.
- `docs/tickets/ARCA-050-show-set-name-card-pages.md` — update status once verified/closed.

## Tasks
- [ ] Run the app and visually confirm every card tile/row on `CardsPage` (both grid and list view) shows its set name
- [ ] Visually confirm `CardDetailPage` shows the set name next to the card title in the header bar
- [ ] Query `/api/cards` and `/api/cards/:id` directly to confirm `set_name` is present on every returned record (no nulls, no empty strings) across a representative sample
- [ ] Check rendering with a long set name (e.g. "Sword & Shield: Astral Radiance") to confirm grid-view truncation (`truncate` class) doesn't cut it off unreadably, and fix if it does
- [ ] Confirm no changes were needed/made to search, filter, or analytics behavior on either page
- [ ] Add automated coverage (handler test + component/page test) asserting set name is present in the `/api/cards` and `/api/cards/:id` responses and rendered in `CardsPage`/`CardDetailPage` output
- [ ] Update `docs/tickets/ARCA-050-show-set-name-card-pages.md` status to reflect verified/shipped state

## Validation gates
- [ ] happy path: a normal card list render shows the set name on every visible card in both grid and list view, and the card detail header shows `{name} | {set_name} #{card_number}`
- [ ] edge cases: a card with an unusually long set name renders without the set name being illegibly clipped or breaking the row/tile layout
- [ ] errors: no card record with a missing/empty `set_name` reaches the UI un-handled (verify `set_name` is `NOT NULL` in `modules/cards/schema.ts` and confirm via a live API sample that no row violates it)
- [ ] coverage: an automated test asserts `set_name` is present in `/api/cards` and `/api/cards/:id` responses, and an automated test asserts `CardsPage` and `CardDetailPage` render the set name, so a future regression is caught by CI rather than manual QA

<!-- foundry-ticket: 77ed744bad26bb2b -->
