import { describe, expect, test } from "bun:test";

/**
 * Tests for the weighted average cost (WAC) calculation logic
 * used by rebuildHoldings in the portfolio engine.
 *
 * Since rebuildHoldings depends on the database (Drizzle ORM),
 * we extract and test the pure WAC arithmetic independently.
 * The formulas match engine.ts lines 51-72 exactly.
 */

// ── Pure WAC calculation extracted from engine.ts ──────────────────────

interface TransactionInput {
  type: "BUY" | "SELL";
  quantity: number;
  price_cents: number;
  shipping_cents: number;
  fees_cents: number;
  taxes_cents: number;
}

interface HoldingState {
  qty: number;
  avgCostCents: number;
  totalCostBasisCents: number;
}

/**
 * Replicate the exact WAC logic from engine.ts.
 * This is a pure function with no DB dependency.
 */
function computeWAC(txns: TransactionInput[]): HoldingState {
  let qty = 0;
  let avgCostCents = 0;
  let totalCostBasisCents = 0;

  for (const txn of txns) {
    if (txn.type === "BUY") {
      const totalTxnCost =
        txn.price_cents * txn.quantity + txn.shipping_cents + txn.fees_cents + txn.taxes_cents;

      if (qty === 0) {
        avgCostCents = Math.round(totalTxnCost / txn.quantity);
      } else {
        avgCostCents = Math.round((qty * avgCostCents + totalTxnCost) / (qty + txn.quantity));
      }
      qty += txn.quantity;
      totalCostBasisCents = qty * avgCostCents;
    } else if (txn.type === "SELL") {
      qty -= txn.quantity;
      if (qty < 0) qty = 0;
      totalCostBasisCents = qty * avgCostCents;
    }
  }

  return { qty, avgCostCents, totalCostBasisCents };
}

// ── Helper to build a BUY transaction ──────────────────────────────────

function buy(
  quantity: number,
  priceCents: number,
  extras: { shipping?: number; fees?: number; taxes?: number } = {},
): TransactionInput {
  return {
    type: "BUY",
    quantity,
    price_cents: priceCents,
    shipping_cents: extras.shipping ?? 0,
    fees_cents: extras.fees ?? 0,
    taxes_cents: extras.taxes ?? 0,
  };
}

