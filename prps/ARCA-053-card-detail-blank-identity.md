# PRP — ARCA-053-card-detail-blank-identity

## Intent
Every collector who lands on `/cards/:id` — from search, News alerts, Graded, Screener, or the
ticker — sees the real card name, set, number, rarity, and artwork instead of blank fields and a
broken-image icon.

## Context
- Backend: `modules/cards/handlers.ts:95-106` — `GET /api/cards/:id` returns `c.json({ data: card
  })`, where `card` (from `modules/cards/schema.ts:10-15`) carries `name`, `set_name`, `set_code`,
  `card_number` (`notNull`), `rarity` (nullable), `image_url`/`image_url_hires` (nullable).
- Frontend: `client/src/pages/CardDetailPage.tsx` reads `card.name`, `card.set_name`,
  `card.card_number`, `card.rarity`, and `imgSrc = card.image_url_hires || card.image_url` in the
  header (lines 144-152) and image panel (lines 253-262).
- **The exact bug the ticket describes is already fixed on this branch.** Commit `b9cd3ea`
  (ARCA-050, "Show set name on card pages") changed `CardDetailPage.tsx:97` from
  `api.get<Card>(\`/cards/${cardId}\`)` (stored the `{ data: ... }` envelope directly as `card`) to
  `api.get<{ data: Card }>(\`/cards/${cardId}\`).then((d) => d.data)` (correctly unwraps it). `git
  diff master -- client/src/pages/CardDetailPage.tsx` on this branch is empty — the fix is already
  merged to `master` and present here. The same commit fixed the sibling shape mismatch in
  `CardsPage.tsx` (`res.total` → `res.pagination.total`, `SetInfo.count` → `card_count`), which
  was ARCA-51's crash — so the workaround the ticket mentions ("navigate directly to `/cards/:id`
  because Cards page crashes") is no longer necessary either; `/cards` now loads and links through.
- Existing coverage from ARCA-050 is partial, not full regression coverage for this ticket:
  - `modules/cards/handlers.test.ts` asserts `set_name` is non-empty on `GET /api/cards` and `GET
    /api/cards/:id`, but does not assert `name`, `card_number`, or `image_url` are present.
  - `scripts/cards-set-name.pw.ts` (`CardDetailPage header shows the set name...` test) navigates
    to `/cards`, clicks the first card tile, and asserts the header contains a set-name segment —
    but doesn't assert the card *name* renders, doesn't check the image panel, and reaches the
    detail page only via CardsPage (coupling this test's reliability to CardsPage's own health).
- `client/src/lib/api.ts` — `api.get<T>` is a thin typed `fetch` wrapper; it does not unwrap
  envelopes itself, callers must type the exact response shape (this is what caused the original
  bug and needs to stay correct here).
- Price/analytics panels (`/pricing/:id/conflated`, `/pricing/:id`, `/pricing/:id/graded`,
  `/analytics/:id/summary`) are read via their own typed unwraps in the same `Promise.allSettled`
  block (`CardDetailPage.tsx:98-107`) and are independent of the `card` fetch — they were not
  broken by the original bug and are not touched by this fix.

## Approach
No production code change is required — the shape-mismatch bug is already fixed. The smallest
correct change is to close the coverage gap so this stays fixed, plus a manual confirmation pass:
- Extend `modules/cards/handlers.test.ts` to assert `name`, `card_number`, and `image_url` are
  present (in addition to the existing `set_name` check) on `GET /api/cards/:id`.
- Extend or add a Playwright test alongside `scripts/cards-set-name.pw.ts` that navigates directly
  to a real `/cards/:id` URL (not via a CardsPage click-through, so this test doesn't depend on
  CardsPage's own health) and asserts the header shows the card name and the image panel renders an
  `<img>` (not the `ImageOff` fallback) for a card with a valid `image_url`.
- Manually load a real card detail page in the browser at 1024, 1280, and 375 widths and visually
  confirm name/set/number/rarity/image render, and that the price/analytics side panels still
  populate.
- Update `docs/tickets/ARCA-053-card-detail-blank-identity.md` status to reflect the finding.

Files touched: `modules/cards/handlers.test.ts`, `scripts/cards-set-name.pw.ts` (or a new
`scripts/card-detail-identity.pw.ts`), `docs/tickets/ARCA-053-card-detail-blank-identity.md`.

## Tasks
- [ ] Confirm via `git diff master -- client/src/pages/CardDetailPage.tsx` (or equivalent) that the
      envelope-unwrap fix from ARCA-050 is present and unchanged on this branch.
- [ ] Manually verify a real `/cards/:id` page in the running app shows name, set name, card
      number, rarity, and artwork, at 1024, 1280, and 375 widths.
- [ ] Manually verify the price (conflated/all-sources/graded) and analytics (technical summary,
      risk metrics, ARCA score) side panels still populate correctly on the same page load.
- [ ] Add assertions to `modules/cards/handlers.test.ts` for `name`, `card_number`, and `image_url`
      on the single-card endpoint response.
- [ ] Add a Playwright regression test that goes directly to a real card's `/cards/:id` URL and
      asserts the name is visible and the image renders (not the broken-image placeholder).
- [ ] Update the ticket doc to record that the root-cause fix shipped under ARCA-050 and this pass
      only adds regression coverage.

## Validation gates
- [ ] happy path: loading `/cards/:id` for a real seeded card (e.g. `ht254dhrynyj` / "Absol") shows
      a non-empty name, set name, card number, and rarity in the header, and renders an `<img>` tag
      sourced from `image_url_hires`/`image_url` in the side panel, at 1024, 1280, and 375 widths.
- [ ] edge cases: a card with `rarity: null` omits the rarity segment cleanly (existing conditional
      at `CardDetailPage.tsx:147`); a card with `image_url: null` shows the `ImageOff` placeholder,
      not a broken `<img>` tag (existing conditional at `CardDetailPage.tsx:255-261`) — both
      confirmed still correct, not regressed.
- [ ] errors: requesting a nonexistent card id still shows the existing "Card not found" state
      (`CardDetailPage.tsx:119-129`) rather than a blank identity or a crash; `GET
      /api/cards/:id` for an unknown id still returns 404 with `{ error: "Card not found" }`
      (`modules/cards/handlers.ts:101-103`).
- [ ] coverage: `modules/cards/handlers.test.ts` asserts non-empty `name`, `card_number`, and
      `image_url` (in addition to `set_name`) on `GET /api/cards/:id`; a Playwright test navigates
      directly to a card detail URL (independent of CardsPage) and asserts both the name text and
      the rendered `<img>` element are present.

<!-- foundry-ticket: 6d941acf8b42ead5 -->
