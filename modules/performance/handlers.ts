import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/index.ts";
import { dailyPerformance } from "./schema.ts";

export const performanceRouter = new Hono();

const RETURN_PRECISION = 1_000_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a date string (YYYY-MM-DD) to a Date at midnight UTC. */
function parseDate(dateStr: string): Date {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return d;
}

/** Get the start of a period relative to today. */
function getPeriodStart(period: string): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case "1M":
      return new Date(year, month - 1, now.getDate());
    case "3M":
      return new Date(year, month - 3, now.getDate());
    case "6M":
      return new Date(year, month - 6, now.getDate());
    case "1Y":
      return new Date(year - 1, month, now.getDate());
    case "ALL":
      return new Date(2000, 0, 1); // Effectively "all time"
    default:
      return new Date(year, month - 1, now.getDate()); // Default 1M
  }
}

// ---------------------------------------------------------------------------
// GET /:portfolioId — Daily time series
// Query params: from (YYYY-MM-DD), to (YYYY-MM-DD)
// ---------------------------------------------------------------------------

performanceRouter.get("/:portfolioId", (c) => {
  const db = getDb();
  const portfolioId = c.req.param("portfolioId");

  const fromParam = c.req.query("from");
  const toParam = c.req.query("to");

  const filters = [eq(dailyPerformance.portfolio_id, portfolioId)];

  if (fromParam) {
    try {
      filters.push(gte(dailyPerformance.date, parseDate(fromParam)));
    } catch {
      return c.json({ error: "Invalid from date" }, 400);
    }
  }

  if (toParam) {
    try {
      filters.push(lte(dailyPerformance.date, parseDate(toParam)));
    } catch {
      return c.json({ error: "Invalid to date" }, 400);
    }
  }

  const records = db
    .select()
    .from(dailyPerformance)
    .where(and(...filters))
    .orderBy(asc(dailyPerformance.date))
    .all();

  return c.json({ portfolio_id: portfolioId, data: records });
});

// ---------------------------------------------------------------------------
// GET /:portfolioId/summary — Period return summary
// Computes MTD, QTD, YTD, 1Y, Since Inception
// ---------------------------------------------------------------------------

performanceRouter.get("/:portfolioId/summary", (c) => {
  const db = getDb();
  const portfolioId = c.req.param("portfolioId");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3);

  const periods: Record<string, Date> = {
    MTD: new Date(year, month, 1),
    QTD: new Date(year, quarter * 3, 1),
    YTD: new Date(year, 0, 1),
    "1Y": new Date(year - 1, month, now.getDate()),
    SI: new Date(2000, 0, 1), // Since inception
  };

  const summary: Record<
    string,
    {
      return_pct: number;
      pnl_cents: number;
      start_value_cents: number;
      end_value_cents: number;
      days: number;
    }
  > = {};

  for (const [label, startDate] of Object.entries(periods)) {
    const records = db
      .select()
      .from(dailyPerformance)
      .where(
        and(eq(dailyPerformance.portfolio_id, portfolioId), gte(dailyPerformance.date, startDate)),
      )
      .orderBy(asc(dailyPerformance.date))
      .all();

    if (records.length === 0) {
      summary[label] = {
        return_pct: 0,
        pnl_cents: 0,
        start_value_cents: 0,
        end_value_cents: 0,
        days: 0,
      };
      continue;
    }

    // Compound returns: product of (return_1pr / RETURN_PRECISION)
    let compoundedReturn = RETURN_PRECISION;
    let totalPnl = 0;

    for (const record of records) {
      compoundedReturn = Math.round((compoundedReturn * record.return_1pr) / RETURN_PRECISION);
      totalPnl += record.pnl_cents;
    }

    const firstRecord = records[0]!;
    const lastRecord = records[records.length - 1]!;

    // Convert compounded return to percentage: (compoundedReturn / RETURN_PRECISION - 1) * 100
    const returnPct = (compoundedReturn / RETURN_PRECISION - 1) * 100;

    summary[label] = {
      return_pct: Math.round(returnPct * 100) / 100, // 2 decimal places
      pnl_cents: totalPnl,
      start_value_cents: firstRecord.mktvalue_bod_cents,
      end_value_cents: lastRecord.mktvalue_eod_cents,
      days: records.length,
    };
  }

  return c.json({ portfolio_id: portfolioId, summary });
});

// ---------------------------------------------------------------------------
// GET /:portfolioId/chart — Chart data
// Query param: period (1M, 3M, 6M, 1Y, ALL)
// ---------------------------------------------------------------------------

performanceRouter.get("/:portfolioId/chart", (c) => {
  const db = getDb();
  const portfolioId = c.req.param("portfolioId");
  const period = c.req.query("period") || "1M";

  const startDate = getPeriodStart(period);

  const records = db
    .select()
    .from(dailyPerformance)
    .where(
      and(eq(dailyPerformance.portfolio_id, portfolioId), gte(dailyPerformance.date, startDate)),
    )
    .orderBy(asc(dailyPerformance.date))
    .all();

  const dates: string[] = [];
  const values: number[] = [];
  const returns: number[] = [];

  let cumulativeReturn = RETURN_PRECISION;

  for (const record of records) {
    const d = record.date instanceof Date ? record.date : new Date(record.date);
    dates.push(d.toISOString().split("T")[0]!);
    values.push(record.mktvalue_eod_cents);

    // Compound cumulative return
    cumulativeReturn = Math.round((cumulativeReturn * record.return_1pr) / RETURN_PRECISION);
    // Express as percentage change from start
    const returnPct = (cumulativeReturn / RETURN_PRECISION - 1) * 100;
    returns.push(Math.round(returnPct * 100) / 100);
  }

  return c.json({
    portfolio_id: portfolioId,
    period,
    dates,
    values,
    returns,
  });
});
