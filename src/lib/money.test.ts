import { describe, expect, test } from "bun:test";
import {
  centsToDecimal,
  convertCurrency,
  decimalToCents,
  decimalToFxRate,
  formatMoney,
  formatMoneyCompact,
  fxRateToDecimal,
} from "./money";

describe("centsToDecimal", () => {
  test("converts positive cents to decimal", () => {
    expect(centsToDecimal(1500)).toBe(15.0);
  });

  test("converts zero cents", () => {
    expect(centsToDecimal(0)).toBe(0);
  });

  test("converts negative cents", () => {
    expect(centsToDecimal(-250)).toBe(-2.5);
  });

  test("converts single cent", () => {
    expect(centsToDecimal(1)).toBe(0.01);
  });

  test("converts large amounts", () => {
    expect(centsToDecimal(1_000_000_00)).toBe(1_000_000);
  });

  test("preserves fractional result for odd cents", () => {
    expect(centsToDecimal(99)).toBe(0.99);
  });
});

describe("decimalToCents", () => {
  test("converts positive decimal to cents", () => {
    expect(decimalToCents(15.0)).toBe(1500);
  });

  test("converts zero", () => {
    expect(decimalToCents(0)).toBe(0);
  });

  test("converts negative decimal", () => {
    expect(decimalToCents(-2.5)).toBe(-250);
  });

  test("rounds to nearest cent (float precision)", () => {
    // 10.005 * 100 = 1000.5000...07 in IEEE 754 => Math.round => 1001
    expect(decimalToCents(10.005)).toBe(1001);
  });

  test("rounds down sub-half cent", () => {
    // 10.004 * 100 = 1000.4, Math.round => 1000
    expect(decimalToCents(10.004)).toBe(1000);
  });

  test("handles floating point edge case 0.1 + 0.2", () => {
    // 0.30000000000000004 * 100 = 30.000000000000004 => rounds to 30
    expect(decimalToCents(0.1 + 0.2)).toBe(30);
  });

  test("converts large decimal amount", () => {
    expect(decimalToCents(999_999.99)).toBe(99_999_999);
  });
});

describe("formatMoney", () => {
  test("formats GBP by default", () => {
    const result = formatMoney(150_00);
    // en-GB GBP format: £150.00
    expect(result).toContain("150.00");
    expect(result).toContain("£");
  });

  test("formats USD explicitly", () => {
    const result = formatMoney(150_00, "USD");
    expect(result).toContain("150.00");
    // en-GB formats USD as US$
    expect(result).toMatch(/US\$|\$/);
  });

  test("formats zero", () => {
    const result = formatMoney(0);
    expect(result).toContain("0.00");
  });

  test("formats negative amount", () => {
    const result = formatMoney(-500_00);
    expect(result).toContain("500.00");
    // Should contain minus sign or be wrapped in parens
    expect(result).toMatch(/-|−/);
  });

  test("formats single cent", () => {
    const result = formatMoney(1);
    expect(result).toContain("0.01");
  });

  test("formats JPY currency", () => {
    const result = formatMoney(100_00, "JPY");
    // JPY has no minor units, but formatMoney forces 2 decimals on the cent-converted value
    expect(result).toContain("100.00");
  });

  test("formats large amount with thousands separator", () => {
    const result = formatMoney(1_234_567_89);
    // en-GB uses comma as thousands separator: £12,345,678.89
    expect(result).toContain(",");
  });
});

describe("formatMoneyCompact", () => {
  test("shows M suffix for millions", () => {
    // $5,000,000 = 500_000_000 cents => decimal = 5_000_000 => 5.0M
    const result = formatMoneyCompact(500_000_000);
    expect(result).toBe("5.0M");
  });

  test("shows M suffix at exactly 1M", () => {
    // $1,000,000 = 100_000_000 cents => decimal = 1_000_000 => 1.0M
    const result = formatMoneyCompact(100_000_000);
    expect(result).toBe("1.0M");
  });

  test("shows K suffix for thousands", () => {
    // $5,000 = 500_000 cents => decimal = 5_000 => 5.0K
    const result = formatMoneyCompact(500_000);
    expect(result).toBe("5.0K");
  });

  test("shows K suffix at exactly 1000", () => {
    // $1,000 = 100_000 cents => decimal = 1_000 => 1.0K
    const result = formatMoneyCompact(100_000);
    expect(result).toBe("1.0K");
  });

  test("falls back to formatMoney for small amounts", () => {
    // $999.99 = 99_999 cents => decimal = 999.99, below 1000 threshold
    const result = formatMoneyCompact(99_999);
    expect(result).toContain("999.99");
    expect(result).toContain("£");
  });

  test("handles negative millions", () => {
    // -$2,000,000 = -200_000_000 cents => decimal = -2_000_000 => abs >= 1M
    const result = formatMoneyCompact(-200_000_000);
    expect(result).toBe("-2.0M");
  });

  test("handles negative thousands", () => {
    // -$5,000 = -500_000 cents => decimal = -5_000 => abs >= 1K
    const result = formatMoneyCompact(-500_000);
    expect(result).toBe("-5.0K");
  });
});

