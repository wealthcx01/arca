/**
 * Portfolio-level analytics — aggregates card-level analytics weighted by holdings.
 */

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { holdings } from "../portfolio/schema.ts";
import { cardPrices } from "../pricing/schema.ts";
import { cardAnalytics } from "./schema.ts";

const BP = 10_000;

export interface PortfolioRiskMetrics {
  total_value_cents: number;
  weighted_volatility_e6: number;
  weighted_sharpe_e6: number;
  max_drawdown_bp: number;
  diversification_ratio: number; // 0-100
  concentration_hhi_bp: number;
  top5_concentration_bp: number;
  currency_exposure: Record<string, number>; // currency → cents
  card_count: number;
  avg_arca_score: number;
}

/**
 * Compute portfolio-level risk metrics.
 */
export function computePortfolioRisk(portfolioId: string): PortfolioRiskMetrics {
  const db = getDb();

  // Get holdings with current prices and analytics
  const rows = db.all<{
    card_id: string;
    quantity: number;
    currency: string;
    market_price_cents: number | null;
    volatility_e6: number | null;
    sharpe_e6: number | null;
    max_drawdown_bp: number | null;
    arca_score: number | null;
  }>(sql`
    SELECT
      h.card_id,
      h.quantity,
      h.currency,
      cp.market_price_cents,
      ca.volatility_e6,
      ca.sharpe_e6,
      ca.max_drawdown_bp,
      ca.arca_score
    FROM holdings h
    LEFT JOIN card_prices cp ON h.card_id = cp.card_id AND cp.conflated_rank = 1
    LEFT JOIN card_analytics ca ON h.card_id = ca.card_id
    WHERE h.portfolio_id = ${portfolioId} AND h.quantity > 0
  `);

  if (rows.length === 0) {
    return {
      total_value_cents: 0,
      weighted_volatility_e6: 0,
      weighted_sharpe_e6: 0,
      max_drawdown_bp: 0,
      diversification_ratio: 0,
      concentration_hhi_bp: 0,
      top5_concentration_bp: 0,
      currency_exposure: {},
      card_count: 0,
      avg_arca_score: 0,
    };
  }

  // Calculate position values
  const positions = rows.map((r) => ({
    ...r,
    value_cents: (r.market_price_cents ?? 0) * r.quantity,
  }));

  const totalValue = positions.reduce((sum, p) => sum + p.value_cents, 0);

  // Currency exposure
  const currencyExposure: Record<string, number> = {};
  for (const p of positions) {
    currencyExposure[p.currency] = (currencyExposure[p.currency] ?? 0) + p.value_cents;
  }

  // Weighted volatility (simple weighted average — not covariance-aware)
  let weightedVol = 0;
  let weightedSharpe = 0;
  let maxDd = 0;
  let arcaScoreSum = 0;
  let arcaScoreCount = 0;

  for (const p of positions) {
    if (totalValue === 0) continue;
    const weight = p.value_cents / totalValue;

    if (p.volatility_e6 != null) {
      weightedVol += p.volatility_e6 * weight;
    }
    if (p.sharpe_e6 != null) {
      weightedSharpe += p.sharpe_e6 * weight;
    }
    if (p.max_drawdown_bp != null && p.max_drawdown_bp > maxDd) {
      maxDd = p.max_drawdown_bp;
    }
    if (p.arca_score != null) {
      arcaScoreSum += p.arca_score;
      arcaScoreCount++;
    }
  }

  // Concentration: HHI index (sum of squared weights)
  let hhi = 0;
  const sortedByValue = [...positions].sort((a, b) => b.value_cents - a.value_cents);
  for (const p of sortedByValue) {
    if (totalValue === 0) continue;
    const w = p.value_cents / totalValue;
    hhi += w * w;
  }
  const hhiBp = Math.round(hhi * BP);

  // Top 5 concentration
  const top5Value = sortedByValue.slice(0, 5).reduce((sum, p) => sum + p.value_cents, 0);
  const top5Bp = totalValue > 0 ? Math.round((top5Value / totalValue) * BP) : 0;

  // Diversification: unique cards / max possible. Simple ratio 0-100.
  const uniqueCards = new Set(positions.map((p) => p.card_id)).size;
  const diversification = Math.min(
    100,
    Math.round((uniqueCards / Math.max(1, positions.length)) * 100),
  );

  return {
    total_value_cents: totalValue,
    weighted_volatility_e6: Math.round(weightedVol),
    weighted_sharpe_e6: Math.round(weightedSharpe),
    max_drawdown_bp: maxDd,
    diversification_ratio: diversification,
    concentration_hhi_bp: hhiBp,
    top5_concentration_bp: top5Bp,
    currency_exposure: currencyExposure,
    card_count: uniqueCards,
    avg_arca_score: arcaScoreCount > 0 ? Math.round(arcaScoreSum / arcaScoreCount) : 0,
  };
}
