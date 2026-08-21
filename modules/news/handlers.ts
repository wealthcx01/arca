/**
 * Market news API — manual entry + future RSS/scraping.
 * Routes mounted at /api/news.
 */

import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/index.ts";
import { marketNews } from "../analytics/schema.ts";

export const newsRouter = new Hono();

// ---------------------------------------------------------------------------
// GET /news — List recent news
// ---------------------------------------------------------------------------

newsRouter.get("/", (c) => {
  const db = getDb();
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") || "20")));

  const data = db
    .select()
    .from(marketNews)
    .orderBy(desc(marketNews.published_at))
    .limit(limit)
    .all();

  return c.json({ data });
});

// ---------------------------------------------------------------------------
// GET /news/:cardId — News related to a specific card
// ---------------------------------------------------------------------------

newsRouter.get("/:cardId", (c) => {
  const cardId = c.req.param("cardId");
  const db = getDb();

  // Search card_ids JSON array for the card ID
  const data = db.all(sql`
    SELECT * FROM market_news
    WHERE card_ids LIKE ${`%"${cardId}"%`}
    ORDER BY published_at DESC
    LIMIT 20
  `);

  return c.json({ data });
});

// ---------------------------------------------------------------------------
// POST /news — Create a news entry (admin)
// ---------------------------------------------------------------------------

newsRouter.post("/", async (c) => {
  const body = await c.req.json<{
    title: string;
    summary?: string;
    source: string;
    url?: string;
    published_at?: number;
    card_ids?: string[];
    sentiment?: "positive" | "negative" | "neutral";
  }>();

  if (!body.title || !body.source) {
    return c.json({ error: "title and source are required" }, 400);
  }

  const db = getDb();

  const result = db
    .insert(marketNews)
    .values({
      title: body.title,
      summary: body.summary ?? null,
      source: body.source,
      url: body.url ?? null,
      published_at: new Date(body.published_at ?? Date.now()),
      card_ids: body.card_ids ? JSON.stringify(body.card_ids) : null,
      sentiment: body.sentiment ?? "neutral",
    })
    .returning()
    .get();

  return c.json({ data: result }, 201);
});