describe("fxRateToDecimal", () => {
  test("converts rate integer to decimal", () => {
    // GBPUSD 1.27 stored as 1_270_000
    expect(fxRateToDecimal(1_270_000)).toBe(1.27);
  });

  test("converts parity rate", () => {
    expect(fxRateToDecimal(1_000_000)).toBe(1.0);
  });

  test("converts sub-parity rate", () => {
    // GBPJPY 0.0053 stored as 5_300
    expect(fxRateToDecimal(5_300)).toBeCloseTo(0.0053, 6);
  });

  test("converts zero rate", () => {
    expect(fxRateToDecimal(0)).toBe(0);
  });

  test("converts high precision rate", () => {
    // 1.234567 stored as 1_234_567
    expect(fxRateToDecimal(1_234_567)).toBeCloseTo(1.234567, 6);
  });
});

describe("decimalToFxRate", () => {
  test("converts decimal rate to integer", () => {
    expect(decimalToFxRate(1.27)).toBe(1_270_000);
  });

  test("converts parity rate", () => {
    expect(decimalToFxRate(1.0)).toBe(1_000_000);
  });

  test("rounds to nearest integer", () => {
    // 1.2345675 * 1_000_000 = 1_234_567.5 => rounds to 1_234_568
    expect(decimalToFxRate(1.2345675)).toBe(1_234_568);
  });

  test("converts zero", () => {
    expect(decimalToFxRate(0)).toBe(0);
  });

  test("roundtrips with fxRateToDecimal", () => {
    const original = 1.27;
    const asInt = decimalToFxRate(original);
    const backToDecimal = fxRateToDecimal(asInt);
    expect(backToDecimal).toBe(original);
  });
});

describe("convertCurrency", () => {
  test("converts GBP to USD at 1.27", () => {
    // 100.00 GBP * 1.27 = 127.00 USD
    const gbpCents = 100_00;
    const rate = 1_270_000; // 1.27
    expect(convertCurrency(gbpCents, rate)).toBe(127_00);
  });

  test("converts at parity rate", () => {
    const amount = 500_00;
    const rate = 1_000_000; // 1.0
    expect(convertCurrency(amount, rate)).toBe(500_00);
  });

  test("converts with sub-parity rate", () => {
    // 10000 cents * 0.5 rate = 5000 cents
    const amount = 10_000;
    const rate = 500_000; // 0.5
    expect(convertCurrency(amount, rate)).toBe(5_000);
  });

  test("rounds result to nearest cent", () => {
    // 33 cents * 1.333333 = 43.999989 => rounds to 44
    const amount = 33;
    const rate = 1_333_333;
    expect(convertCurrency(amount, rate)).toBe(44);
  });

  test("handles zero amount", () => {
    expect(convertCurrency(0, 1_270_000)).toBe(0);
  });

  test("handles negative amount (unrealized loss)", () => {
    expect(convertCurrency(-100_00, 1_270_000)).toBe(-127_00);
  });

  test("large amount conversion is precise", () => {
    // 1,000,000.00 GBP * 1.27 = 1,270,000.00 USD
    const amount = 100_000_000; // $1M in cents
    const rate = 1_270_000;
    expect(convertCurrency(amount, rate)).toBe(127_000_000);
  });

  test("handles very small fractional rate", () => {
    // 1000 cents at rate 0.006 => 1000 * 6000 / 1_000_000 = 6
    const amount = 1000;
    const rate = 6_000; // 0.006
    expect(convertCurrency(amount, rate)).toBe(6);
  });
});
