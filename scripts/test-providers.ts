/**
 * Manual integration test — exercises free providers against live APIs.
 * Run with: bun run scripts/test-providers.ts
 */
import { conflate } from "../modules/pricing/conflation";
import "../modules/pricing/providers/index";
import { getFreeProviders } from "../modules/pricing/providers/registry";
import type { CardRef, PriceResult } from "../modules/pricing/providers/types";

// Test cards — well-known cards with confirmed pricing on multiple sources
const testCards: CardRef[] = [
  {
    id: "test-charizard-base",
    external_id: "base1-4",
    name: "Charizard",
    set_code: "base1",
    set_name: "Base Set",
  },
  {
    id: "test-pikachu-base",
    external_id: "base1-58",
    name: "Pikachu",
    set_code: "base1",
    set_name: "Base Set",
  },
];

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  ARCA Conflated Pricing — Provider Integration Test");
  console.log("═══════════════════════════════════════════════════\n");

  const freeProviders = getFreeProviders();
  console.log(`Free providers registered: ${freeProviders.map((p) => p.name).join(", ")}\n`);

  const allResults: PriceResult[] = [];

  for (const provider of freeProviders) {
    console.log(`── ${provider.displayName} ──────────────────────`);
    const start = Date.now();
    try {
      const results = await provider.fetchPrices(testCards, {});
      const elapsed = Date.now() - start;
      console.log(`  ✅ ${results.length} prices in ${elapsed}ms`);

      for (const r of results) {
        const card = testCards.find((c) => c.id === r.card_id);
        const market = r.market_price_cents ? `$${(r.market_price_cents / 100).toFixed(2)}` : "—";
        const low = r.low_price_cents ? `$${(r.low_price_cents / 100).toFixed(2)}` : "—";
        const mid = r.mid_price_cents ? `$${(r.mid_price_cents / 100).toFixed(2)}` : "—";
        const high = r.high_price_cents ? `$${(r.high_price_cents / 100).toFixed(2)}` : "—";
        console.log(
          `     ${card?.name ?? r.card_id} [${r.variant}] ${r.currency} — mkt:${market} low:${low} mid:${mid} high:${high}`,
        );
      }

      allResults.push(...results);
    } catch (err) {
      const elapsed = Date.now() - start;
      console.log(
        `  ❌ FAILED in ${elapsed}ms: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    console.log();
  }

  // Run conflation
  console.log("── Conflation Engine ──────────────────────");
  const conflated = conflate(allResults);
  console.log(`  ${conflated.length} conflated prices:\n`);

  for (const cp of conflated) {
    const card = testCards.find((c) => c.id === cp.card_id);
    console.log(`  ${card?.name ?? cp.card_id} [${cp.variant}] ${cp.currency}`);
    if (cp.market_price_cents) {
      console.log(`    Market: $${(cp.market_price_cents / 100).toFixed(2)} ← ${cp.market_source}`);
    }
    if (cp.low_price_cents) {
      console.log(`    Low:    $${(cp.low_price_cents / 100).toFixed(2)} ← ${cp.low_source}`);
    }
    if (cp.mid_price_cents) {
      console.log(`    Mid:    $${(cp.mid_price_cents / 100).toFixed(2)} ← ${cp.mid_source}`);
    }
    if (cp.high_price_cents) {
      console.log(`    High:   $${(cp.high_price_cents / 100).toFixed(2)} ← ${cp.high_source}`);
    }
    console.log();
  }

  // Summary
  const sources = new Set(allResults.map((r) => r.source));
  const withPrices = allResults.filter((r) => r.market_price_cents || r.mid_price_cents);
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Sources:     ${sources.size} (${[...sources].join(", ")})`);
  console.log(`  Total rows:  ${allResults.length}`);
  console.log(`  With prices: ${withPrices.length}`);
  console.log(`  Conflated:   ${conflated.length}`);
  console.log("═══════════════════════════════════════════════════");
}

main().catch(console.error);
