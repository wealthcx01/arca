/**
 * Card-level analytics — volatility, Sharpe, drawdown, liquidity, trend, VWAP.
 *
 * All outputs are integer-scaled for storage:
 * - Ratios/scores: × 1,000,000 (_e6)
 * - Basis points: × 10,000 (_bp)
 * - Prices: cents
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { cardPrices } from "../pricing/schema.ts";
import type { OHLCBar } from "./indicators.ts";
import { macd, roc, rsi, sma } from "./indicators.ts";
import { cardAnalytics, cardOhlcDaily } from "./schema.ts";

const SCALE = 1_000_000;
const BP = 10_000;

/** Source priority weights from conflation (for VWAP proxy). */
const SOURCE_WEIGHTS: Record<string, number> = {
  tcgplayer: 5,
  "pokemon-price-tracker": 5,
  "poketrace:tcgplayer": 5,
  tcgcsv: 4,
  "pokemon-price-tracker:ebay": 3,
  "poketrace:ebay": 3,
  pricecharting: 2,
  cardmarket: 1,
  tcgdex: 1,
};

/**
 * Parkinson volatility estimator — uses OHLC high/low.
 * σ = sqrt(sum(ln(H/L)^2) / (4n × ln2))
 * Result × 1M.
 */
export function parkinsonVolatility(bars: OHLCBar[]): number {
  if (bars.length < 2) return 0;

  let sumLogSq = 0;
  let count = 0;

  for (const bar of bars) {
    if (bar.high_cents <= 0 || bar.low_cents <= 0) continue;
    const logRatio = Math.log(bar.high_cents / bar.low_cents);
    sumLogSq += logRatio * logRatio;
    count++;
  }

  if (count === 0) return 0;

  const vol = Math.sqrt(sumLogSq / (4 * count * Math.LN2));
  // Annualize (365 trading days for cards — market is always open)
  const annualized = vol * Math.sqrt(365);
  return Math.round(annualized * SCALE);
}

/**
 * Sharpe Ratio — (annualized return - risk_free) / volatility.
 * Risk-free = 0 for cards. Result × 1M.
 */
export function sharpeRatio(bars: OHLCBar[], volatility_e6: number): number {
  if (bars.length < 2 || volatility_e6 === 0) return 0;

  const firstClose = bars[0]!.close_cents;
  const lastClose = bars[bars.length - 1]!.close_cents;
  if (firstClose <= 0) return 0;

  const totalReturn = (lastClose - firstClose) / firstClose;
  const days = bars.length;
  const annualizedReturn = totalReturn * (365 / days);

  const volDecimal = volatility_e6 / SCALE;
  if (volDecimal === 0) return 0;

  return Math.round((annualizedReturn / volDecimal) * SCALE);
}

/**
 * Max Drawdown — peak-to-trough % decline over period.
 * Result in basis points (100% = 10,000 bp).
 */
