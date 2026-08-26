import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { pricingRouter } from "./handlers";

/**
 * ARCA-54: `GET /api/pricing/keys` must reach the key handler, not the card handler.
 *
 * Hono matches routes in registration order. `/keys` used to be declared after `/:cardId`, so the
 * request bound `cardId = "keys"`, found no such card, and returned
 * `{"error":"No prices found for this card"}` with a 404 — on the Settings page, with no card in
 * view. Every user saw two nonsense toasts and an API-key list that never loaded, on the one page
 * whose whole job is handling credentials.
 *
 * There are two tests here and they are not the same test.
 *
 * The BEHAVIOUR test proves the bug is gone today. The ORDERING test proves it cannot come back:
 * the bug was never in a handler, it was in the sequence of registrations, and a behaviour test
 * would keep passing while someone adds the next static route below the dynamic ones and
 * reintroduces exactly this for a different path. That was the risk the lane's own plan named, so
 * it gets its own assertion rather than a comment asking people to be careful.
 */

const app = new Hono();
app.route("/api/pricing", pricingRouter);

describe("ARCA-54 — /pricing/keys is not shadowed by /pricing/:cardId", () => {
  test("GET /keys reaches the key handler", async () => {
    const res = await app.request("/api/pricing/keys", {
      headers: { "X-User-Id": "arca54-test-user" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { keys?: unknown; error?: string };
    // The shape is what matters, not the contents: a user with no keys correctly has none, and the
    // failure being guarded against returned an `error` instead of a `keys` array.
    expect(Array.isArray(body.keys)).toBe(true);
    expect(body.error).toBeUndefined();
  });

  test("the shadowed response is gone, specifically", async () => {
    // Named exactly, because this string is what a founder actually saw on the Settings page.
    const res = await app.request("/api/pricing/keys", {
      headers: { "X-User-Id": "arca54-test-user" },
    });
    const body = (await res.json()) as { error?: string };
    expect(body.error).not.toBe("No prices found for this card");
  });

  test("the dynamic card route still works — the move did not break it", async () => {
    // Reordering could have shadowed the thing it was rescuing us from. A card that does not exist
    // must still 404 through the CARD handler, with the card handler's message.
    const res = await app.request("/api/pricing/no-such-card-arca54");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("No prices found for this card");
  });

  test("every static route is registered before the dynamic ones", () => {
    // The regression test proper. Read as source rather than through the router, because Hono does
    // not expose registration order and the ORDER is the thing that broke.
    const src = readFileSync(join(import.meta.dir, "handlers.ts"), "utf8");
    const routes = [...src.matchAll(/pricingRouter\.(get|post|put|delete)\("([^"]+)"/g)].map(
      // The capture groups are guaranteed by the pattern that matched, but the type is not — and a
      // non-null assertion here would be the same shrug that ARCA-65 spent a ticket removing.
      (m, i) => ({ index: i, method: m[1] ?? "", path: m[2] ?? "" }),
    );

    expect(routes.length).toBeGreaterThan(0);

    // A path whose FIRST segment is a literal. `/keys/:provider` counts as static: it can only ever
    // be reached by a request starting `/keys`, so it never competes with `/:cardId`.
    const isStatic = (p: string) => !(p.slice(1).split("/")[0] ?? "").startsWith(":");

    const firstDynamic = routes.find((r) => !isStatic(r.path));
    if (!firstDynamic) return; // no dynamic routes left — nothing to shadow anything

    const staticAfter = routes.filter((r) => isStatic(r.path) && r.index > firstDynamic.index);

    expect(
      staticAfter.map((r) => `${r.method.toUpperCase()} ${r.path}`),
      `these are registered after the dynamic route "${firstDynamic.path}" and will be shadowed — move them above it (ARCA-54)`,
    ).toEqual([]);
  });
});
