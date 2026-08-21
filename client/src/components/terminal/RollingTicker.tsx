import { usePolling } from "../../hooks/usePolling";
import { api } from "../../lib/api";

interface TickerItem {
  name: string;
  set_name: string;
  price_cents: number;
  change_cents: number;
  change_pct: number;
  currency: string;
}

interface TickerResponse {
  data: TickerItem[];
}

function formatPrice(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}

export function RollingTicker() {
  const { data } = usePolling<TickerResponse>(
    () => api.get<TickerResponse>("/market/ticker"),
    60_000,
  );

  const items = data?.data ?? [];

  if (items.length === 0) {
    return (
      <div className="flex h-6 flex-1 items-center overflow-hidden px-4">
        <span className="text-[10px] text-[var(--color-muted-foreground)]">
          Loading market data...
        </span>
      </div>
    );
  }

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="flex h-6 flex-1 items-center overflow-hidden">
      <div className="ticker-track flex whitespace-nowrap">
        {doubled.map((item, i) => {
          const isUp = item.change_cents >= 0;
          const color = isUp ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]";
          const sign = isUp ? "+" : "";

          return (
            <span
              key={`${item.name}-${i}`}
              className="mx-3 inline-flex items-center gap-1.5 text-[11px]"
            >
              <span className="font-medium text-[var(--color-foreground)]">{item.name}</span>
              <span className="font-mono tabular-nums text-[var(--color-foreground)]">
                {formatPrice(item.price_cents)}
              </span>
              <span className={`font-mono tabular-nums ${color}`}>
                {sign}
                {item.change_pct.toFixed(1)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
