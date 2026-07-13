import { usePolling } from "../../hooks/usePolling";
import { api } from "../../lib/api";
import { DataPanel } from "./DataPanel";

interface FxRate {
  id: string;
  base: string;
  quote: string;
  rate: number;
  fetched_at: number;
}

interface FxResponse {
  rates: FxRate[];
}

/** Currency flags for visual interest. */
const FLAGS: Record<string, string> = {
  GBP: "GBP",
  EUR: "EUR",
  JPY: "JPY",
  HKD: "HKD",
  SGD: "SGD",
};

export function FxRatesPanel() {
  const { data, loading } = usePolling<FxResponse>(
    () => api.get<FxResponse>("/pricing/fx"),
    300_000,
  );

  const rates = data?.rates ?? [];

  // Only show USD-based pairs (not reverse pairs)
  const usdPairs = rates.filter((r) => r.base === "USD" && FLAGS[r.quote]);

  return (
    <DataPanel title="FX Rates (USD Base)">
      <div className="divide-y divide-[var(--color-border)]">
        {loading && usdPairs.length === 0 ? (
          <div className="px-2 py-4 text-center text-[10px] text-[var(--color-muted-foreground)]">
            Loading...
          </div>
        ) : usdPairs.length === 0 ? (
          <div className="px-2 py-4 text-center text-[10px] text-[var(--color-muted-foreground)]">
            No FX data
          </div>
        ) : (
          usdPairs.map((r) => (
            <div
              key={`${r.base}_${r.quote}`}
              className="flex items-center justify-between px-2 py-1.5 text-[11px]"
            >
              <span className="font-medium">
                {r.base}/{r.quote}
              </span>
              <span className="font-mono tabular-nums">
                {(r.rate / 1_000_000).toFixed(4)}
              </span>
            </div>
          ))
        )}
      </div>
    </DataPanel>
  );
}
