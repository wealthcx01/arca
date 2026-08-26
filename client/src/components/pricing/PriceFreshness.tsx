import { type TimestampInput, formatRelativeTime, isStale } from "../../lib/time";

interface PriceFreshnessProps {
  fetchedAt: TimestampInput;
}

/** Small inline label shown next to a price: "updated 2h ago", or a "no recent update" flag when
 * the timestamp is missing or past the staleness threshold — surfacing trust, not a fake time. */
export function PriceFreshness({ fetchedAt }: PriceFreshnessProps) {
  if (isStale(fetchedAt)) {
    return (
      <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        no recent update
      </span>
    );
  }

  return (
    <span className="text-[9px] text-[var(--color-muted-foreground)]">
      updated {formatRelativeTime(fetchedAt)}
    </span>
  );
}
