/**
 * Analytics jobs — daily refresh pipeline.
 *
 * Order:
 * 1. Generate OHLC for previous day
 * 2. Compute all technical indicators
 * 3. Compute card analytics (vol, sharpe, drawdown, liquidity, trend, VWAP)
 * 4. Compute ARCA scores
 * 5. Compute grading alpha
 * 6. Update market index
 */

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { scheduler } from "../../src/lib/scheduler.ts";
import { computeAllArcaScores } from "./arca-score.ts";
import { computeAllCardAnalytics } from "./card-analytics.ts";
import { computeAllGradingAlpha } from "./grading-alpha.ts";
import type { IndicatorPoint, OHLCBar } from "./indicators.ts";
import { atr, bollingerBands, ema, macd, roc, rsi, sma } from "./indicators.ts";
import { computeMarketIndex } from "./market-index.ts";
import { dailyOHLCJob } from "./ohlc.ts";
import { cardOhlcDaily, technicalIndicators } from "./schema.ts";

/**
 * Store indicator values to the database.
 */
function storeIndicators(
  cardId: string,
  currency: string,
  indicatorName: string,
  points: IndicatorPoint[],
): void {
  const db = getDb();

  for (const point of points) {
    // Upsert: delete existing then insert
    db.delete(technicalIndicators)
      .where(
        and(
          eq(technicalIndicators.card_id, cardId),
          eq(technicalIndicators.currency, currency),
          eq(technicalIndicators.date, point.date),
          eq(technicalIndicators.indicator, indicatorName),
        ),
      )
      .run();

    db.insert(technicalIndicators)
      .values({
        card_id: cardId,
        currency,
        date: point.date,
        indicator: indicatorName,
        value_e6: point.value_e6,
      })
      .run();
  }
}

/**
 * Compute and store all technical indicators for a single card.
 */
function computeIndicatorsForCard(cardId: string, currency: string): void {
  const db = getDb();

  const bars: OHLCBar[] = db
    .select({
      date: cardOhlcDaily.date,
      open_cents: cardOhlcDaily.open_cents,
      high_cents: cardOhlcDaily.high_cents,
      low_cents: cardOhlcDaily.low_cents,
      close_cents: cardOhlcDaily.close_cents,
    })
    .from(cardOhlcDaily)
    .where(and(eq(cardOhlcDaily.card_id, cardId), eq(cardOhlcDaily.currency, currency)))
    .orderBy(cardOhlcDaily.date)
    .all();

  if (bars.length < 5) return; // Not enough data

  // SMA
  storeIndicators(cardId, currency, "SMA_10", sma(bars, 10));
  storeIndicators(cardId, currency, "SMA_20", sma(bars, 20));
  storeIndicators(cardId, currency, "SMA_50", sma(bars, 50));

  // EMA
  storeIndicators(cardId, currency, "EMA_12", ema(bars, 12));
  storeIndicators(cardId, currency, "EMA_26", ema(bars, 26));

  // RSI
  storeIndicators(cardId, currency, "RSI_14", rsi(bars, 14));

  // MACD
  const macdResult = macd(bars);
  storeIndicators(cardId, currency, "MACD", macdResult.macd);
  storeIndicators(cardId, currency, "MACD_SIGNAL", macdResult.signal);
  storeIndicators(cardId, currency, "MACD_HIST", macdResult.histogram);

  // Bollinger Bands
  const bb = bollingerBands(bars, 20, 2);
  storeIndicators(cardId, currency, "BB_UPPER", bb.upper);
  storeIndicators(cardId, currency, "BB_MIDDLE", bb.middle);
  storeIndicators(cardId, currency, "BB_LOWER", bb.lower);

  // ATR
  storeIndicators(cardId, currency, "ATR_14", atr(bars, 14));

  // ROC
  storeIndicators(cardId, currency, "ROC_14", roc(bars, 14));
  storeIndicators(cardId, currency, "ROC_30", roc(bars, 30));
}

/**
 * Compute all technical indicators for all cards with OHLC data.
 */
function computeAllIndicators(): number {
  const db = getDb();

  const combos = db.all<{ card_id: string; currency: string }>(sql`
    SELECT DISTINCT card_id, currency FROM card_ohlc_daily
  `);

  for (const { card_id, currency } of combos) {
    computeIndicatorsForCard(card_id, currency);
  }

  return combos.length;
}

/**
 * Full daily analytics refresh pipeline.
 */
export async function runDailyAnalytics(): Promise<void> {
  console.log("[analytics] Starting daily analytics pipeline...");

  // 1. Generate OHLC
  const ohlcCount = dailyOHLCJob();
  console.log(`[analytics] OHLC generated for ${ohlcCount} cards`);

  // 2. Compute technical indicators
  const indicatorCount = computeAllIndicators();
  console.log(`[analytics] Indicators computed for ${indicatorCount} cards`);

  // 3. Compute card analytics
  const analyticsCount = computeAllCardAnalytics();
  console.log(`[analytics] Card analytics computed for ${analyticsCount} cards`);

  // 4. Compute ARCA scores
  const scoreCount = computeAllArcaScores();
  console.log(`[analytics] ARCA scores computed for ${scoreCount} cards`);

  // 5. Compute grading alpha
  const alphaCount = computeAllGradingAlpha();
  console.log(`[analytics] Grading alpha computed for ${alphaCount} cards`);

  // 6. Update market index
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0]!;
  computeMarketIndex(dateStr);
  console.log(`[analytics] Market index updated for ${dateStr}`);

  console.log("[analytics] Daily pipeline complete.");
}

/**
 * Register analytics jobs with the scheduler.
 */
export function registerAnalyticsJobs(): void {
  // Daily analytics: every 24 hours
  scheduler.register("analytics:daily", runDailyAnalytics, 24 * 60 * 60 * 1000);
}
