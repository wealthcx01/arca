/**
 * Provider interface for the conflated pricing system.
 * Inspired by LSEG/Eikon multi-contributor model.
 */

/** Card identity passed to providers for price lookup. */
export interface CardRef {
  id: string; // Internal card ID (nanoid)
  external_id: string; // Pokemon TCG API ID e.g. "base1-4"
  name: string;
  set_code: string;
  set_name: string;
}

/** A single price result from a provider. */
export interface PriceResult {
  card_id: string;
  source: string; // e.g. "tcgplayer", "cardmarket", "tcgdex", "tcgcsv"
  variant: string; // e.g. "normal", "holofoil", "reverseHolofoil", "1stEdition"
  currency: string; // "USD", "EUR"
  market_price_cents: number | null;
  low_price_cents: number | null;
  mid_price_cents: number | null;
  high_price_cents: number | null;
}

/** Graded price result from providers that support graded pricing. */
export interface GradedPriceResult {
  card_id: string;
  source: string;
  grading_company: string; // "PSA", "CGC", "BGS"
  grade: string; // "10", "9.5", "9"
  price_cents: number;
  currency: string;
  sale_type: string; // "market", "last_sold", "average"
}

/** Configuration passed to providers. */
export interface ProviderConfig {
  apiKey?: string; // BYOK key (decrypted)
  batchSize?: number;
  delayMs?: number;
}

/** Provider interface — every pricing source implements this. */
export interface PriceProvider {
  /** Unique identifier for this provider. */
  readonly name: string;

  /** Human-readable display name. */
  readonly displayName: string;

  /** Whether this provider requires a user-supplied API key. */
  readonly requiresKey: boolean;

  /** Fetch prices for a batch of cards. Partial failure allowed. */
  fetchPrices(cards: CardRef[], config: ProviderConfig): Promise<PriceResult[]>;

  /** Fetch graded prices (optional — not all providers support this). */
  fetchGradedPrices?(cards: CardRef[], config: ProviderConfig): Promise<GradedPriceResult[]>;
}

/** Result of a conflation pass — the "best" price for a card+variant. */
export interface ConflatedPrice {
  card_id: string;
  variant: string;
  market_price_cents: number | null;
  market_source: string | null;
  low_price_cents: number | null;
  low_source: string | null;
  mid_price_cents: number | null;
  mid_source: string | null;
  high_price_cents: number | null;
  high_source: string | null;
  currency: string; // Normalized to USD
}
