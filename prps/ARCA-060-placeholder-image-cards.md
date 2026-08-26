# PRP — ARCA-060-placeholder-image-cards

## Intent
Every card with no artwork or a broken image URL shows one clean, on-brand placeholder — never a browser broken-image icon — everywhere card art appears.

## Context
Card rows have two nullable image fields (`image_url`, `image_url_hires`, `modules/cards/schema.ts:14-15`) because not every card ingested from the Pokemon TCG API (ARCA-3) has artwork. Four render sites currently handle this inconsistently:
- `client/src/components/cards/CardSearch.tsx:124-131` — thumbnail, renders nothing (blank space) when `card.image_url` is falsy, no `onError`.
- `client/src/pages/CardsPage.tsx:176-187` (grid view) — falls back to a plain "No Image" text div on falsy URL, but no `onError` for a URL that 404s/fails to load.
- `client/src/pages/CardsPage.tsx:222-229` (list view) — same blank-space gap as CardSearch, no `onError`.
- `client/src/pages/CardDetailPage.tsx:284-296` — the one site that already does this right: `onError` sets `imgError` state, falls back to a `bg-[var(--color-muted)]` div with a Lucide `ImageOff` icon, sized with `aspect-[2.5/3.5]`.

There is no shared image/placeholder component today (`client/src/components/ui/` has `Skeleton.tsx` but nothing image-related). Styling is Tailwind v4 with CSS custom-property design tokens (`--color-muted`, `--color-muted-foreground`, defined in `client/src/index.css`); icons come from `lucide-react` (already used as `ImageOff` in CardDetailPage). No test framework (Vitest/Jest/RTL) is present in the client — this repo is not test-driven.

ARCA-53 (shipped) previously fixed the "no card identity renders at all" bug on CardDetailPage; this ticket is narrower and purely visual — the fallback behavior CardDetailPage already has should become the one pattern used everywhere, not something to invent from scratch.

## Approach
Extract CardDetailPage's existing fallback pattern into one reusable component and use it at all four sites instead of four ad-hoc implementations. Smallest correct change:
- Add `client/src/components/ui/CardImage.tsx`: takes `src` (string | null | undefined), `alt`, and a `className`/aspect-ratio prop; renders the `<img>` when `src` is truthy and hasn't errored, tracks `onError` internally, and renders the same muted-background + `ImageOff` icon placeholder div (matching CardDetailPage's existing markup/tokens) in every other case (missing URL, empty string, or load failure).
- Replace the four inline blocks with `<CardImage>`, passing each site's existing sizing classes (`h-8 w-6 rounded object-cover` for the two thumbnails, `aspect-[2.5/3.5] w-full object-cover` for grid/detail) so no layout changes besides fixing the broken-icon/blank-space cases.

Files touched:
- `client/src/components/ui/CardImage.tsx` (new)
- `client/src/components/cards/CardSearch.tsx`
- `client/src/pages/CardsPage.tsx`
- `client/src/pages/CardDetailPage.tsx`

## Tasks
- [ ] Create `CardImage` component with internal `onError` state and the muted/`ImageOff` placeholder markup, sized via a passed-in className/aspect-ratio.
- [ ] Wire CardSearch's thumbnail through `CardImage` so a missing `image_url` shows the placeholder instead of blank space.
- [ ] Wire CardsPage list-view thumbnail through `CardImage`, same fix as CardSearch.
- [ ] Wire CardsPage grid-view card through `CardImage`, replacing the bespoke "No Image" text div and adding broken-URL handling.
- [ ] Wire CardDetailPage's hero image through `CardImage`, preserving the `image_url_hires` → `image_url` fallback order before handing the resolved src to the component.
- [ ] Confirm placeholder visuals (icon, muted background, sizing) are identical across all four sites.

## Validation gates
- [ ] happy path: a card with a valid `image_url` (or `image_url_hires` on detail) renders the real `<img>` unchanged in CardSearch, CardsPage grid, CardsPage list, and CardDetailPage.
- [ ] edge cases: a card with `image_url` (and `image_url_hires` where applicable) null/empty renders the same `ImageOff`-on-muted-background placeholder in all four locations, not a blank gap or text-only fallback.
- [ ] errors: a card with a non-null `image_url` that fails to load (404 or network error) triggers `onError` and swaps to the placeholder in all four locations, including CardSearch and CardsPage list/grid, which today have no `onError` handling at all.
- [ ] coverage: manually verify (no test framework exists in this client) all four sites in a dev server session — search results, cards grid, cards list, and card detail — using both a card known to lack artwork and a temporarily-broken URL, confirming placeholder dimensions match the surrounding layout with zero shift versus the current loaded-image size at each site.

<!-- foundry-ticket: 3ed1d22578e845cf -->
