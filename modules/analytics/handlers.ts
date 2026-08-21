/**
 * Analytics API endpoints — mounted at /api/analytics
 */

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/index.ts";
import { cards } from "../cards/schema.ts";
import { cardPrices } from "../pricing/schema.ts";
import { computeGradingAlpha } from "./grading-alpha.ts";
import { runDailyAnalytics } from "./jobs.ts";
import { backfillOHLC } from "./ohlc.ts";
import { computePortfolioRisk } from "./portfolio-analytics.ts";
import { cardAnalytics, cardOhlcDaily, marketIndexDaily, technicalIndicators } from "./schema.ts";

export const analyticsRouter = new Hono();

// ---------------------------------------------------------------------------
// GET /analytics/:cardId/ohlc — OHLC data
// ---------------------------------------------------------------------------

analyticsRouter.get("/:cardId/ohlc", (c) => {
  const cardId = c.req.param("cardId");
  const days = Math.min(365, Math.max(1, Number(c.req.query("days") || "30")));
  const currency = c.req.query("currency") || "USD";
  const db = getDb();

  const cutoffDate = new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
  const cutoffStr = cutoffDate.toISOString().split("T")[0]!;

  const data = db
    .select()
    .from(cardOhlcDaily)
    .where(
      and(
        eq(cardOhlcDaily.card_id, cardId),
        eq(cardOhlcDaily.currency, currency),
        gte(cardOhlcDaily.date, cutoffStr),
      ),
    )
    .orderBy(cardOhlcDaily.date)
    .all();

  return c.json({ data, card_id: cardId, currency, days });
});

// ---------------------------------------------------------------------------
// GET /analytics/:cardId/indicators — Technical indicators
// ---------------------------------------------------------------------------

analyticsRouter.get("/:cardId/indicators", (c) => {
  const cardId = c.req.param("cardId");
  const days = Math.min(365, Math.max(1, Number(c.req.query("days") || "90")));
  const currency = c.req.query("currency") || "USD";
  const indicatorParam = c.req.query("indicators") || "SMA_20,RSI_14,MACD";
  const db = getDb();

  const cutoffDate = new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
  const cutoffStr = cutoffDate.toISOString().split("T")[0]!;

  const requestedIndicators = indicatorParam.split(",").map((s) => s.trim());

  // Query all requested indicators
  const data: Record<string, Array<{ date: string; value_e6: number }>> = {};

  for (const indicator of requestedIndicators) {
    const rows = db
      .select({
        date: technicalIndicators.date,
        value_e6: technicalIndicators.value_e6,
      })
      .from(technicalIndicators)
      .where(
        and(
          eq(technicalIndicators.card_id, cardId),
          eq(technicalIndicators.currency, currency),
          eq(technicalIndicators.indicator, indicator),
          gte(technicalIndicators.date, cutoffStr),
        ),
      )
      .orderBy(technicalIndicators.date)
      .all();

    data[indicator] = rows;
  }

  return c.json({ data, card_id: cardId, currency, days });
});

// ---------------------------------------------------------------------------
// GET /analytics/:cardId/summary — Card analytics snapshot
// ---------------------------------------------------------------------------

analyticsRouter.get("/:cardId/summary", (c) => {
  const cardId = c.req.param("cardId");
  const currency = c.req.query("currency") || "USD";
  const db = getDb();

  const analytics = db
    .select()
    .from(cardAnalytics)
    .where(and(eq(cardAnalytics.card_id, cardId), eq(cardAnalytics.currency, currency)))
    .get();

  if (!analytics) {
    return c.json({ error: "No analytics data for this card" }, 404);
  }

  return c.json({ data: analytics });
});

// ---------------------------------------------------------------------------
// GET /analytics/:cardId/grading-alpha — Grading ROI by company/grade
// ---------------------------------------------------------------------------

analyticsRouter.get("/:cardId/grading-alpha", (c) => {
  const cardId = c.req.param("cardId");

  const alphas = computeGradingAlpha(cardId);
  return c.json({ data: alphas, card_id: cardId });
});

// ---------------------------------------------------------------------------
// GET /analytics/market-index — Market index history
// ---------------------------------------------------------------------------

analyticsRouter.get("/market-index", (c) => {
  const days = Math.min(365, Math.max(1, Number(c.req.query("days") || "90")));
  const db = getDb();

  const cutoffDate = new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
  const cutoffStr = cutoffDate.toISOString().split("T")[0]!;

  const data = db
    .select()
    .from(marketIndexDaily)
    .where(gte(marketIndexDaily.date, cutoffStr))
    .orderBy(marketIndexDaily.date)
    .all();

  return c.json({ data, days });
});

// ---------------------------------------------------------------------------
// GET /analytics/screener — Multi-factor card screener
// ---------------------------------------------------------------------------

