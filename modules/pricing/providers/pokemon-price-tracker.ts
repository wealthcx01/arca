/**
 * PokemonPriceTracker provider — BYOK ($9.99/mo)
 * Provides TCGPlayer + eBay pricing with PSA/CGC/BGS graded support.
 * API docs: assumed REST JSON endpoints.
 */

import type {
  CardRef,
  GradedPriceResult,
  PriceProvider,
  PriceResult,
  ProviderConfig,
} from "./types";

const API_BASE = "https://api.pokemonpricetracker.com/v1";

function dollarsToCents(value: number | undefined | null): number | null {
  if (value == null) return null;
  return Math.round(value * 100);
}

interface PptPriceResponse {
  cardId: string;
  prices?: {
    tcgplayer?: { market?: number; low?: number; mid?: number; high?: number };
    ebay?: { lastSold?: number; average?: number };
  };
  gradedPrices?: Array<{
    company: string;
    grade: string;
    price: number;
    saleType: string;
  }>;
}

export const pokemonPriceTrackerProvider: PriceProvider = {
  name: "pokemon-price-tracker",
  displayName: "Pokemon Price Tracker",
  requiresKey: true,

  async fetchPrices(cards: CardRef[], config: ProviderConfig): Promise<PriceResult[]> {
    if (!config.apiKey) return [];
    const results: PriceResult[] = [];

    for (const card of cards) {
      try {
        const res = await fetch(`${API_BASE}/cards/${card.external_id}/prices`, {
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });
        if (!res.ok) continue;

        const data = (await res.json()) as PptPriceResponse;

        if (data.prices?.tcgplayer) {
          const tp = data.prices.tcgplayer;
          results.push({
            card_id: card.id,
            source: "pokemon-price-tracker",
            variant: "normal",
            currency: "USD",
            market_price_cents: dollarsToCents(tp.market),
            low_price_cents: dollarsToCents(tp.low),
            mid_price_cents: dollarsToCents(tp.mid),
            high_price_cents: dollarsToCents(tp.high),
          });
        }

        if (data.prices?.ebay) {
          const eb = data.prices.ebay;
          results.push({
            card_id: card.id,
            source: "pokemon-price-tracker:ebay",
            variant: "normal",
            currency: "USD",
            market_price_cents: dollarsToCents(eb.lastSold),
            low_price_cents: null,
            mid_price_cents: dollarsToCents(eb.average),
            high_price_cents: null,
          });
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
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });
        if (!res.ok) continue;

        const data = (await res.json()) as PptPriceResponse;

        if (data.gradedPrices) {
          for (const gp of data.gradedPrices) {
            results.push({
              card_id: card.id,
              source: "pokemon-price-tracker",
              grading_company: gp.company,
              grade: gp.grade,
              price_cents: Math.round(gp.price * 100),
              currency: "USD",
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
