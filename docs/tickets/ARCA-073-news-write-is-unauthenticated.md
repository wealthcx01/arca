# ARCA-073 — Anyone can publish "market news" to ARCA, and the next feature makes it stored XSS

**Status:** Shipped · **Area:** Security/News · **Depends on:** —

Worked by hand rather than released to the lane. The lane had already failed three times on the
adjacent ARCA-55 and this is the change that unblocks it; a security fix is the wrong place to spend
a fourth attempt.

## Why this matters (for the founder)
Right now any stranger on the internet can insert an item into ARCA's market-news feed, with no
account and no key. Nobody has to be logged in and nothing checks who they are. On a product whose
whole promise is telling a collector what their cards are worth, someone else being able to publish
"news" into it is a trust problem before it is a technical one.

It gets worse the moment we show those items as links — which is exactly what ARCA-55 is trying to
do — because a stored link can run code in a signed-in user's browser.

## How this was found
The lane's own `/review` refused to ship ARCA-55 three times over, and its reason was this. It was
right, and this ticket is that reason written down rather than lost in a run report.

## Confirmed, not assumed
Against a running stack on 2026-08-27, with no cookie, no header, no credential of any kind:

```
$ curl -X POST http://localhost:3001/api/news -H 'content-type: application/json' \
    -d '{"title":"probe","source":"security-check","url":"javascript:alert(document.cookie)"}'
HTTP 201
{"data":{"id":"4zr612oi3kp6","title":"probe","url":"javascript:alert(document.cookie)", ...}}
```

It persisted, and `GET /api/news` served it back to everyone. (The probe row was deleted again.)

## Root cause
`server.ts` mounts auth middleware on three prefixes only — `/api/portfolio/*`,
`/api/pricing/keys/*`, `/api/performance/*` (lines 37, 48, 58). `app.route("/api/news", newsRouter)`
at line 82 is outside all of them, and `newsRouter.post("/")` in `modules/news/handlers.ts:54` reads
the body and inserts. There is no check of any kind, and `url` is stored exactly as sent.

## The second half, which is why this is urgent rather than untidy
Today the injected `url` is inert: nothing in the client renders it, so a bad row is misinformation
and nothing more. **ARCA-55 changes that.** It wires `/news` to the client and renders each item's
`url` as a live `target="_blank"` anchor — at which point a stored `javascript:` or `data:` URI runs
in the session of whoever clicks it. An open write endpoint plus an unvalidated render is stored XSS;
we currently have the first half shipped and the second half in flight.

ARCA-55 is parked at its attempt limit and cannot proceed until this is fixed.

## Scope
- Require authentication for `POST /api/news`, the same way the other write paths do it. Reads stay
  public — the feed is meant to be readable.
- Validate the URL where it is **stored** and again where it is **rendered**: allow `http:` and
  `https:` only, reject everything else. Both, because an allowlist at one end is a single point of
  failure and the data already in the table was written under no rules at all.
- Check what is already in `market_news` on any deployed instance and remove anything whose `url` is
  not `http(s):`.
- Cover it: an unauthenticated POST is refused; a `javascript:` URL is refused on write; an existing
  bad row does not render as a live link.

## Out of scope
- The rest of ARCA-30 (cookie flags, rate limiting, CSRF, password reset, adopting `better-auth`).
  ARCA-30 names the news endpoint in passing and stays the home for the broader auth work; this is
  the one exploitable path pulled out so it can ship on its own rather than waiting for all of it.
- Any change to how news is displayed beyond the URL check — ARCA-55 owns that surface.

## Acceptance criteria
- [x] `POST /api/news` with no session returns 401 **and writes nothing** — the second half asserted
      separately, because a 401 is worth little if the row lands anyway.
- [x] A `javascript:`, `data:`, `vbscript:` or `file:` URL is rejected on write, whoever is signed in,
      including the case-folded and whitespace-split variants a regex would miss.
- [x] `safeLinkHref` gives the render side one answer instead of two steps, so ARCA-55 has something
      to use rather than a rule to remember. Nothing renders a news URL on master today, which is why
      the XSS half is still latent.
- [x] `scripts/purge-unsafe-news-urls.ts` finds and clears them, reports before it writes, and counts
      afterwards rather than trusting its own loop. It clears the URL and keeps the row: the URL is
      the untrustworthy part, and deleting the row would throw away real content to fix a field.
- [x] The guard is tested **through the real server** (`server.ts` exports `fetch`, so the actual
      middleware stack runs) rather than through a re-implementation. Checked against the old code:
      those two tests fail, which is the only thing that makes them worth having.
- [x] Reading the feed stays public — asserted, because blanket middleware on the path would have
      broken that to fix the write.
- [ ] ARCA-55 taken off its attempt limit and retried. Its `gaveup` marker is still on the box; clear
      it once this merges.
