# ARCA-54 — Settings page can't load API keys: `/pricing/keys` is shadowed by `/pricing/:cardId`

**Status:** Todo · **Area:** Settings/Pricing · **Depends on:** —

## Why this matters (for the founder)
BYOK (bring-your-own-key) pricing is a real, built feature — four of the six providers listed in
Settings require a key. The page that manages those keys is broken for every user: it fails to load
existing keys and shows a card-pricing error message that has nothing to do with API keys, which
undermines trust in a page whose entire job is handling credentials.

## Context
Found during the ARCA-43 UI/UX audit. Steps taken: signed in, opened Settings.

**What happened:** two toast notifications appear reading "No prices found for this card" — a
message that makes no sense on a settings page with no card in view. The API-key list under "Add API
Key" never populates. Confirmed at 1024, 1280, and 375 widths.

**Network/console:**
```
404 http://localhost:5173/api/pricing/keys
Failed to load resource: the server responded with a status of 404 (Not Found)
```

**Root cause:** in `modules/pricing/handlers.ts`, the dynamic route
`pricingRouter.get("/:cardId", ...)` (line 72) is registered *before* the static route
`pricingRouter.get("/keys", ...)` (line 214). Hono matches routes in registration order, so a
request to `GET /api/pricing/keys` matches `/:cardId` with `cardId = "keys"` instead of the intended
handler — and that handler returns `{"error":"No prices found for this card"}` with a 404, because
there's no card with id `"keys"`. Confirmed directly against the backend, bypassing the frontend:
```
$ curl -b cookies.txt http://localhost:3001/api/pricing/keys
{"error":"No prices found for this card"}   HTTP 404
```
`SettingsPage.tsx` (`client/src/pages/SettingsPage.tsx:40`) calls this endpoint on mount and surfaces
the error via a toast, which is why it fires on every Settings visit.

**Expected:** Settings loads the signed-in user's configured API keys (or an empty list if none are
set), with no error toast.
**Actual:** the request always 404s with a misleading message, and the toast appears twice on every
Settings page load. At narrower widths (1024 and especially 375) the toast stack visually overlaps
the "Select provider" dropdown and "Paste API key" input, making the Add API Key form harder to use
while the toasts are visible.

**Reproduce:** sign in, navigate to `/settings`, observe the toasts and the empty/never-loading key
list. Or directly: `curl -b <session-cookie> http://localhost:3001/api/pricing/keys`.

## Scope
- Reorder the routes in `modules/pricing/handlers.ts` so static paths (`/keys`, `/keys/:provider`,
  `/keys/:provider/toggle`, `/sources`, `/fx`) are registered before the dynamic `/:cardId` family,
  or scope the dynamic routes under a prefix that can't collide with reserved words.
- Confirm `POST /pricing/keys`, `DELETE /pricing/keys/:provider`, and
  `PUT /pricing/keys/:provider/toggle` aren't affected by the same ordering issue (they use
  different HTTP methods so may already be fine, but verify).
- Add a regression test asserting `GET /api/pricing/keys` returns the keys list shape, not a
  card-not-found error.

## Out of scope
- Any redesign of the Settings page layout or the toast component itself.
- The "0 cards synced" labeling issue on the same page — filed separately as ARCA-57.

## Acceptance criteria
- [ ] `GET /api/pricing/keys` returns the user's key list (200), not a 404 "No prices found" error.
- [ ] Loading `/settings` produces no error toast related to card pricing.
- [ ] Existing BYOK keys (if any) are visible in the Settings UI after this fix.
