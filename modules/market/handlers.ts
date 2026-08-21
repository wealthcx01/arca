import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/index.ts";
import { cards } from "../cards/schema.ts";
import { cardPrices, fxRates, gradedPrices, priceHistory } from "../pricing/schema.ts";

export const marketRouter = new Hono();

// ---------------------------------------------------------------------------
// GET /overview — Aggregated overview data
// ---------------------------------------------------------------------------

marketRouter.get("/overview", (c) => {
  const db = getDb();

  // Total cards with prices
  const cardCount = db
    .select({ total: count(cards.id) })
    .from(cards)
    .get();

  // Total priced cards
  const pricedCount = db
    .select({ total: sql<number>`COUNT(DISTINCT ${cardPrices.card_id})` })
    .from(cardPrices)
    .get();

  // Latest FX rates
  const latestFx = db.select().from(fxRates).orderBy(desc(fxRates.fetched_at)).limit(20).all();

  const fxMap: Record<string, { rate: number; base: string; quote: string }> = {};
  for (const r of latestFx) {
    const key = `${r.base}_${r.quote}`;
    if (!fxMap[key]) fxMap[key] = { rate: r.rate, base: r.base, quote: r.quote };
  }

  return c.json({
    total_cards: cardCount?.total ?? 0,
    priced_cards: pricedCount?.total ?? 0,
    fx_rates: Object.values(fxMap),
  });
});

// ---------------------------------------------------------------------------
// GET /sets — Set-level price indices
// ---------------------------------------------------------------------------

marketRouter.get("/sets", (c) => {
  const db = getDb();
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") || "30")));

  // Get set-level aggregates: card count, avg market price, total value
  const results = db.all(sql`
    SELECT
      c.set_code,
      c.set_name,
      COUNT(DISTINCT c.id) as card_count,
      COALESCE(AVG(cp.market_price_cents), 0) as avg_price_cents,
      COALESCE(SUM(cp.market_price_cents), 0) as total_value_cents,
      MAX(cp.fetched_at) as last_updated
    FROM cards c
    LEFT JOIN card_prices cp ON c.id = cp.card_id AND cp.conflated_rank = 1
    GROUP BY c.set_code, c.set_name
    HAVING avg_price_cents > 0
    ORDER BY total_value_cents DESC
    LIMIT ${limit}
  `);

  return c.json({ data: results });
});

// ---------------------------------------------------------------------------
// GET /sets/:setCode — Detailed set analysis
// ---------------------------------------------------------------------------

marketRouter.get("/sets/:setCode", (c) => {
  const setCode = c.req.param("setCode");
  const db = getDb();

  // Set info
  const setInfo = db
    .select({
      set_code: cards.set_code,
      set_name: cards.set_name,
      card_count: count(cards.id),
    })
    .from(cards)
    .where(eq(cards.set_code, setCode))
    .groupBy(cards.set_code, cards.set_name)
    .get();

  if (!setInfo) return c.json({ error: "Set not found" }, 404);

  // Cards in set with prices
  const setCards = db.all(sql`
    SELECT
      c.id,
      c.name,
      c.card_number,
      c.rarity,
      c.image_url,
      COALESCE(cp.market_price_cents, 0) as market_price_cents,
      cp.currency,
      cp.fetched_at
    FROM cards c
    LEFT JOIN card_prices cp ON c.id = cp.card_id AND cp.conflated_rank = 1
    WHERE c.set_code = ${setCode}
    ORDER BY COALESCE(cp.market_price_cents, 0) DESC
  `);

  return c.json({ set: setInfo, cards: setCards });
});

// ---------------------------------------------------------------------------
// GET /movers — Top gainers/losers by price change
// ---------------------------------------------------------------------------

marketRouter.get("/movers", (c) => {
  const db = getDb();
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") || "20")));
  const period = c.req.query("period") || "7d";
  const set = c.req.query("set");
  const rarity = c.req.query("rarity");
  const sort = c.req.query("sort") || "pct_change";

  const daysMap: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 };
  const days = daysMap[period] ?? 7;
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

  let setFilter = "";
  let rarityFilter = "";
  if (set) setFilter = `AND c.set_code = '${set.replace(/'/g, "''")}'`;
  if (rarity) rarityFilter = `AND c.rarity = '${rarity.replace(/'/g, "''")}'`;

  const orderBy = sort === "abs_change" ? "abs_change_cents" : "abs_pct_change";

  const results = db.all(
    sql.raw(`
    SELECT
      c.id,
      c.name,
      c.set_name,
      c.set_code,
      c.rarity,
      c.image_url,
      current_p.market_price_cents as current_price_cents,
      current_p.currency,
      old_p.market_price_cents as old_price_cents,
      (current_p.market_price_cents - old_p.market_price_cents) as change_cents,
      CASE WHEN old_p.market_price_cents > 0
        THEN ROUND(CAST((current_p.market_price_cents - old_p.market_price_cents) AS REAL) / old_p.market_price_cents * 100, 2)
        ELSE 0
      END as pct_change,
      ABS(current_p.market_price_cents - old_p.market_price_cents) as abs_change_cents,
      ABS(CASE WHEN old_p.market_price_cents > 0
        THEN CAST((current_p.market_price_cents - old_p.market_price_cents) AS REAL) / old_p.market_price_cents * 100
        ELSE 0
      END) as abs_pct_change
    FROM cards c
    INNER JOIN card_prices current_p ON c.id = current_p.card_id AND current_p.conflated_rank = 1
    INNER JOIN (
      SELECT card_id, currency, market_price_cents,
        ROW_NUMBER() OVER (PARTITION BY card_id, currency ORDER BY recorded_at ASC) as rn
      FROM price_history
      WHERE recorded_at >= ${cutoffMs}
        AND market_price_cents IS NOT NULL AND market_price_cents > 0
    ) old_p ON c.id = old_p.card_id AND old_p.rn = 1 AND old_p.currency = current_p.currency
    WHERE current_p.market_price_cents IS NOT NULL
      AND current_p.market_price_cents > 0
      AND old_p.market_price_cents IS NOT NULL
      ${setFilter}
      ${rarityFilter}
    ORDER BY ${orderBy} DESC
    LIMIT ${limit}
  `),
  );

  return c.json({ data: results, period, days });
});

