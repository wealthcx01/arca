/**
 * ARCA Score (0-100) — Composite card rating.
 *
 * Sub-scores (all normalized 0-100):
 * - Momentum (25%): ROC + trend score
 * - Value (20%): Current price vs 52-week range position
 * - Liquidity (15%): Source count + provider diversity
 * - Risk-Adjusted Return (25%): Sharpe ratio normalized
 * - Scarcity (15%): Pop report data (lower pop = higher scarcity)
 */

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import type { OHLCBar } from "./indicators.ts";
import { roc } from "./indicators.ts";
import { cardAnalytics, cardOhlcDaily, popReports } from "./schema.ts";

const SCALE = 1_000_000;

interface SubScores {
  momentum: number;
  value: number;
  liquidity: number;
  riskAdjusted: number;
  scarcity: number;
}

/**
 * Momentum sub-score (0-100).
 * Based on ROC(30) and trend score.
 */
function momentumScore(bars: OHLCBar[], trendScore: number): number {
  const roc30 = roc(bars, 30);
  let rocComponent = 50; // neutral

  if (roc30.length > 0) {
    const lastRoc = roc30[roc30.length - 1]!.value_e6 / SCALE;
    // ROC: -50% → 0, 0% → 50, +50% → 100
    rocComponent = Math.max(0, Math.min(100, 50 + lastRoc * 100));
  }

  // Trend score: -100 → 0, 0 → 50, +100 → 100
  const trendComponent = (trendScore + 100) / 2;

  return Math.round(rocComponent * 0.6 + trendComponent * 0.4);
}

/**
 * Value sub-score (0-100).
 * Position within 52-week range: 0 = at 52w low, 100 = at 52w high.
 * Inverted so lower price relative to range = higher value score.
 */
function valueScore(bars: OHLCBar[]): number {
  if (bars.length < 2) return 50;

  const last52w = bars.slice(-365);
  const highs = last52w.map((b) => b.high_cents);
  const lows = last52w.map((b) => b.low_cents);

  const yearHigh = Math.max(...highs);
  const yearLow = Math.min(...lows);
  const currentPrice = bars[bars.length - 1]!.close_cents;

  if (yearHigh === yearLow) return 50;

  // Position in range: 0 = at low, 1 = at high
  const position = (currentPrice - yearLow) / (yearHigh - yearLow);

  // Invert: cards near the low end of their range may be "value"
  // But also reward cards holding near highs (momentum + value overlap)
  // Use a V-shape: best value at 20-40% of range
  if (position < 0.2) return Math.round(60 + position * 200); // 60-100
  if (position < 0.5) return Math.round(100 - (position - 0.2) * 133); // 100-60
  return Math.round(60 - (position - 0.5) * 80); // 60-20
}

/**
 * Risk-adjusted return sub-score (0-100).
 * Normalizes Sharpe ratio to 0-100 range.
 * Sharpe < -1 → 0, Sharpe = 0 → 30, Sharpe = 2 → 80, Sharpe > 3 → 100.
 */
function riskAdjustedScore(sharpe_e6: number): number {
  const sharpe = sharpe_e6 / SCALE;
  // Map [-2, 4] → [0, 100]
  const score = ((sharpe + 2) / 6) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Scarcity sub-score (0-100).
 * Based on population reports: lower population = higher scarcity.
 */
function scarcityScore(cardId: string): number {
  const db = getDb();

  const pops = db
    .select({ total_pop: popReports.total_pop })
    .from(popReports)
    .where(eq(popReports.card_id, cardId))
    .all();

  if (pops.length === 0) return 50; // No data, neutral

  const totalPop = pops.reduce((sum, p) => sum + p.total_pop, 0);

  // Exponential decay: pop 1 → 100, pop 100 → 60, pop 1000 → 30, pop 10000 → 10
  if (totalPop <= 0) return 50;
  const score = 100 * Math.exp(-totalPop / 2000);
  return Math.round(Math.max(5, Math.min(100, score)));
}

/**
 * Compute ARCA Score for a single card.
 * Returns 0-100 composite score.
 */
export function computeArcaScore(cardId: string, currency: string): number {
  const db = getDb();

  // Get OHLC bars
  const bars = db
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

  if (bars.length === 0) return 0;

  // Get existing analytics
  const analytics = db
    .select()
    .from(cardAnalytics)
    .where(and(eq(cardAnalytics.card_id, cardId), eq(cardAnalytics.currency, currency)))
    .get();

  const trend = analytics?.trend_score ?? 0;
  const sharpe = analytics?.sharpe_e6 ?? 0;
  const liq = analytics?.liquidity_score ?? 50;

  const subScores: SubScores = {
    momentum: momentumScore(bars, trend),
    value: valueScore(bars),
    liquidity: liq,
    riskAdjusted: riskAdjustedScore(sharpe),
    scarcity: scarcityScore(cardId),
  };

  // Weighted sum
  const score = Math.round(
    subScores.momentum * 0.25 +
      subScores.value * 0.2 +
      subScores.liquidity * 0.15 +
      subScores.riskAdjusted * 0.25 +
      subScores.scarcity * 0.15,
  );

  return Math.max(0, Math.min(100, score));
}

/**
 * Compute and store ARCA scores for all cards with analytics data.
 */
export function computeAllArcaScores(): number {
  const db = getDb();

  const records = db
    .select({ card_id: cardAnalytics.card_id, currency: cardAnalytics.currency })
    .from(cardAnalytics)
    .all();

  let count = 0;
  for (const { card_id, currency } of records) {
    const score = computeArcaScore(card_id, currency);

    db.update(cardAnalytics)
      .set({ arca_score: score, updated_at: new Date() })
      .where(and(eq(cardAnalytics.card_id, card_id), eq(cardAnalytics.currency, currency)))
      .run();

    count++;
  }

  return count;
}
