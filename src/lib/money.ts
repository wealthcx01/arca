/**
 * Money utilities — all values stored as INTEGER cents.
 * NEVER use REAL or FLOAT for money.
 */

export function centsToDecimal(cents: number): number {
  return cents / 100;
}

export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100);
}

export function formatMoney(cents: number, currency = "GBP"): string {
  const decimal = centsToDecimal(cents);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decimal);
}

export function formatMoneyCompact(cents: number, currency = "GBP"): string {
  const decimal = centsToDecimal(cents);
  if (Math.abs(decimal) >= 1_000_000) {
    return `${(decimal / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(decimal) >= 1_000) {
    return `${(decimal / 1_000).toFixed(1)}K`;
  }
  return formatMoney(cents, currency);
}

/** Convert FX rate integer (rate * 1_000_000) back to decimal */
export function fxRateToDecimal(rateInt: number): number {
  return rateInt / 1_000_000;
}

/** Convert decimal FX rate to integer (rate * 1_000_000) */
export function decimalToFxRate(rate: number): number {
  return Math.round(rate * 1_000_000);
}

/** Convert amount in one currency to another using FX rate integer */
export function convertCurrency(amountCents: number, fxRateInt: number): number {
  return Math.round((amountCents * fxRateInt) / 1_000_000);
}
