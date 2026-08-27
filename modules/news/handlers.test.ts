import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { newsRouter } from "./handlers";
import { isSafeHttpUrl, safeLinkHref } from "./url-safety";

/**
 * ARCA-73: nobody may publish market news without a session, and no stored URL may be clickable
 * unless it is http(s).
 *
 * Confirmed against a running stack before this was written: `POST /api/news` with no cookie, no
 * header and no credential of any kind returned HTTP 201, stored
 * `url: "javascript:alert(document.cookie)"`, and `GET /api/news` served it back to everyone.
 *
 * The XSS half was latent — nothing rendered the url — and ARCA-55 is the change that renders it.
 * So both halves are tested here rather than waiting for the page that makes it exploitable.
 */

describe("ARCA-73 — which URLs may be stored and clicked", () => {
  test("ordinary links are fine", () => {
    expect(isSafeHttpUrl("https://www.pokebeach.com/article")).toBe(true);
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
  });

  test("the payload that was actually stored is refused", () => {
    expect(isSafeHttpUrl("javascript:alert(document.cookie)")).toBe(false);
  });

  test("the other ways to put code in an href are refused too", () => {
    // An allowlist of two schemes, not a blocklist of the ones we happened to think of.
    for (const u of [
      "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "JAVASCRIPT:alert(1)",
      "  javascript:alert(1)  ",
    ]) {
      expect(isSafeHttpUrl(u), u).toBe(false);
    }
  });

  test("a scheme split across whitespace does not sneak through", () => {
    // The case a regex on the raw string gets wrong and a parser gets right.
    expect(isSafeHttpUrl("java\nscript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("java\tscript:alert(1)")).toBe(false);
  });

  test("a relative path is not a news link", () => {
    expect(isSafeHttpUrl("/cards/base1-4")).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
    expect(isSafeHttpUrl(undefined)).toBe(false);
  });

  test("safeLinkHref gives the render side one answer instead of two steps", () => {
    expect(safeLinkHref("https://example.com/a")).toBe("https://example.com/a");
    expect(safeLinkHref("javascript:alert(1)")).toBe(null);
  });
});

describe("ARCA-73 — the write path", () => {
  // The router alone, without server.ts's auth middleware: this asserts the URL rule, which must
  // hold even for a signed-in user. The middleware itself is asserted in the block below, through
  // the real server rather than a copy of the guard.
  const app = new Hono();
  app.route("/api/news", newsRouter);

  test("a javascript: url is refused even from an authenticated caller", async () => {
    const res = await app.request("/api/news", {
      method: "POST",
      headers: { "content-type": "application/json", "X-User-Id": "arca73-test" },
      body: JSON.stringify({
        title: "probe",
        source: "test",
        url: "javascript:alert(document.cookie)",
      }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error?: string }).error).toMatch(/http\(s\)/);
  });

  test("an item with no url at all is still allowed", async () => {
    // Plenty of real news has no link. The rule is about what a url may be, not that there must be one.
    const res = await app.request("/api/news", {
      method: "POST",
      headers: { "content-type": "application/json", "X-User-Id": "arca73-test" },
      body: JSON.stringify({ title: "ARCA-73 test — no url", source: "arca73-test" }),
    });
    expect(res.status).toBe(201);
  });
});

describe("ARCA-73 — the guard, through the real server", () => {
  // `server.ts` exports `{ port, fetch }` rather than binding a port, so the ACTUAL middleware stack
  // can be exercised here. Re-implementing the guard in a test would only prove the copy works,
  // which is exactly the reassurance that lets the original rot.
  const fetchApp = async (req: Request) => (await import("../../server")).default.fetch(req);

  test("POST with no credential is refused, and nothing is written", async () => {
    const res = await fetchApp(
      new Request("http://arca.test/api/news", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "unauthenticated probe",
          source: "arca73-guard",
          url: "javascript:alert(document.cookie)",
        }),
      }),
    );
    expect(res.status).toBe(401);

    // 401 is worth little if the row landed anyway. This is the assertion the vulnerability was.
    const feed = await fetchApp(new Request("http://arca.test/api/news"));
    const body = (await feed.json()) as { data?: Array<{ source?: string }> };
    const items = body.data ?? [];
    expect(items.some((i) => i.source === "arca73-guard")).toBe(false);
  });

  test("an expired or bogus session is refused too", async () => {
    const res = await fetchApp(
      new Request("http://arca.test/api/news", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer not-a-real-session" },
        body: JSON.stringify({ title: "probe", source: "arca73-guard" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  test("reading the feed stays public — the fix must not take that with it", async () => {
    // The feed is meant to be readable without an account. Blanket middleware on the path would have
    // broken this to fix the write, which is why the guard is method-aware.
    const res = await fetchApp(new Request("http://arca.test/api/news"));
    expect(res.status).toBe(200);
  });
});
