
# ARCA-83 — QA: verify custom card tagging works end-to-end

**Status:** Todo · **Area:** Cards · **Depends on:** custom-tags-build

## Why this matters (for the founder)
Confirms the tagging feature actually works for real users before it's trusted as shipped — catching silent failures rather than finding out from a user later.

## Context
Directly tests what the build ticket ships. Founder has previously prioritized honest, visible failure over silent failure, so this QA pass should specifically probe edge cases (empty tag names, duplicate tags, removing a tag that's applied to many cards) rather than just the happy path.

## Scope
- Verify create/rename/delete/apply/remove tag flows work as specified in the build ticket's acceptance criteria.
- Verify tags persist correctly per signed-in account and don't leak between users.
- Verify no regression to saved card lists (ARCA-61) or other card-detail functionality.
- Check edge cases: empty/duplicate tag names, applying the same tag twice, deleting a tag still applied to cards.

## Out of scope
- Performance/load testing.
- Any new feature work — issues found are filed as new tickets, not fixed here.

## Acceptance criteria
- [ ] All acceptance criteria from the build ticket verified pass/fail with evidence.
- [ ] Edge cases (empty/duplicate names, delete-while-applied) explicitly tested and results recorded.
- [ ] No regression found in saved card lists or card-detail page; if found, filed as a separate ticket.