export function maxDrawdown(bars: OHLCBar[]): number {
  if (bars.length < 2) return 0;

  let peak = bars[0]!.close_cents;
  let maxDd = 0;

  for (const bar of bars) {
    if (bar.close_cents > peak) {
      peak = bar.close_cents;
    }
    if (peak > 0) {
      const dd = (peak - bar.close_cents) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }

  return Math.round(maxDd * BP);
}

/**
 * Liquidity Score (0-100).
 * Based on: source_count from OHLC, bid-ask spread proxy (high-low)/mid,
 * number of providers with prices.
 */
export function liquidityScore(bars: OHLCBar[], providerCount: number): number {
  if (bars.length === 0) return 0;

  // Data availability: more bars = more liquid (max 30 for recent)
  const recentBars = bars.slice(-30);
  const dataScore = Math.min(100, (recentBars.length / 30) * 100);

  // Bid-ask spread proxy: avg (high - low) / midpoint
  let spreadScore = 100;
  if (recentBars.length > 0) {
    let totalSpread = 0;
    let count = 0;
    for (const bar of recentBars) {
      const mid = (bar.high_cents + bar.low_cents) / 2;
      if (mid > 0) {
        totalSpread += (bar.high_cents - bar.low_cents) / mid;
        count++;
      }
    }
    if (count > 0) {
      const avgSpread = totalSpread / count;
      // Lower spread = more liquid: 0% spread = 100, 50% spread = 0
      spreadScore = Math.max(0, 100 - avgSpread * 200);
    }
  }

  // Provider diversity: more providers = more liquid
  const providerScore = Math.min(100, providerCount * 20);

  // Weighted combination
  return Math.round(dataScore * 0.4 + spreadScore * 0.3 + providerScore * 0.3);
}

/**
 * Trend Score (-100 to +100).
 * Composite: SMA crossover direction + RSI position + MACD histogram sign.
 */
export function trendScore(bars: OHLCBar[]): number {
  if (bars.length < 26) return 0; // Need enough data for MACD

  let score = 0;

  // 1. SMA crossover: SMA(10) vs SMA(20)
  const sma10 = sma(bars, 10);
  const sma20 = sma(bars, 20);
  if (sma10.length > 0 && sma20.length > 0) {
    const lastSma10 = sma10[sma10.length - 1]!.value_e6;
    const lastSma20 = sma20[sma20.length - 1]!.value_e6;
    if (lastSma10 > lastSma20) score += 33;
    else if (lastSma10 < lastSma20) score -= 33;
  }

  // 2. RSI position
  const rsiValues = rsi(bars, 14);
  if (rsiValues.length > 0) {
    const lastRsi = rsiValues[rsiValues.length - 1]!.value_e6 / SCALE;
    if (lastRsi > 70)
      score += 20; // Overbought but bullish momentum
    else if (lastRsi > 50) score += 33;
    else if (lastRsi < 30) score -= 20;
    else score -= 33;
  }

  // 3. MACD histogram sign
  const macdResult = macd(bars);
  if (macdResult.histogram.length > 0) {
    const lastHist = macdResult.histogram[macdResult.histogram.length - 1]!.value_e6;
    if (lastHist > 0) score += 34;
    else if (lastHist < 0) score -= 34;
  }

  return Math.max(-100, Math.min(100, score));
}

/**
 * VWAP Proxy — provider-reliability-weighted average price.
 * Uses conflation priority weights as volume proxy.
 * Result in cents.
 */
export function vwapProxy(cardId: string, currency: string): number {
  const db = getDb();

  const prices = db
    .select({
      source: cardPrices.source,
      market_price_cents: cardPrices.market_price_cents,
    })
    .from(cardPrices)
    .where(and(eq(cardPrices.card_id, cardId), eq(cardPrices.currency, currency)))
    .all();

  if (prices.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const p of prices) {
    if (p.market_price_cents == null || p.market_price_cents <= 0) continue;
    const weight = SOURCE_WEIGHTS[p.source] ?? 1;
    weightedSum += p.market_price_cents * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

/**
 * Compute and store all analytics for a single card.
 */
export function computeCardAnalytics(cardId: string, currency: string): void {
  const db = getDb();

  // Get OHLC bars for this card (last 365 days)
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

  if (bars.length === 0) return;

  // Count distinct providers for this card
  const providerResult = db.all<{ cnt: number }>(sql`
    SELECT COUNT(DISTINCT source) as cnt FROM card_prices WHERE card_id = ${cardId}
  `);
  const providerCount = providerResult[0]?.cnt ?? 0;

  const vol = parkinsonVolatility(bars);
  const sharpe = sharpeRatio(bars, vol);
  const dd = maxDrawdown(bars);
  const liq = liquidityScore(bars, providerCount);
  const trend = trendScore(bars);
  const vwap = vwapProxy(cardId, currency);

  // Upsert card_analytics
  db.delete(cardAnalytics)
    .where(and(eq(cardAnalytics.card_id, cardId), eq(cardAnalytics.currency, currency)))
    .run();

  db.insert(cardAnalytics)
    .values({
      card_id: cardId,
      currency,
      volatility_e6: vol,
      sharpe_e6: sharpe,
      max_drawdown_bp: dd,
      liquidity_score: liq,
      trend_score: trend,
      vwap_cents: vwap,
      arca_score: null, // Computed separately by arca-score.ts
      grading_alpha_bp: null, // Computed separately by grading-alpha.ts
    })
    .run();
}

/**
 * Compute analytics for all cards with OHLC data.
 */
export function computeAllCardAnalytics(): number {
  const db = getDb();

  const combos = db.all<{ card_id: string; currency: string }>(sql`
    SELECT DISTINCT card_id, currency FROM card_ohlc_daily
  `);

  let count = 0;
  for (const { card_id, currency } of combos) {
    computeCardAnalytics(card_id, currency);
    count++;
  }

  return count;
}
