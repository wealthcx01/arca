/**
 * Pokemon TCG API provider — FREE (with API key)
 * API: https://api.pokemontcg.io/v2
 * Returns TCGPlayer (USD) + CardMarket (EUR) prices.
 * Refactored from the original jobs.ts sync logic.
 */

import type { CardRef, PriceProvider, PriceResult, ProviderConfig } from "./types";

const API_BASE = "https://api.pokemontcg.io/v2/cards";

interface TcgPriceVariant {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
}

interface PokemonTcgCardResponse {
  id: string;
  tcgplayer?: {
    prices?: Record<string, TcgPriceVariant>;
  };
  cardmarket?: {
    prices?: {
      averageSellPrice?: number;
      lowPrice?: number;
      trendPrice?: number;
      suggestedPrice?: number;
      reverseHoloSell?: number;
      reverseHoloLow?: number;
      reverseHoloTrend?: number;
    };
  };
}

function dollarsToCents(value: number | undefined | null): number | null {
  if (value == null) return null;
  return Math.round(value * 100);
}

export const pokemonTcgProvider: PriceProvider = {
  name: "pokemon-tcg",
  displayName: "Pokemon TCG API",
  requiresKey: true, // Free key, but required

  async fetchPrices(cards: CardRef[], config: ProviderConfig): Promise<PriceResult[]> {
    const results: PriceResult[] = [];
    const apiKey = config.apiKey || process.env.POKEMON_TCG_API_KEY || "";
    const batchSize = config.batchSize ?? 5;
    const delayMs = config.delayMs ?? 1000;

    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (card) => {
          const res = await fetch(`${API_BASE}/${card.external_id}`, {
            headers: apiKey ? { "X-Api-Key": apiKey } : {},
          });

          if (!res.ok) {
            console.warn(`[pokemon-tcg] API error for ${card.external_id}: ${res.status}`);
            return [];
          }

          const json = (await res.json()) as { data: PokemonTcgCardResponse };
          const apiCard = json.data;
          const cardResults: PriceResult[] = [];

          // TCGPlayer prices (USD)
          if (apiCard.tcgplayer?.prices) {
            for (const [variant, priceData] of Object.entries(apiCard.tcgplayer.prices)) {
              cardResults.push({
                card_id: card.id,
                source: "tcgplayer",
                variant,
                currency: "USD",
                market_price_cents: dollarsToCents(priceData.market),
                low_price_cents: dollarsToCents(priceData.low),
                mid_price_cents: dollarsToCents(priceData.mid),
                high_price_cents: dollarsToCents(priceData.high),
              });
            }
          }

          // CardMarket prices (EUR)
          if (apiCard.cardmarket?.prices) {
            const cm = apiCard.cardmarket.prices;

            if (cm.averageSellPrice != null || cm.lowPrice != null || cm.trendPrice != null) {
              cardResults.push({
                card_id: card.id,
                source: "cardmarket",
                variant: "normal",
                currency: "EUR",
                market_price_cents: dollarsToCents(cm.averageSellPrice),
                low_price_cents: dollarsToCents(cm.lowPrice),
                mid_price_cents: dollarsToCents(cm.trendPrice),
                high_price_cents: dollarsToCents(cm.suggestedPrice),
              });
            }

            if (
              cm.reverseHoloSell != null ||
              cm.reverseHoloLow != null ||
              cm.reverseHoloTrend != null
            ) {
              cardResults.push({
                card_id: card.id,
                source: "cardmarket",
                variant: "reverseHolofoil",
                currency: "EUR",
                market_price_cents: dollarsToCents(cm.reverseHoloSell),
                low_price_cents: dollarsToCents(cm.reverseHoloLow),
                mid_price_cents: dollarsToCents(cm.reverseHoloTrend),
                high_price_cents: null,
              });
            }
          }

          return cardResults;
        }),
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(...result.value);
        }
      }

      // Delay between batches
      if (i + batchSize < cards.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return results;
  },
};
