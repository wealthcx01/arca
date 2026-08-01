# ARCA-NEW — placeholder for missing card images

**Status:** Todo · **Area:** Frontend/UI · **Depends on:** —

## Why this matters (for the founder)
Right now, any card missing an image shows a broken-icon graphic, which looks unfinished and unprofessional. A proper placeholder keeps the page looking clean and trustworthy even when image data is incomplete.

## Context
This is a visual/UX fix on card display pages. No new data or backend changes are needed — just a fallback state for the existing image element when the image URL is missing, null, or fails to load.

## Scope
- Detect when a card's image is missing or fails to load.
- Show a designed placeholder graphic in its place (styled to match ARCA's look — e.g. a subtle card outline or "no image available" panel).
- Apply consistently across all pages/components where card images appear (grid views, detail views, etc.).

## Out of scope
- Fetching, sourcing, or uploading actual missing card images.
- Changing how images are stored or linked in the database.
- Any change to layout/sizing of the card display beyond swapping in the placeholder.

## Acceptance criteria
- [ ] When a card has no image (or the image fails to load), a designed placeholder displays instead of a broken image icon.
- [ ] The placeholder is visually consistent with ARCA's existing design.
- [ ] The fix applies everywhere card images are shown, not just one page.
