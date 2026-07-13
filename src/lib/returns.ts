/**
 * Return formatting utilities.
 * Returns stored as (1+r) * 1_000_000 integer.
 * e.g. 1_015_000 = +1.5%, 985_000 = -1.5%
 */

const PRECISION = 1_000_000;

/** Convert return_1pr integer to percentage */
export function returnToPercent(return1pr: number): number {
  return (return1pr / PRECISION - 1) * 100;
}

/** Convert percentage to return_1pr integer */
export function percentToReturn(pct: number): number {
  return Math.round((1 + pct / 100) * PRECISION);
}

/** Compound an array of return_1pr integers into cumulative return % */
export function compoundReturns(returns: number[]): number {
  const cumulative = returns.reduce((acc, r) => (acc * r) / PRECISION, PRECISION);
  return (cumulative / PRECISION - 1) * 100;
}

/** Format return as string with sign and % */
export function formatReturn(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

/** Format return as basis points */
export function formatBps(pct: number): string {
  const bps = Math.round(pct * 100);
  const sign = bps >= 0 ? "+" : "";
  return `${sign}${bps} bps`;
}
