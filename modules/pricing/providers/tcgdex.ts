/**
 * TCGdex provider — FREE
 * API: https://api.tcgdex.net/v2
 * Returns CardMarket EUR prices + TCGPlayer USD prices from per-card endpoint.
 *
 * Each card response includes a `pricing` object with:
 *   - cardmarket: avg, low, trend, avg1/7/30, holo variants (EUR)
 *   - tcgplayer: per-variant lowPrice/midPrice/highPrice/marketPrice (USD)
 */

import type { CardRef, PriceProvider, PriceResult, ProviderConfig } from "./types";

const API_BASE = "https://api.tcgdex.net/v2/en";

function toCents(value: number | undefined | null): number | null {
  if (value == null) return null;
  return Math.round(value * 100);
}

/** Shape of the pricing.tcgplayer variant object. */
interface TcgPlayerVariant {
  productId?: number;
  lowPrice?: number;
  midPrice?: number;
  highPrice?: number;
  marketPrice?: number;
  directLowPrice?: number | null;
}

/** Shape of the card response from TCGdex /cards/{id}. */
interface TcgdexCardResponse {
  id: string;
  name: string;
  variants?: {
    normal?: boolean;
    reverse?: boolean;
    holo?: boolean;
    firstEdition?: boolean;
  };
  pricing?: {
    cardmarket?: {
      unit?: string;
      avg?: number;
      low?: number;
      trend?: number;
      avg1?: number;
      avg7?: number;
      avg30?: number;
      "avg-holo"?: number | null;
      "low-holo"?: number | null;
      "trend-holo"?: number | null;
      "avg1-holo"?: number | null;
      "avg7-holo"?: number | null;
      "avg30-holo"?: number | null;
    };
    tcgplayer?: {
      unit?: string;
      normal?: TcgPlayerVariant;
      holofoil?: TcgPlayerVariant;
      reverseHolofoil?: TcgPlayerVariant;
      "1stEditionHolofoil"?: TcgPlayerVariant;
      "1stEditionNormal"?: TcgPlayerVariant;
      [key: string]: TcgPlayerVariant | string | undefined;
    };
  };
}

/** Variant key → our standard variant name. */
const TCGPLAYER_VARIANT_MAP: Record<string, string> = {
  normal: "normal",
  holofoil: "holofoil",
  reverseHolofoil: "reverseHolofoil",
  "1stEditionHolofoil": "1stEdition",
  "1stEditionNormal": "1stEdition",
};

async function fetchCard(externalId: string): Promise<TcgdexCardResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/cards/${externalId}`);
    if (!res.ok) return null;
    return (await res.json()) as TcgdexCardResponse;
  } catch {
    return null;
  }
}

export const tcgdexProvider: PriceProvider = {
  name: "tcgdex",
  displayName: "TCGdex (CardMarket + TCGPlayer)",
  requiresKey: false,

  async fetchPrices(cards: CardRef[], _config: ProviderConfig): Promise<PriceResult[]> {
    const results: PriceResult[] = [];
    const BATCH_SIZE = 5;
    const BATCH_DELAY_MS = 500;

    // Process in parallel batches of 5
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
      const batch = cards.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (card) => {
          const data = await fetchCard(card.external_id);
          if (!data?.pricing) return [];

          const cardResults: PriceResult[] = [];
          const cm = data.pricing.cardmarket;
          const tp = data.pricing.tcgplayer;

          // ── CardMarket prices (EUR) ──────────────────────────────
          if (cm) {
            if (cm.avg != null || cm.low != null || cm.trend != null) {
              cardResults.push({
                card_id: card.id,
                source: "tcgdex",
                variant: "normal",
                currency: "EUR",
                market_price_cents: toCents(cm.trend),
                low_price_cents: toCents(cm.low),
                mid_price_cents: toCents(cm.avg),
                high_price_cents: toCents(cm.avg1),
              });
            }

            if (cm["trend-holo"] != null || cm["avg-holo"] != null || cm["low-holo"] != null) {
              cardResults.push({
                card_id: card.id,
                source: "tcgdex",
                variant: "holofoil",
                currency: "EUR",
                market_price_cents: toCents(cm["trend-holo"]),
                low_price_cents: toCents(cm["low-holo"]),
                mid_price_cents: toCents(cm["avg-holo"]),
                high_price_cents: toCents(cm["avg1-holo"]),
              });
            }
          }

          // ── TCGPlayer prices (USD) ──────────────────────────────
          if (tp) {
            for (const [variantKey, ourVariant] of Object.entries(TCGPLAYER_VARIANT_MAP)) {
              const variantData = tp[variantKey];
              if (!variantData || typeof variantData === "string") continue;

              cardResults.push({
                card_id: card.id,
                source: "tcgdex",
                variant: ourVariant,
                currency: "USD",
                market_price_cents: toCents(variantData.marketPrice),
                low_price_cents: toCents(variantData.lowPrice),
                mid_price_cents: toCents(variantData.midPrice),
                high_price_cents: toCents(variantData.highPrice),
              });
            }
          }

          return cardResults;
        }),
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") results.push(...result.value);
      }

      // Polite delay between batches
      if (i + BATCH_SIZE < cards.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    return results;
  },
};
