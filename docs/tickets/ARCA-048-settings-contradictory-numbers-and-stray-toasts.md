# ARCA-48 — Settings can never list saved API keys (route-order bug), plus contradictory sync counts

**Status:** Planned · **Area:** Backend/Bug · **Depends on:** ARCA-7, ARCA-25

## Context
Filed from the ARCA-43 UI/UX audit, under "console errors and failed network requests" and "are
numbers labelled well enough to be trusted?"

## What I did
Signed up fresh, visited `/settings` at 1280, 1024, and 375px, and recorded console/network activity.
Then logged in via curl to isolate the failing request from the UI:
```
curl -c cookies.txt -X POST http://localhost:3001/api/auth/login -d '{"email":...,"password":...}'
curl -b cookies.txt -w "\nSTATUS:%{http_code}\n" http://localhost:3001/api/pricing/keys
```

## What happened
**Root cause — a genuine routing bug, not just a UI glitch.** `GET /api/pricing/keys` (meant to list
a user's saved BYOK API keys) returns `404 {"error":"No prices found for this card"}` even with a
valid, authenticated session. In `modules/pricing/handlers.ts`, the routes are registered in this
order:
```
72:  pricingRouter.get("/:cardId", ...)          <- catches "GET /keys" first, treating "keys" as a cardId
...
214: pricingRouter.get("/keys", ...)             <- dead code, never reached by any request
```
Hono matches routes in registration order, so any `GET /pricing/keys` request is captured by the
earlier `/:cardId` wildcard (there's no card with id `"keys"`, so its own "not found" handler fires),
and the real `/keys` handler at line 214 can never run. **This means the "list my saved API keys"
feature is completely broken for every user** — the Settings page can never show which BYOK
providers already have a key saved.

Visibly, this surfaces as: two `404 GET http://localhost:5173/api/pricing/keys` network errors, and
two toast notifications reading the raw backend error string "No prices found for this card" — on a
page with no card in view at all (`SettingsPage.tsx:40-42` calls
`api.get<{keys}>("/pricing/keys").then(...).catch((err) => toast.error(err.message || ...))`, so the
shadowed route's error body becomes the visible toast text verbatim). At 375px width, these two
toasts render on top of the "Save Key" button, fully covering it, blocking the Add API Key form on
mobile until dismissed.

**Separately, a contradictory number on the same page:** the "Pricing Sources" panel lists "TCGdex ·
0 cards synced" and "TCGCSV · 0 cards synced," while Overview's "Market Stats" panel (same account,
same moment) reports "Priced Cards: 439" out of 502 — prices clearly exist app-wide. Whether this is
measuring "synced since account creation" vs. seed-time data, the label doesn't say so, and the
number as shown contradicts what's visible three clicks away.

## What I expected
Settings to list any saved API keys per provider, and "cards synced" to either match the priced-card
count shown elsewhere or explain what it's actually counting.

## Repro steps
1. `curl` login, then `curl -b cookies.txt http://localhost:3001/api/pricing/keys` → 404 with the
   card-not-found error body, confirming the route bug independent of the browser.
2. In the browser: sign in, visit `/settings`, watch two "No prices found for this card" toasts and
   two 404s to `/api/pricing/keys` in the network tab.
3. Re-check at 375px — the toasts overlap the "Save Key" button.
4. Compare "0 cards synced" on `/settings` against "Priced Cards: 439" on `/overview`.

## Acceptance criteria
- [ ] `GET /api/pricing/keys` returns the user's saved keys (move it before `/:cardId`, or namespace
      it, e.g. `/keys` routes registered ahead of the wildcard `/:cardId` routes).
- [ ] No "No prices found for this card" toast appears on `/settings`.
- [ ] "Cards synced" count is accurate against the priced-card total or its label explains the
      discrepancy.