function sell(quantity: number): TransactionInput {
  return {
    type: "SELL",
    quantity,
    price_cents: 0,
    shipping_cents: 0,
    fees_cents: 0,
    taxes_cents: 0,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("Weighted Average Cost — single BUY", () => {
  test("single card purchase sets average cost", () => {
    const result = computeWAC([buy(1, 50_00)]);
    expect(result.qty).toBe(1);
    expect(result.avgCostCents).toBe(50_00);
    expect(result.totalCostBasisCents).toBe(50_00);
  });

  test("multi-quantity purchase divides total cost evenly", () => {
    // 3 cards at $20 each = $60 total, avg = $20
    // totalTxnCost = 20_00 * 3 = 60_00, avgCostCents = round(60_00 / 3) = 20_00
    const result = computeWAC([buy(3, 20_00)]);
    expect(result.qty).toBe(3);
    expect(result.avgCostCents).toBe(20_00);
    expect(result.totalCostBasisCents).toBe(60_00);
  });

  test("includes shipping in cost basis", () => {
    // 1 card at $50, $5 shipping => total cost $55
    const result = computeWAC([buy(1, 50_00, { shipping: 5_00 })]);
    expect(result.qty).toBe(1);
    expect(result.avgCostCents).toBe(55_00);
    expect(result.totalCostBasisCents).toBe(55_00);
  });

  test("includes fees and taxes in cost basis", () => {
    // 1 card at $100, $3 fees, $7 taxes => total $110
    const result = computeWAC([buy(1, 100_00, { fees: 3_00, taxes: 7_00 })]);
    expect(result.avgCostCents).toBe(110_00);
  });

  test("includes all extras in cost basis for multiple cards", () => {
    // 2 cards at $25 each = $50 + $10 shipping + $2 fees + $3 tax = $65 total
    // avg = round(65_00 / 2) = 32_50
    const result = computeWAC([buy(2, 25_00, { shipping: 10_00, fees: 2_00, taxes: 3_00 })]);
    expect(result.qty).toBe(2);
    expect(result.avgCostCents).toBe(32_50);
    expect(result.totalCostBasisCents).toBe(65_00);
  });
});

describe("Weighted Average Cost — multiple BUYs", () => {
  test("two buys at same price keeps average stable", () => {
    const result = computeWAC([buy(1, 50_00), buy(1, 50_00)]);
    expect(result.qty).toBe(2);
    expect(result.avgCostCents).toBe(50_00);
    expect(result.totalCostBasisCents).toBe(100_00);
  });

  test("two buys at different prices computes weighted average", () => {
    // Buy 1 at $40, then 1 at $60
    // WAC = (1*40_00 + 60_00) / 2 = 50_00
    const result = computeWAC([buy(1, 40_00), buy(1, 60_00)]);
    expect(result.qty).toBe(2);
    expect(result.avgCostCents).toBe(50_00);
    expect(result.totalCostBasisCents).toBe(100_00);
  });

  test("weighted average with unequal quantities", () => {
    // Buy 3 at $10, then 1 at $30
    // WAC = (3*10_00 + 30_00) / 4 = 60_00/4 = 15_00
    const result = computeWAC([buy(3, 10_00), buy(1, 30_00)]);
    expect(result.qty).toBe(4);
    expect(result.avgCostCents).toBe(15_00);
    expect(result.totalCostBasisCents).toBe(60_00);
  });

  test("three sequential buys accumulate correctly", () => {
    // Buy 1 at $100, buy 2 at $200, buy 1 at $50
    // Step 1: totalTxnCost = 10000*1 = 10000. qty=1, avg = 10000
    // Step 2: totalTxnCost = 20000*2 = 40000. avg = (1*10000 + 40000)/3 = 50000/3 = 16667
    // Step 3: totalTxnCost = 5000*1 = 5000. avg = (3*16667 + 5000)/4 = 55001/4 = 13750.25 => 13750
    const result = computeWAC([buy(1, 100_00), buy(2, 200_00), buy(1, 50_00)]);
    expect(result.qty).toBe(4);
    expect(result.avgCostCents).toBe(13_750);
    expect(result.totalCostBasisCents).toBe(4 * 13_750);
  });

  test("WAC with shipping on second buy only", () => {
    // Buy 1 at $100 (no extras), then buy 1 at $100 + $20 shipping
    // After 1st: avg = 100_00
    // After 2nd: total = 1*100_00 + (100_00 + 20_00) = 220_00, avg = 220_00/2 = 110_00
    const result = computeWAC([buy(1, 100_00), buy(1, 100_00, { shipping: 20_00 })]);
    expect(result.qty).toBe(2);
    expect(result.avgCostCents).toBe(110_00);
  });
});

describe("Weighted Average Cost — SELL transactions", () => {
  test("sell reduces quantity but keeps average cost", () => {
    const result = computeWAC([buy(3, 50_00), sell(1)]);
    expect(result.qty).toBe(2);
    expect(result.avgCostCents).toBe(50_00); // avg unchanged on sell
    expect(result.totalCostBasisCents).toBe(100_00);
  });

  test("sell all cards results in zero quantity", () => {
    const result = computeWAC([buy(2, 100_00), sell(2)]);
    expect(result.qty).toBe(0);
    expect(result.totalCostBasisCents).toBe(0);
  });

  test("overselling clamps to zero (never negative)", () => {
    const result = computeWAC([buy(1, 50_00), sell(5)]);
    expect(result.qty).toBe(0);
    expect(result.totalCostBasisCents).toBe(0);
  });

  test("sell then buy resets average cost", () => {
    // Buy 1 at $100, sell 1, buy 1 at $200
    // After buy: qty=1, avg=100_00
    // After sell: qty=0, avg=100_00 (doesn't matter)
    // After second buy: qty=0 so avg = totalTxnCost/qty = 200_00/1 = 200_00
    const result = computeWAC([buy(1, 100_00), sell(1), buy(1, 200_00)]);
    expect(result.qty).toBe(1);
    expect(result.avgCostCents).toBe(200_00);
    expect(result.totalCostBasisCents).toBe(200_00);
  });

  test("partial sell preserves WAC for remaining units", () => {
    // Buy 2 at $50, buy 2 at $150
    // After 1st buy: qty=2, avg=50_00
    // After 2nd buy: avg = (2*50_00 + 150_00*2) / 4 = (100_00 + 300_00)/4 = 400_00/4 = 100_00
    // Sell 1: qty=3, avg stays 100_00
    const result = computeWAC([buy(2, 50_00), buy(2, 150_00), sell(1)]);
    expect(result.qty).toBe(3);
    expect(result.avgCostCents).toBe(100_00);
    expect(result.totalCostBasisCents).toBe(300_00);
  });

  test("multiple sells reduce position correctly", () => {
    const result = computeWAC([buy(5, 80_00), sell(2), sell(1)]);
    expect(result.qty).toBe(2);
    expect(result.avgCostCents).toBe(80_00);
    expect(result.totalCostBasisCents).toBe(160_00);
  });
});

describe("Weighted Average Cost — edge cases", () => {
  test("empty transaction list returns zero state", () => {
    const result = computeWAC([]);
    expect(result.qty).toBe(0);
    expect(result.avgCostCents).toBe(0);
    expect(result.totalCostBasisCents).toBe(0);
  });

  test("buy with zero price (free card)", () => {
    const result = computeWAC([buy(1, 0)]);
    expect(result.qty).toBe(1);
    expect(result.avgCostCents).toBe(0);
    expect(result.totalCostBasisCents).toBe(0);
  });

  test("buy then buy at zero price dilutes average", () => {
    // Buy 1 at $100, then get 1 free
    // avg = (1*100_00 + 0) / 2 = 50_00
    const result = computeWAC([buy(1, 100_00), buy(1, 0)]);
    expect(result.qty).toBe(2);
    expect(result.avgCostCents).toBe(50_00);
  });

  test("single-cent card", () => {
    const result = computeWAC([buy(1, 1)]);
    expect(result.qty).toBe(1);
    expect(result.avgCostCents).toBe(1);
  });

  test("rounding is applied on each buy (intermediate rounding)", () => {
    // Buy 3 at $10.00 each: totalTxnCost = 1000*3 = 3000, avg = round(3000/3) = 1000
    // Buy 1 at $1.01: totalTxnCost = 101*1 = 101
    //   avg = round((3*1000 + 101) / 4) = round(3101/4) = round(775.25) = 775
    const result = computeWAC([buy(3, 10_00), buy(1, 1_01)]);
    expect(result.qty).toBe(4);
    expect(result.avgCostCents).toBe(775);
    expect(result.totalCostBasisCents).toBe(4 * 775);
  });

  test("large position builds up correctly", () => {
    // Buy 100 cards at $5 each in 10 transactions
    const txns: TransactionInput[] = Array(10)
      .fill(null)
      .map(() => buy(10, 5_00));
    const result = computeWAC(txns);
    expect(result.qty).toBe(100);
    expect(result.avgCostCents).toBe(5_00);
    expect(result.totalCostBasisCents).toBe(500_00);
  });

  test("realistic scenario: accumulate, partial sell, buy more", () => {
    // Buy 4 at $25 (w/ $5 shipping) => totalCost = 4*25_00 + 5_00 = 105_00, avg = round(105_00/4) = 26_25
    // Sell 2 => qty=2, avg=26_25, basis=52_50
    // Buy 3 at $30 (w/ $8 fees) => totalCost = 3*30_00 + 8_00 = 98_00
    //   avg = round((2*26_25 + 98_00) / (2+3)) = round((52_50 + 98_00)/5) = round(150_50/5) = round(30100) = 30_100
    // Final: qty=5, avg=30_100, basis=150_500
    const result = computeWAC([
      buy(4, 25_00, { shipping: 5_00 }),
      sell(2),
      buy(3, 30_00, { fees: 8_00 }),
    ]);
    expect(result.qty).toBe(5);
    // Step 1: totalTxnCost = 4*2500 + 500 = 10500. avg = round(10500/4) = 2625
    // Step 2: sell 2. qty = 2, avg = 2625
    // Step 3: totalTxnCost = 3*3000 + 800 = 9800. avg = round((2*2625 + 9800) / 5) = round(15050/5) = round(3010) = 3010
    expect(result.avgCostCents).toBe(3010);
    expect(result.totalCostBasisCents).toBe(5 * 3010);
  });
});

describe("Weighted Average Cost — P&L verification", () => {
  test("unrealized P&L can be computed from holding state", () => {
    // Buy 2 at $50 => avg=50_00, basis=100_00
    // If current market price is $75 per card:
    // unrealized P&L = qty * (market_price - avg_cost) = 2 * (75_00 - 50_00) = 50_00
    const holding = computeWAC([buy(2, 50_00)]);
    const marketPriceCents = 75_00;
    const unrealizedPnl = holding.qty * (marketPriceCents - holding.avgCostCents);
    expect(unrealizedPnl).toBe(50_00); // $50 profit
  });

  test("unrealized loss when market below cost", () => {
    const holding = computeWAC([buy(3, 100_00)]);
    const marketPriceCents = 80_00;
    const unrealizedPnl = holding.qty * (marketPriceCents - holding.avgCostCents);
    expect(unrealizedPnl).toBe(-60_00); // $60 loss
  });

  test("market value equals cost basis at breakeven", () => {
    const holding = computeWAC([buy(5, 30_00, { shipping: 10_00 })]);
    // avg = round((5*30_00 + 10_00) / 5) = round(160_00/5) = 32_00
    const marketValue = holding.qty * holding.avgCostCents;
    expect(marketValue).toBe(holding.totalCostBasisCents);
  });
});

describe("Daily performance return calculation", () => {
  /**
   * Daily return = (end_value / start_value) represented as (1+r) * 1_000_000.
   * This mirrors what the performance module would compute.
   */
  function dailyReturn1pr(startValueCents: number, endValueCents: number): number {
    if (startValueCents === 0) return 1_000_000; // flat if no starting value
    return Math.round((endValueCents / startValueCents) * 1_000_000);
  }

  test("+10% day", () => {
    // Start: $1000, End: $1100 => 1.1 => 1_100_000
    expect(dailyReturn1pr(100_000, 110_000)).toBe(1_100_000);
  });

  test("-5% day", () => {
    // Start: $2000, End: $1900 => 0.95 => 950_000
    expect(dailyReturn1pr(200_000, 190_000)).toBe(950_000);
  });

  test("flat day", () => {
    expect(dailyReturn1pr(100_000, 100_000)).toBe(1_000_000);
  });

  test("total wipeout", () => {
    expect(dailyReturn1pr(100_000, 0)).toBe(0);
  });

  test("zero start value returns flat", () => {
    expect(dailyReturn1pr(0, 50_000)).toBe(1_000_000);
  });

  test("doubling day", () => {
    expect(dailyReturn1pr(50_000, 100_000)).toBe(2_000_000);
  });

  test("small fractional return rounds correctly", () => {
    // Start: $10000, End: $10001 => 1.00001 => 1_000_010
    // 10001/10000 * 1_000_000 = 1_000_100
    expect(dailyReturn1pr(1_000_000, 1_000_100)).toBe(1_000_100);
  });
});
