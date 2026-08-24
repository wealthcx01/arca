
# ARCA-82 — Build: let founders create and apply custom tags to cards

**Status:** Todo · **Area:** Cards · **Depends on:** custom-tags-research

## Why this matters (for the founder)
Traders and collectors want to organize cards their own way, on top of ARCA's fixed data (set, rarity, price) — this gives them a personal layer of control that makes the app feel like their own workspace.

## Context
Builds on the tag model, cardinality, and visibility decisions produced by the research ticket. No custom-tagging mechanism exists in ARCA today; this must not collide with the existing saved-card-lists feature (ARCA-61), so the research findings on that overlap are a hard input here, not a suggestion.

## Scope
- Data model and API to create, rename, delete, and apply/remove tags on a card, per the model chosen in research.
- UI to add/view/remove tags from card detail and/or card list views.
- Tags persist to the signed-in user's account.

## Out of scope
- Shared/public tags visible to other users (unless research explicitly recommends this).
- Any change to pricing, catalog data, or the ARCA Score.
- Bulk tag operations (e.g. tag 50 cards at once) unless research flags this as essential.

## Acceptance criteria
- [ ] A signed-in user can create a tag, apply it to a card, and remove it.
- [ ] Tags persist across sessions for that user's account.
- [ ] Tag model matches what research recommended (or deviation is explicitly noted and justified).
- [ ] No regression to existing saved card lists (ARCA-61).
