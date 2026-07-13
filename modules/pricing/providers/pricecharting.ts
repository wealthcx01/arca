/**
 * PriceCharting provider — BYOK (paid)
 * eBay sold price aggregation + PSA graded data.
 * API docs: https://www.pricecharting.com/api-documentation
 */

import type {
  CardRef,
  GradedPriceResult,
  PriceProvider,
  PriceResult,
  ProviderConfig,
} from "./types";

const API_BASE = "https://www.pricecharting.com/api";

function dollarsToCents(value: number | undefined | null): number | null {
  if (value == null) return null;
  return Math.round(value * 100);
}

interface PriceChartingResponse {
  id?: string;
  "product-name"?: string;
  "loose-price"?: number;
  "complete-price"?: number;
  "new-price"?: number;
  "graded-price"?: number;
  "box-only-price"?: number;
  "manual-only-price"?: number;
}

export const pricechartingProvider: PriceProvider = {
  name: "pricecharting",
  displayName: "PriceCharting",
  requiresKey: true,

  async fetchPrices(cards: CardRef[], config: ProviderConfig): Promise<PriceResult[]> {
    if (!config.apiKey) return [];
    const results: PriceResult[] = [];

    for (const card of cards) {
      try {
        const query = encodeURIComponent(card.name);
        const res = await fetch(
          `${API_BASE}/product?t=${config.apiKey}&q=${query}&type=pokemon-cards`,
        );
        if (!res.ok) continue;

        const data = (await res.json()) as PriceChartingResponse;

        results.push({
          card_id: card.id,
          source: "pricecharting",
          variant: "normal",
          currency: "USD",
          market_price_cents: dollarsToCents(data["loose-price"]),
          low_price_cents: null,
          mid_price_cents: dollarsToCents(data["complete-price"]),
          high_price_cents: dollarsToCents(data["new-price"]),
        });
      } catch {
        // Partial failure OK
      }
    }

    return results;
  },

  async fetchGradedPrices(cards: CardRef[], config: ProviderConfig): Promise<GradedPriceResult[]> {
    if (!config.apiKey) return [];
    const results: GradedPriceResult[] = [];

    for (const card of cards) {
      try {
        const query = encodeURIComponent(card.name);
        const res = await fetch(
          `${API_BASE}/product?t=${config.apiKey}&q=${query}&type=pokemon-cards`,
        );
        if (!res.ok) continue;

        const data = (await res.json()) as PriceChartingResponse;

        if (data["graded-price"] != null) {
          results.push({
            card_id: card.id,
            source: "pricecharting",
            grading_company: "PSA",
            grade: "10",
            price_cents: Math.round(data["graded-price"] * 100),
            currency: "USD",
            sale_type: "market",
          });
        }
      } catch {
        // Partial failure OK
      }
    }

    return results;
  },
};
