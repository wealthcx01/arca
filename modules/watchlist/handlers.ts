import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { getSession } from "../../db/auth.ts";
import { getDb } from "../../db/index.ts";
import { cards } from "../cards/schema.ts";
import { cardPrices } from "../pricing/schema.ts";
import { watchlistItems, watchlists } from "./schema.ts";

export const watchlistRouter = new Hono();

// Auth middleware — all watchlist routes require auth
watchlistRouter.use("*", async (c, next) => {
  const token =
    getCookie(c, "arca_session") || c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const user = getSession(token);
  if (!user) return c.json({ error: "Session expired" }, 401);
  c.req.raw.headers.set("X-User-Id", user.id);
  await next();
});

function getUserId(c: { req: { header: (name: string) => string | undefined } }): string {
  const userId = c.req.header("X-User-Id");
  if (!userId) throw new Error("Missing X-User-Id header");
  return userId;
}

// ---------------------------------------------------------------------------
// GET / — List user's watchlists
// ---------------------------------------------------------------------------

watchlistRouter.get("/", (c) => {
  const userId = getUserId(c);
  const db = getDb();

  const lists = db
    .select()
    .from(watchlists)
    .where(eq(watchlists.user_id, userId))
    .orderBy(watchlists.sort_order)
    .all();

  // Get item counts
  const result = lists.map((wl) => {
    const countResult = db
      .select({ total: sql<number>`COUNT(*)` })
      .from(watchlistItems)
      .where(eq(watchlistItems.watchlist_id, wl.id))
      .get();

    return { ...wl, item_count: countResult?.total ?? 0 };
  });

  return c.json({ data: result });
});

// ---------------------------------------------------------------------------
// POST / — Create watchlist
// ---------------------------------------------------------------------------

watchlistRouter.post("/", async (c) => {
  const userId = getUserId(c);
  const db = getDb();
  const body = await c.req.json<{ name: string }>();

  if (!body.name?.trim()) {
    return c.json({ error: "Name is required" }, 400);
  }

  const maxOrder = db
    .select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
    .from(watchlists)
    .where(eq(watchlists.user_id, userId))
    .get();

  const rows = db
    .insert(watchlists)
    .values({
      user_id: userId,
      name: body.name.trim(),
      sort_order: (maxOrder?.max ?? -1) + 1,
    })
    .returning()
    .all();

  return c.json({ data: rows[0] }, 201);
});

// ---------------------------------------------------------------------------
// GET /:id — Watchlist with enriched card prices
// ---------------------------------------------------------------------------

watchlistRouter.get("/:id", (c) => {
  const userId = getUserId(c);
  const db = getDb();
  const id = c.req.param("id");

  const wl = db
    .select()
    .from(watchlists)
    .where(and(eq(watchlists.id, id), eq(watchlists.user_id, userId)))
    .get();

  if (!wl) return c.json({ error: "Watchlist not found" }, 404);

  // Get items with card + price data
  const items = db.all(sql`
    SELECT
      wi.id,
      wi.card_id,
      wi.sort_order,
      wi.added_at,
      c.name as card_name,
      c.set_name,
      c.set_code,
      c.rarity,
      c.image_url,
      COALESCE(cp.market_price_cents, 0) as market_price_cents,
      COALESCE(cp.low_price_cents, 0) as low_price_cents,
      COALESCE(cp.mid_price_cents, 0) as mid_price_cents,
      COALESCE(cp.high_price_cents, 0) as high_price_cents,
      cp.currency,
      cp.fetched_at as price_updated_at
    FROM watchlist_items wi
    INNER JOIN cards c ON c.id = wi.card_id
    LEFT JOIN card_prices cp ON c.id = cp.card_id AND cp.conflated_rank = 1
    WHERE wi.watchlist_id = ${id}
    ORDER BY wi.sort_order ASC
  `);

  return c.json({ watchlist: wl, items });
});

// ---------------------------------------------------------------------------
// PUT /:id — Update watchlist name
// ---------------------------------------------------------------------------

watchlistRouter.put("/:id", async (c) => {
  const userId = getUserId(c);
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json<{ name: string }>();

  const wl = db
    .select()
    .from(watchlists)
    .where(and(eq(watchlists.id, id), eq(watchlists.user_id, userId)))
    .get();

  if (!wl) return c.json({ error: "Watchlist not found" }, 404);

  db.update(watchlists)
    .set({ name: body.name.trim(), updated_at: new Date() })
    .where(eq(watchlists.id, id))
    .run();

  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete watchlist and all its items
// ---------------------------------------------------------------------------

watchlistRouter.delete("/:id", (c) => {
  const userId = getUserId(c);
  const db = getDb();
  const id = c.req.param("id");

  const wl = db
    .select()
    .from(watchlists)
    .where(and(eq(watchlists.id, id), eq(watchlists.user_id, userId)))
    .get();

  if (!wl) return c.json({ error: "Watchlist not found" }, 404);

  db.delete(watchlistItems).where(eq(watchlistItems.watchlist_id, id)).run();
  db.delete(watchlists).where(eq(watchlists.id, id)).run();

  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /:id/items — Add card to watchlist
// ---------------------------------------------------------------------------

watchlistRouter.post("/:id/items", async (c) => {
  const userId = getUserId(c);
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json<{ card_id: string }>();

  // Verify ownership
  const wl = db
    .select()
    .from(watchlists)
    .where(and(eq(watchlists.id, id), eq(watchlists.user_id, userId)))
    .get();

  if (!wl) return c.json({ error: "Watchlist not found" }, 404);

  // Check card exists
  const card = db.select({ id: cards.id }).from(cards).where(eq(cards.id, body.card_id)).get();
  if (!card) return c.json({ error: "Card not found" }, 404);

  // Check duplicate
  const existing = db
    .select()
    .from(watchlistItems)
    .where(and(eq(watchlistItems.watchlist_id, id), eq(watchlistItems.card_id, body.card_id)))
    .get();

  if (existing) return c.json({ error: "Card already in watchlist" }, 409);

  const maxOrder = db
    .select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
    .from(watchlistItems)
    .where(eq(watchlistItems.watchlist_id, id))
    .get();

  const rows = db
    .insert(watchlistItems)
    .values({
      watchlist_id: id,
      card_id: body.card_id,
      sort_order: (maxOrder?.max ?? -1) + 1,
    })
    .returning()
    .all();

  return c.json({ data: rows[0] }, 201);
});

// ---------------------------------------------------------------------------
// DELETE /:id/items/:itemId — Remove card from watchlist
// ---------------------------------------------------------------------------

watchlistRouter.delete("/:id/items/:itemId", (c) => {
  const userId = getUserId(c);
  const db = getDb();
  const id = c.req.param("id");
  const itemId = c.req.param("itemId");

  // Verify ownership
  const wl = db
    .select()
    .from(watchlists)
    .where(and(eq(watchlists.id, id), eq(watchlists.user_id, userId)))
    .get();

  if (!wl) return c.json({ error: "Watchlist not found" }, 404);

  const item = db
    .select()
    .from(watchlistItems)
    .where(and(eq(watchlistItems.id, itemId), eq(watchlistItems.watchlist_id, id)))
    .get();

  if (!item) return c.json({ error: "Item not found" }, 404);

  db.delete(watchlistItems).where(eq(watchlistItems.id, itemId)).run();

  return c.json({ ok: true });
});
