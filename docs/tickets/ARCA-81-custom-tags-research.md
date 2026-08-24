
# ARCA-81 — Research: how founders want to tag their own cards

**Status:** Todo · **Area:** Cards · **Depends on:** —

## Why this matters (for the founder)
Before building custom labels, we need to know what "tag a card" actually means to the traders and collectors using ARCA — otherwise the build risks solving the wrong problem.

## Context
ARCA currently has no user-defined labeling on cards — only system data (set, rarity, price, grade). Founder has asked to let founders (i.e. ARCA's users, in this context traders/collectors) tag cards with their own labels. There's no prior ticket or decision on file covering custom tags, so this is genuinely new ground rather than an extension of existing work.

Open questions this research must answer:
- What do users actually want to tag for — personal categorization ("watchlist", "for sale", "grail"), portfolio grouping, or something else?
- Free-text tags, or a constrained set of preset labels?
- Single tag per card, or multiple?
- Are tags private per-user, or shareable/visible to others?
- Any overlap with existing "saved card lists" (ARCA-61) that should be reconciled rather than duplicated?

## Scope
- Review how ARCA-61 (saved card lists) already lets users group cards, to avoid building a second, competing mechanism.
- Talk to or survey a handful of target users (or found a lightweight proxy: forum/Discord scan of graded-card collectors) on how they'd expect to label cards.
- Write up a short recommendation: tag model (free-text vs preset), cardinality (single vs multi), visibility (private vs shared), and how it relates to saved lists.

## Out of scope
- Any UI or database changes.
- Final decision-making on pricing or premium-gating of tagging (not raised by founder).

## Acceptance criteria
- [ ] A short written recommendation exists covering: tag model, cardinality, visibility, and relationship to saved card lists.
- [ ] Recommendation explicitly states whether custom tags overlap or conflict with ARCA-61 saved lists.
