
# ARCA-68 — Build: in-app notifications for watched auctions ending soon

**Status:** Todo · **Area:** Auctions/Notifications · **Depends on:** ARCA-70

## Why this matters (for the founder)
Traders can't watch the Auctions view constantly — an in-app alert when a card they care about is about to close means ARCA is useful even when they're not staring at the screen.

## Context
v1 is in-app only, as agreed with the founder — no email or push notifications in this phase. This sits on top of the auctions view and ingestion pipeline built in the previous two tickets.

## Scope
- Let a user mark a card (or a live auction) as "watched" from the Auctions view.
- Show an in-app notification when a watched card's auction is ending soon (exact lead time e.g. 15/30/60 min — pick one sensible default, confirm with founder if needed).
- Notification is visible within the app (e.g. a notification centre or banner) — no email, push, or SMS.
- Notifications clear or mark as read once acted on or expired.

## Out of scope
- No email, push, or SMS notifications — in-app only for v1.
- No auto-bidding or any transactional action from a notification.
- No notification preferences/settings screen beyond the basic watch toggle, unless trivial.

## Acceptance criteria
- [ ] User can mark a card/listing as watched from the Auctions view.
- [ ] An in-app notification appears when a watched auction is within the defined lead time of ending.
- [ ] Notifications are viewable in-app (list or banner) and can be dismissed/marked read.
- [ ] No email/push/SMS is sent as part of this ticket.