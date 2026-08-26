const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Prices older than this (or with no timestamp at all) are not shown as a specific relative time. */
export const STALE_THRESHOLD_MS = 7 * DAY_MS;

/** A `card_prices`/`graded_prices` fetch timestamp as it can arrive over the wire: an ISO string
 * (raw DB rows serialize `Date` this way), a ms-epoch number (conflated per-field timestamps), or
 * missing entirely. */
export type TimestampInput = string | number | Date | null | undefined;

function toDate(timestamp: TimestampInput): Date | null {
  if (timestamp == null) return null;
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Renders a compact relative-time label, e.g. "2h ago", "3d ago". Returns null when the
 * timestamp is missing or unparseable — callers should show a "no recent update" flag instead. */
export function formatRelativeTime(
  timestamp: TimestampInput,
  now: number = Date.now(),
): string | null {
  const date = toDate(timestamp);
  if (!date) return null;

  const diffMs = Math.max(0, now - date.getTime());
  if (diffMs < MINUTE_MS) return "just now";
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)}h ago`;
  return `${Math.floor(diffMs / DAY_MS)}d ago`;
}

/** True when the timestamp is missing, unparseable, or older than the staleness threshold —
 * i.e. when a specific relative time would be misleading rather than informative. */
export function isStale(timestamp: TimestampInput, now: number = Date.now()): boolean {
  const date = toDate(timestamp);
  if (!date) return true;
  return now - date.getTime() > STALE_THRESHOLD_MS;
}