// ---------------------------------------------------------------------------
// GET /alerts — Significant price movements (>5%)
// ---------------------------------------------------------------------------

marketRouter.get("/alerts", (c) => {
  const db = getDb();
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") || "20")));
  const period = c.req.query("period") || "7d";
  const daysMap: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30 };
  const days = daysMap[period] ?? 7;
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

  const results = db.all(sql`
    SELECT
      c.id,
      c.name,
      c.set_name,
      c.rarity,
      c.image_url,
      current_p.market_price_cents as current_price_cents,
      current_p.currency,
      old_p.market_price_cents as old_price_cents,
      (current_p.market_price_cents - old_p.market_price_cents) as change_cents,
      CASE WHEN old_p.market_price_cents > 0
        THEN ROUND(CAST((current_p.market_price_cents - old_p.market_price_cents) AS REAL) / old_p.market_price_cents * 100, 2)
        ELSE 0
      END as pct_change
    FROM cards c
    INNER JOIN card_prices current_p ON c.id = current_p.card_id AND current_p.conflated_rank = 1
    INNER JOIN (
      SELECT card_id, currency, market_price_cents,
        ROW_NUMBER() OVER (PARTITION BY card_id, currency ORDER BY recorded_at ASC) as rn
      FROM price_history
      WHERE recorded_at >= ${cutoffMs}
        AND market_price_cents IS NOT NULL AND market_price_cents > 0
    ) old_p ON c.id = old_p.card_id AND old_p.rn = 1 AND old_p.currency = current_p.currency
    WHERE current_p.market_price_cents IS NOT NULL
      AND current_p.market_price_cents > 0
      AND ABS(CASE WHEN old_p.market_price_cents > 0
        THEN CAST((current_p.market_price_cents - old_p.market_price_cents) AS REAL) / old_p.market_price_cents * 100
        ELSE 0
      END) >= 5.0
    ORDER BY ABS(CASE WHEN old_p.market_price_cents > 0
        THEN CAST((current_p.market_price_cents - old_p.market_price_cents) AS REAL) / old_p.market_price_cents * 100
        ELSE 0
      END) DESC
    LIMIT ${limit}
  `);

  return c.json({ data: results, period, days });
});

// ---------------------------------------------------------------------------
// GET /ticker — Top 20 cards for rolling ticker
// ---------------------------------------------------------------------------

marketRouter.get("/ticker", (c) => {
  const db = getDb();

  // Use a deduplicated subquery to pick the best USD price per card
  const results = db.all(sql`
    SELECT
      c.name,
      c.set_name,
      best.price_cents,
      'USD' as currency,
      COALESCE(
        (best.price_cents - old_p.market_price_cents), 0
      ) as change_cents,
      CASE WHEN old_p.market_price_cents > 0
        THEN ROUND(CAST((best.price_cents - old_p.market_price_cents) AS REAL) / old_p.market_price_cents * 100, 2)
        ELSE 0.0
      END as change_pct
    FROM (
      SELECT card_id, MAX(market_price_cents) as price_cents
      FROM card_prices
      WHERE conflated_rank = 1
        AND market_price_cents IS NOT NULL AND market_price_cents > 0
        AND currency = 'USD'
      GROUP BY card_id
    ) best
    INNER JOIN cards c ON c.id = best.card_id
    LEFT JOIN (
      SELECT card_id, market_price_cents,
        ROW_NUMBER() OVER (PARTITION BY card_id ORDER BY recorded_at ASC) as rn
      FROM price_history
      WHERE recorded_at >= ${Date.now() - 7 * 24 * 60 * 60 * 1000}
        AND market_price_cents IS NOT NULL AND market_price_cents > 0
        AND currency = 'USD'
    ) old_p ON best.card_id = old_p.card_id AND old_p.rn = 1
    ORDER BY best.price_cents DESC
    LIMIT 20
  `);

  return c.json({ data: results });
});

// ---------------------------------------------------------------------------
// GET /graded — Bulk graded price comparison
// ---------------------------------------------------------------------------

marketRouter.get("/graded", (c) => {
  const db = getDb();
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") || "20")));
  const set = c.req.query("set");

  let setFilter = "";
  if (set) setFilter = `AND c.set_code = '${set.replace(/'/g, "''")}'`;

  const results = db.all(
    sql.raw(`
    SELECT
      c.id,
      c.name,
      c.set_name,
      c.set_code,
      c.rarity,
      c.image_url,
      cp.market_price_cents as raw_price_cents,
      cp.currency,
      gp.grading_company,
      gp.grade,
      gp.price_cents as graded_price_cents,
      CASE WHEN cp.market_price_cents > 0
        THEN ROUND(CAST((gp.price_cents - cp.market_price_cents) AS REAL) / cp.market_price_cents * 100, 1)
        ELSE 0
      END as premium_pct
    FROM graded_prices gp
    INNER JOIN cards c ON c.id = gp.card_id
    LEFT JOIN card_prices cp ON c.id = cp.card_id AND cp.conflated_rank = 1
    WHERE gp.price_cents > 0
      ${setFilter}
    ORDER BY gp.price_cents DESC
    LIMIT ${limit}
  `),
  );

  return c.json({ data: results });
});
