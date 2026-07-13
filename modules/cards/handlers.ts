import { and, count, eq, like } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/index.ts";
import { cards } from "./schema.ts";

export const cardsRouter = new Hono();

// ---------------------------------------------------------------------------
// GET /sets — List all unique sets with card counts
// Must be registered before /:id to avoid route collision.
// ---------------------------------------------------------------------------

cardsRouter.get("/sets", (c) => {
  const db = getDb();

  const results = db
    .select({
      set_code: cards.set_code,
      set_name: cards.set_name,
      card_count: count(cards.id),
    })
    .from(cards)
    .groupBy(cards.set_code, cards.set_name)
    .orderBy(cards.set_name)
    .all();

  return c.json({ data: results });
});

// ---------------------------------------------------------------------------
// GET / — Search cards with optional filters
// Query params: q (name search), set (set_code), rarity, supertype, page, limit
// ---------------------------------------------------------------------------

cardsRouter.get("/", (c) => {
  const db = getDb();

  const q = c.req.query("q");
  const set = c.req.query("set");
  const rarity = c.req.query("rarity");
  const supertype = c.req.query("supertype");
  const page = Math.max(1, Number(c.req.query("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") || "20")));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (q) {
    conditions.push(like(cards.name, `%${q}%`));
  }
  if (set) {
    conditions.push(eq(cards.set_code, set));
  }
  if (rarity) {
    conditions.push(eq(cards.rarity, rarity));
  }
  if (supertype) {
    conditions.push(eq(cards.supertype, supertype));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const totalResult = db
    .select({ total: count(cards.id) })
    .from(cards)
    .where(whereClause)
    .get();

  const total = totalResult?.total ?? 0;

  const results = db
    .select()
    .from(cards)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(cards.name)
    .all();

  return c.json({
    data: results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ---------------------------------------------------------------------------
// GET /:id — Get a single card by ID
// ---------------------------------------------------------------------------

cardsRouter.get("/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const card = db.select().from(cards).where(eq(cards.id, id)).get();

  if (!card) {
    return c.json({ error: "Card not found" }, 404);
  }

  return c.json({ data: card });
});
