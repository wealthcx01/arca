/**
 * PokeTrace provider — BYOK ($19.99/mo)
 * TCGPlayer + eBay + CardMarket + 6 grading companies.
 * API docs: assumed REST JSON endpoints.
 */

import type {
  CardRef,
  GradedPriceResult,
  PriceProvider,
  PriceResult,
  ProviderConfig,
} from "./types";

const API_BASE = "https://api.poketrace.com/v1";

function dollarsToCents(value: number | undefined | null): number | null {
  if (value == null) return null;
  return Math.round(value * 100);
}

interface PokeTracePriceResponse {
  cardId: string;
  prices?: Array<{
    source: string; // "tcgplayer", "ebay", "cardmarket"
    variant: string;
    currency: string;
    market?: number;
    low?: number;
    mid?: number;
    high?: number;
  }>;
  gradedPrices?: Array<{
    company: string;
    grade: string;
    price: number;
    currency: string;
    saleType: string;
  }>;
}

export const poketraceProvider: PriceProvider = {
  name: "poketrace",
  displayName: "PokeTrace",
  requiresKey: true,

  async fetchPrices(cards: CardRef[], config: ProviderConfig): Promise<PriceResult[]> {
    if (!config.apiKey) return [];
    const results: PriceResult[] = [];

    for (const card of cards) {
      try {
        const res = await fetch(`${API_BASE}/cards/${card.external_id}/prices`, {
          headers: { "X-Api-Key": config.apiKey },
        });
        if (!res.ok) continue;

        const data = (await res.json()) as PokeTracePriceResponse;

        if (data.prices) {
          for (const p of data.prices) {
            results.push({
              card_id: card.id,
              source: `poketrace:${p.source}`,
              variant: p.variant || "normal",
              currency: p.currency || "USD",
              market_price_cents: dollarsToCents(p.market),
              low_price_cents: dollarsToCents(p.low),
              mid_price_cents: dollarsToCents(p.mid),
              high_price_cents: dollarsToCents(p.high),
            });
          }
        }
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
        const res = await fetch(`${API_BASE}/cards/${card.external_id}/prices`, {
          headers: { "X-Api-Key": config.apiKey },
        });
        if (!res.ok) continue;

        const data = (await res.json()) as PokeTracePriceResponse;

        if (data.gradedPrices) {
          for (const gp of data.gradedPrices) {
            results.push({
              card_id: card.id,
              source: "poketrace",
              grading_company: gp.company,
              grade: gp.grade,
              price_cents: Math.round(gp.price * 100),
              currency: gp.currency || "USD",
              sale_type: gp.saleType,
            });
          }
        }
      } catch {
        // Partial failure OK
      }
    }

    return results;
  },
};
