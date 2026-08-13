# PRP — show-set-name-card-pages

## Intent
Collectors browsing or viewing a card can always see which set it's from, so similarly-named cards from different sets are never confused.

## Context
- ARCA-3 (shipped) ingests `set_name`/`set_code` per card into the `cards` table (`modules/cards/schema.ts:10-11`) — there is no separate `sets` table, set data is denormalized onto each card row.
- `modules/cards/handlers.ts` already selects full card rows (including `set_name`) for both the list endpoint (`GET /cards`, handlers.ts:35-89) and the detail endpoint (`GET /cards/:id`, handlers.ts:95-106), and exposes a `GET /sets` aggregate (`{ set_code, set_name, card_count }`, handlers.ts:13-28). No API changes are implied by this ticket.
- **Client already renders `set_name` in all three targeted spots:**
  - `client/src/pages/CardsPage.tsx:191` — grid/tile view, subtitle under the card name.
  - `client/src/pages/CardsPage.tsx:229` — list/table view, dedicated "Set" column (header at line 203).
  - `client/src/pages/CardDetailPage.tsx:146` — terminal header bar, immediately after the card name (`{card.set_name} #{card.card_number}`).
- No set symbol/icon field exists anywhere in the schema or API responses (confirmed by grep across `modules/cards`), so per the ticket's own fallback ("otherwise text-only is fine") no icon work is needed.
- `docs/tickets/show-set-name-card-pages.md` has an uncommitted status bump from "Todo" to "In progress" but no code changes have landed on this branch (`058b577` only touched the ticket doc).

## Approach
This is a verification ticket, not a build ticket: the acceptance criteria are already met by existing code from ARCA-3/ARCA-21. The smallest correct change is:
- Confirm (by reading rendered output, not just source) that `set_name` is populated for real seeded data and visibly displayed in both `CardsPage` views and on `CardDetailPage`.
- Touch only `docs/tickets/show-set-name-card-pages.md` to mark the ticket Shipped with a note that it was already satisfied by prior work, so the founder isn't misled into thinking new UI work happened.
- No changes to `client/src/pages/CardsPage.tsx`, `client/src/pages/CardDetailPage.tsx`, or any `modules/cards` file are expected unless verification turns up a gap (e.g., a card with a null `set_name` rendering blank).

## Tasks
- [ ] Run the app and load `CardsPage` in grid view; confirm every visible card tile shows its set name under the card name.
- [ ] Switch `CardsPage` to list view; confirm the "Set" column is populated for every row.
- [ ] Open `CardDetailPage` for at least one card; confirm the set name renders in the header bar next to the card name/number.
- [ ] Spot-check the underlying data for cards with unusual/missing `set_name` values (query `cards` table) to see whether any card would render an empty set field.
- [ ] Update `docs/tickets/show-set-name-card-pages.md` status to reflect the true state (already satisfied vs. any gap found), and record why.

## Validation gates
- [ ] happy path: a card list (grid and list view) and a card detail page, loaded against seeded data, visibly render a non-empty set name for a normal card (e.g. a Base Set or Jungle card).
- [ ] edge cases: a card whose `set_name` is null/empty in the `cards` table (if any exist after seeding) is checked, and the UI's behavior for that case (blank vs. placeholder text) is noted as acceptable or flagged as a gap.
- [ ] errors: loading `CardsPage`/`CardDetailPage` for a nonexistent or slow-loading card does not throw due to the set-name rendering (i.e. `card.set_name` access is safe under the existing loading/error branches already in those components).
- [ ] coverage: all three display locations named in the ticket scope — `CardsPage` grid tiles, `CardsPage` list rows, and `CardDetailPage` header — are individually confirmed, not just one representative view.

<!-- foundry-ticket: aa491c9add848766 -->

<!-- foundry-ticket: aa491c9add848766 -->

<!-- foundry-ticket: aa491c9add848766 -->
