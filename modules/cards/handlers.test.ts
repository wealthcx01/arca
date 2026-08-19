import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { cardsRouter } from "./handlers";

/**
 * Coverage for ARCA-50: set_name must be present on every card the
 * /api/cards* endpoints return, since CardsPage/CardDetailPage rely on it.
 */

const app = new Hono();
app.route("/api/cards", cardsRouter);

describe("GET /api/cards", () => {
  test("every returned card has a non-empty set_name", async () => {
    const res = await app.request("/api/cards?limit=50");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    for (const card of body.data) {
      expect(typeof card.set_name).toBe("string");
      expect(card.set_name.length).toBeGreaterThan(0);
    }
  });
});

describe("GET /api/cards/:id", () => {
  test("a single card includes a non-empty set_name", async () => {
    const listRes = await app.request("/api/cards?limit=1");
    const listBody = await listRes.json();
    const id = listBody.data[0].id;

    const res = await app.request(`/api/cards/${id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.data.set_name).toBe("string");
    expect(body.data.set_name.length).toBeGreaterThan(0);
  });
});
