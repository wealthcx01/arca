import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/index.ts";
import { auctionListings, auctionSourceStatus } from "./schema.ts";

export const auctionsRouter = new Hono();

// ---------------------------------------------------------------------------
// GET /status — Ingestion source health (must be registered before /:cardId-style
// routes if any are added later; see ARCA-54's ordering note in pricing/handlers.ts)
// ---------------------------------------------------------------------------

auctionsRouter.get("/status", (c) => {
  const db = getDb();
  const statuses = db.select().from(auctionSourceStatus).all();
  return c.json({ sources: statuses });
});

// ---------------------------------------------------------------------------
// GET / — List stored listings, optionally filtered by card_id
// ---------------------------------------------------------------------------

auctionsRouter.get("/", (c) => {
  const db = getDb();
  const cardId = c.req.query("card_id");

  const listings = cardId
    ? db
        .select()
        .from(auctionListings)
        .where(eq(auctionListings.card_id, cardId))
        .orderBy(desc(auctionListings.end_time))
        .all()
    : db.select().from(auctionListings).orderBy(desc(auctionListings.end_time)).all();

  return c.json({ data: listings });
});
