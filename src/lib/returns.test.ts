import { describe, expect, test } from "bun:test";
import {
  compoundReturns,
  formatBps,
  formatReturn,
  percentToReturn,
  returnToPercent,
} from "./returns";

describe("returnToPercent", () => {
  test("converts positive return to percentage", () => {
    // 1_015_000 => (1.015 - 1) * 100 = +1.5%
    expect(returnToPercent(1_015_000)).toBeCloseTo(1.5, 6);
  });

  test("converts negative return to percentage", () => {
    // 985_000 => (0.985 - 1) * 100 = -1.5%
    expect(returnToPercent(985_000)).toBeCloseTo(-1.5, 6);
  });

  test("converts flat return (no change)", () => {
    expect(returnToPercent(1_000_000)).toBe(0);
  });

  test("converts large positive return", () => {
    // 2_000_000 => (2.0 - 1) * 100 = +100%
    expect(returnToPercent(2_000_000)).toBeCloseTo(100, 6);
  });

  test("converts total loss", () => {
    // 0 => (0 - 1) * 100 = -100%
    expect(returnToPercent(0)).toBe(-100);
  });

  test("converts fractional return 0.01%", () => {
    // 1_000_100 => (1.0001 - 1) * 100 = +0.01%
    expect(returnToPercent(1_000_100)).toBeCloseTo(0.01, 4);
  });

  test("converts small negative return -0.05%", () => {
    // 999_500 => (0.9995 - 1) * 100 = -0.05%
    expect(returnToPercent(999_500)).toBeCloseTo(-0.05, 4);
  });
});

describe("percentToReturn", () => {
  test("converts positive percentage to return integer", () => {
    expect(percentToReturn(1.5)).toBe(1_015_000);
  });

  test("converts negative percentage to return integer", () => {
    expect(percentToReturn(-1.5)).toBe(985_000);
  });

  test("converts zero percentage", () => {
    expect(percentToReturn(0)).toBe(1_000_000);
  });

  test("converts 100% gain", () => {
    expect(percentToReturn(100)).toBe(2_000_000);
  });

  test("converts -100% (total loss)", () => {
    expect(percentToReturn(-100)).toBe(0);
  });

  test("rounds to nearest integer", () => {
    // 0.33333% => (1 + 0.0033333) * 1_000_000 = 1_003_333.3 => 1_003_333
    expect(percentToReturn(0.33333)).toBe(1_003_333);
  });

  test("roundtrips with returnToPercent for whole percentage", () => {
    const pct = 5.25;
    const ret = percentToReturn(pct);
    const back = returnToPercent(ret);
    expect(back).toBeCloseTo(pct, 4);
  });

  test("roundtrips with returnToPercent for negative percentage", () => {
    const pct = -3.75;
    const ret = percentToReturn(pct);
    const back = returnToPercent(ret);
    expect(back).toBeCloseTo(pct, 4);
  });
});

describe("compoundReturns", () => {
  test("compounds two positive daily returns", () => {
    // Day 1: +1%, Day 2: +2%
    // (1.01 * 1.02 - 1) * 100 = 3.02%
    const returns = [percentToReturn(1), percentToReturn(2)];
    expect(compoundReturns(returns)).toBeCloseTo(3.02, 1);
  });

  test("compounds positive and negative returns", () => {
    // +10% then -10%: (1.1 * 0.9 - 1) * 100 = -1%
    const returns = [percentToReturn(10), percentToReturn(-10)];
    expect(compoundReturns(returns)).toBeCloseTo(-1, 1);
  });

  test("returns 0% for empty array", () => {
    expect(compoundReturns([])).toBeCloseTo(0, 6);
  });

  test("returns single day return unchanged", () => {
    const returns = [percentToReturn(5)];
    expect(compoundReturns(returns)).toBeCloseTo(5, 2);
  });

  test("compounds flat returns", () => {
    const returns = [1_000_000, 1_000_000, 1_000_000];
    expect(compoundReturns(returns)).toBeCloseTo(0, 6);
  });

  test("compounds many small daily returns", () => {
    // 10 days of +0.5% each
    // (1.005)^10 - 1 = 0.05114... => ~5.11%
    const returns = Array(10).fill(percentToReturn(0.5));
    expect(compoundReturns(returns)).toBeCloseTo(5.11, 0);
  });

  test("total loss wipes out all prior gains", () => {
    // +50% then -100% => 0 - should be -100%
    const returns = [percentToReturn(50), percentToReturn(-100)];
    expect(compoundReturns(returns)).toBeCloseTo(-100, 1);
  });

  test("compounding is not additive (demonstrates non-linearity)", () => {
    // +20% then -20% is NOT 0%, it's -4%
    const returns = [percentToReturn(20), percentToReturn(-20)];
    const result = compoundReturns(returns);
    expect(result).not.toBeCloseTo(0, 1);
    expect(result).toBeCloseTo(-4, 0);
  });
});

describe("formatReturn", () => {
  test("formats positive return with + sign", () => {
    expect(formatReturn(1.5)).toBe("+1.50%");
  });

  test("formats negative return with - sign", () => {
    expect(formatReturn(-1.5)).toBe("-1.50%");
  });

  test("formats zero return with + sign", () => {
    expect(formatReturn(0)).toBe("+0.00%");
  });

  test("formats large return", () => {
    expect(formatReturn(100)).toBe("+100.00%");
  });

  test("formats return with many decimals (truncated to 2)", () => {
    expect(formatReturn(3.14159265)).toBe("+3.14%");
  });

  test("rounds at .005 boundary (JS toFixed quirk)", () => {
    // Note: (1.005).toFixed(2) === "1.00" in JS due to float representation
    // 1.005 is stored as 1.004999..., so toFixed(2) rounds down
    expect(formatReturn(1.005)).toBe("+1.00%");
  });

  test("formats negative fractional return", () => {
    expect(formatReturn(-0.33)).toBe("-0.33%");
  });
});

describe("formatBps", () => {
  test("formats positive basis points", () => {
    // 1.5% = 150 bps
    expect(formatBps(1.5)).toBe("+150 bps");
  });

  test("formats negative basis points", () => {
    expect(formatBps(-1.5)).toBe("-150 bps");
  });

  test("formats zero basis points", () => {
    expect(formatBps(0)).toBe("+0 bps");
  });

  test("formats fractional percentage to rounded bps", () => {
    // 0.33% = 33 bps (rounds from 33.0)
    expect(formatBps(0.33)).toBe("+33 bps");
  });

  test("rounds bps to nearest integer", () => {
    // 0.335% = 33.5 bps => rounds to 34
    expect(formatBps(0.335)).toBe("+34 bps");
  });

  test("formats 1 basis point", () => {
    expect(formatBps(0.01)).toBe("+1 bps");
  });

  test("formats large bps value", () => {
    // 10% = 1000 bps
    expect(formatBps(10)).toBe("+1000 bps");
  });

  test("formats negative fractional bps", () => {
    // -0.05% = -5 bps
    expect(formatBps(-0.05)).toBe("-5 bps");
  });
});
