/**
 * TCGCSV provider — FREE
 * API: https://tcgcsv.com
 * Returns TCGPlayer price data (USD) organized by set (group).
 * Pokemon TCG game ID = 3 on TCGPlayer.
 */

import type { CardRef, PriceProvider, PriceResult, ProviderConfig } from "./types";

const API_BASE = "https://tcgcsv.com/tcgplayer";
const POKEMON_GAME_ID = 3;

interface TcgCsvProduct {
  productId: number;
  name: string;
  cleanName: string;
  groupId: number;
  url: string;
  modifiedOn: string;
  extendedData?: Array<{ name: string; displayName: string; value: string }>;
}

interface TcgCsvPrice {
  productId: number;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
  subTypeName: string; // "Normal", "Holofoil", "Reverse Holofoil", "1st Edition Holofoil"
}

interface TcgCsvGroup {
  groupId: number;
  name: string;
  abbreviation: string;
  isSupplemental: boolean;
  publishedOn: string;
  modifiedOn: string;
}

function dollarsToCents(value: number | undefined | null): number | null {
  if (value == null) return null;
  return Math.round(value * 100);
}

/** Map TCGCSV subtype names to our standard variant names. */
function normalizeVariant(subTypeName: string): string {
  const lower = subTypeName.toLowerCase();
  if (lower.includes("reverse")) return "reverseHolofoil";
  if (lower.includes("1st edition")) return "1stEdition";
  if (lower.includes("holofoil") || lower.includes("holo")) return "holofoil";
  return "normal";
}

// Cache group list to avoid repeated lookups
let groupCache: TcgCsvGroup[] | null = null;
let groupCacheTime = 0;
const GROUP_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

async function getGroups(): Promise<TcgCsvGroup[]> {
  if (groupCache && Date.now() - groupCacheTime < GROUP_CACHE_TTL) {
    return groupCache;
  }

  try {
    const res = await fetch(`${API_BASE}/${POKEMON_GAME_ID}/groups`);
    if (!res.ok) return [];
    const data = (await res.json()) as { results: TcgCsvGroup[] };
    groupCache = data.results ?? [];
    groupCacheTime = Date.now();
    return groupCache;
  } catch {
    return [];
  }
}

/** Find the TCGCSV groupId that matches a set code. */
async function findGroupId(setCode: string, setName: string): Promise<number | null> {
  const groups = await getGroups();

  // Try matching by abbreviation first
  const abbrevMatch = groups.find((g) => g.abbreviation.toLowerCase() === setCode.toLowerCase());
  if (abbrevMatch) return abbrevMatch.groupId;

  // Fall back to name match
  const nameMatch = groups.find((g) => g.name.toLowerCase() === setName.toLowerCase());
  if (nameMatch) return nameMatch.groupId;

  return null;
}

async function fetchGroupPrices(
  groupId: number,
): Promise<{ products: TcgCsvProduct[]; prices: TcgCsvPrice[] }> {
  try {
    const [prodRes, priceRes] = await Promise.all([
      fetch(`${API_BASE}/${POKEMON_GAME_ID}/${groupId}/products`),
      fetch(`${API_BASE}/${POKEMON_GAME_ID}/${groupId}/prices`),
    ]);

    if (!prodRes.ok || !priceRes.ok) return { products: [], prices: [] };

    const prodData = (await prodRes.json()) as { results: TcgCsvProduct[] };
    const priceData = (await priceRes.json()) as { results: TcgCsvPrice[] };

    return {
      products: prodData.results ?? [],
      prices: priceData.results ?? [],
    };
  } catch {
    return { products: [], prices: [] };
  }
}

/** Try to match a card to a TCGCSV product by name. */
function matchProduct(card: CardRef, products: TcgCsvProduct[]): TcgCsvProduct | null {
  const cardNameLower = card.name.toLowerCase();

  // Exact match on cleanName
  const exact = products.find((p) => p.cleanName.toLowerCase() === cardNameLower);
  if (exact) return exact;

  // Contains match (card name inside product name)
  const partial = products.find((p) => p.cleanName.toLowerCase().includes(cardNameLower));
  if (partial) return partial;

  return null;
}

export const tcgcsvProvider: PriceProvider = {
  name: "tcgcsv",
  displayName: "TCGCSV (TCGPlayer)",
  requiresKey: false,

  async fetchPrices(cards: CardRef[], _config: ProviderConfig): Promise<PriceResult[]> {
    const results: PriceResult[] = [];

    // Group cards by set for efficient batch fetching
    const bySet = new Map<string, CardRef[]>();
    for (const card of cards) {
      const key = `${card.set_code}|${card.set_name}`;
      const existing = bySet.get(key) ?? [];
      existing.push(card);
      bySet.set(key, existing);
    }

    for (const [setKey, setCards] of bySet) {
      const [setCode, setName] = setKey.split("|") as [string, string];
      const groupId = await findGroupId(setCode, setName);
      if (!groupId) continue;

      const { products, prices } = await fetchGroupPrices(groupId);
      if (products.length === 0) continue;

      // Build productId -> prices map
      const priceByProduct = new Map<number, TcgCsvPrice[]>();
      for (const price of prices) {
        const existing = priceByProduct.get(price.productId) ?? [];
        existing.push(price);
        priceByProduct.set(price.productId, existing);
      }

      for (const card of setCards) {
        const product = matchProduct(card, products);
        if (!product) continue;

        const productPrices = priceByProduct.get(product.productId) ?? [];

        for (const priceRow of productPrices) {
          results.push({
            card_id: card.id,
            source: "tcgcsv",
            variant: normalizeVariant(priceRow.subTypeName),
            currency: "USD",
            market_price_cents: dollarsToCents(priceRow.marketPrice),
            low_price_cents: dollarsToCents(priceRow.lowPrice),
            mid_price_cents: dollarsToCents(priceRow.midPrice),
            high_price_cents: dollarsToCents(priceRow.highPrice),
          });
        }
      }
    }

    return results;
  },
};
