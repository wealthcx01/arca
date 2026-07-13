export function centsToDecimal(cents: number): number {
  return cents / 100;
}

export function formatMoney(cents: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(centsToDecimal(cents));
}

export function formatMoneyCompact(cents: number): string {
  const val = centsToDecimal(cents);
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(2);
}

export function formatReturn(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}