analyticsRouter.get("/screener", (c) => {
  const db = getDb();
  const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") || "50")));
  const minArcaScore = Number(c.req.query("min_arca_score") || "0");
  const minLiquidity = Number(c.req.query("min_liquidity") || "0");
  const maxVolatility = Number(c.req.query("max_volatility") || "999999999");
  const sort = c.req.query("sort") || "arca_score";
  const order = c.req.query("order") === "asc" ? "ASC" : "DESC";
  const set = c.req.query("set");
  const rarity = c.req.query("rarity");

  let setFilter = "";
  let rarityFilter = "";
  if (set) setFilter = `AND c.set_code = '${set.replace(/'/g, "''")}'`;
  if (rarity) rarityFilter = `AND c.rarity = '${rarity.replace(/'/g, "''")}'`;

  const validSorts: Record<string, string> = {
    arca_score: "ca.arca_score",
    sharpe: "ca.sharpe_e6",
    volatility: "ca.volatility_e6",
    liquidity: "ca.liquidity_score",
    trend: "ca.trend_score",
    price: "cp.market_price_cents",
  };
  const sortCol = validSorts[sort] || "ca.arca_score";

  const data = db.all(
    sql.raw(`
    SELECT
      c.id,
      c.name,
      c.set_name,
      c.set_code,
      c.rarity,
      c.image_url,
      cp.market_price_cents,
      cp.currency,
      ca.arca_score,
      ca.volatility_e6,
      ca.sharpe_e6,
      ca.max_drawdown_bp,
      ca.liquidity_score,
      ca.trend_score,
      ca.grading_alpha_bp
    FROM card_analytics ca
    INNER JOIN cards c ON c.id = ca.card_id
    LEFT JOIN card_prices cp ON c.id = cp.card_id AND cp.conflated_rank = 1
    WHERE COALESCE(ca.arca_score, 0) >= ${minArcaScore}
      AND COALESCE(ca.liquidity_score, 0) >= ${minLiquidity}
      AND COALESCE(ca.volatility_e6, 0) <= ${maxVolatility}
      ${setFilter}
      ${rarityFilter}
    ORDER BY COALESCE(${sortCol}, 0) ${order}
    LIMIT ${limit}
  `),
  );

  return c.json({ data });
});

// ---------------------------------------------------------------------------
// GET /analytics/heatmap — Set momentum heatmap data
// ---------------------------------------------------------------------------

analyticsRouter.get("/heatmap", (c) => {
  const db = getDb();

  const data = db.all(sql`
    SELECT
      c.set_code,
      c.set_name,
      COUNT(*) as card_count,
      AVG(ca.trend_score) as avg_trend,
      AVG(ca.arca_score) as avg_arca_score,
      AVG(ca.volatility_e6) as avg_volatility_e6,
      SUM(cp.market_price_cents) as total_value_cents
    FROM card_analytics ca
    INNER JOIN cards c ON c.id = ca.card_id
    LEFT JOIN card_prices cp ON c.id = cp.card_id AND cp.conflated_rank = 1
    GROUP BY c.set_code, c.set_name
    HAVING card_count >= 3
    ORDER BY avg_trend DESC
  `);

  return c.json({ data });
});

// ---------------------------------------------------------------------------
// GET /analytics/divergence — Price source divergence
// ---------------------------------------------------------------------------

analyticsRouter.get("/divergence", (c) => {
  const db = getDb();
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") || "20")));

  // Find cards where providers disagree most (high spread between sources)
  const data = db.all(sql`
    SELECT
      c.id,
      c.name,
      c.set_name,
      c.rarity,
      c.image_url,
      MIN(cp.market_price_cents) as min_price_cents,
      MAX(cp.market_price_cents) as max_price_cents,
      (MAX(cp.market_price_cents) - MIN(cp.market_price_cents)) as spread_cents,
      CASE WHEN MIN(cp.market_price_cents) > 0
        THEN ROUND(CAST((MAX(cp.market_price_cents) - MIN(cp.market_price_cents)) AS REAL) / MIN(cp.market_price_cents) * 100, 1)
        ELSE 0
      END as spread_pct,
      COUNT(DISTINCT cp.source) as source_count,
      GROUP_CONCAT(DISTINCT cp.source) as sources
    FROM card_prices cp
    INNER JOIN cards c ON c.id = cp.card_id
    WHERE cp.market_price_cents IS NOT NULL AND cp.market_price_cents > 0
    GROUP BY cp.card_id
    HAVING source_count >= 2
    ORDER BY spread_pct DESC
    LIMIT ${limit}
  `);

  return c.json({ data });
});

// ---------------------------------------------------------------------------
// POST /analytics/refresh — Trigger manual analytics refresh
// ---------------------------------------------------------------------------

analyticsRouter.post("/refresh", async (c) => {
  try {
    await runDailyAnalytics();
    return c.json({ status: "ok", message: "Analytics pipeline completed" });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Analytics refresh failed" }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /analytics/backfill — Backfill OHLC data
// ---------------------------------------------------------------------------

analyticsRouter.post("/backfill", async (c) => {
  const body = await c.req.json<{ days?: number }>().catch(() => ({ days: 30 }));
  const days = Math.min(365, Math.max(1, (body as { days?: number }).days ?? 30));

  const count = backfillOHLC(days);
  return c.json({ status: "ok", ohlc_generated: count, days });
});

// ---------------------------------------------------------------------------
// GET /analytics/portfolio/:portfolioId/risk — Portfolio risk metrics
// ---------------------------------------------------------------------------

analyticsRouter.get("/portfolio/:portfolioId/risk", (c) => {
  const portfolioId = c.req.param("portfolioId");
  const metrics = computePortfolioRisk(portfolioId);
  return c.json({ data: metrics });
});
