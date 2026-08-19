import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db";
import { cardsRouter } from "./handlers";
import { cards } from "./schema";

/**
 * Coverage for ARCA-50: set_name must be present on every card the
 * /api/cards* endpoints return, since CardsPage/CardDetailPage rely on it.
 *
 * ARCA-34: this test used to assume the catalog was already seeded. That is true on a developer's
 * machine and false everywhere else, so on a clean checkout it did not fail with "set_name is
 * missing" — it fell over reading `data[0].id` of an empty list. A test that only runs where
 * someone has already run the seeder is a test CI cannot use.
 *
 * It now brings its own two cards and removes them afterwards, so it verifies the same contract on
 * an empty database as on a full one.
 */

const app = new Hono();
app.route("/api/cards", cardsRouter);

/** Recognisable, and namespaced so a failed run cannot be mistaken for real catalog data. */
const FIXTURES = [
  {
    external_id: "arca34-test-001",
    name: "Test Card Alpha",
    set_name: "Test Set",
    set_code: "TST",
    card_number: "1",
    supertype: "Pokémon",
    image_url: "https://images.pokemontcg.io/tst/1.png",
  },
  {
    external_id: "arca34-test-002",
    name: "Test Card Beta",
    set_name: "Another Test Set",
    set_code: "TST2",
    card_number: "2",
    supertype: "Pokémon",
    image_url: "https://images.pokemontcg.io/tst2/2.png",
  },
];

beforeAll(() => {
  const db = getDb();
  for (const fixture of FIXTURES) {
    db.insert(cards).values(fixture).onConflictDoNothing().run();
  }
});

afterAll(() => {
  const db = getDb();
  for (const fixture of FIXTURES) {
    db.delete(cards).where(eq(cards.external_id, fixture.external_id)).run();
  }
});

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
    expect(listBody.data.length).toBeGreaterThan(0);
    const id = listBody.data[0].id;

    const res = await app.request(`/api/cards/${id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.data.set_name).toBe("string");
    expect(body.data.set_name.length).toBeGreaterThan(0);
  });

  // ARCA-53: CardDetailPage reads name/card_number/image_url off the same response — a
  // shape-mismatch regression here silently blanks the header and breaks the card image.
  test("a single card includes non-empty name, card_number, and image_url", async () => {
    const listRes = await app.request("/api/cards?limit=1");
    const listBody = await listRes.json();
    expect(listBody.data.length).toBeGreaterThan(0);
    const id = listBody.data[0].id;

    const res = await app.request(`/api/cards/${id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.data.name).toBe("string");
    expect(body.data.name.length).toBeGreaterThan(0);
    expect(typeof body.data.card_number).toBe("string");
    expect(body.data.card_number.length).toBeGreaterThan(0);
    expect(typeof body.data.image_url).toBe("string");
    expect(body.data.image_url.length).toBeGreaterThan(0);
  });

  test("a nonexistent card id returns 404 with an error message", async () => {
    const res = await app.request("/api/cards/does-not-exist");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Card not found");
  });
});
