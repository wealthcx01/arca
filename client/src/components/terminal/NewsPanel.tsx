import { Bell } from "lucide-react";
import { usePolling } from "../../hooks/usePolling";
import { api } from "../../lib/api";
import { DataPanel } from "./DataPanel";
import { PanelEmptyState, PanelErrorState } from "./PanelEmptyState";

interface AlertItem {
  id: string;
  name: string;
  set_name: string;
  rarity: string | null;
  current_price_cents: number;
  old_price_cents: number;
  change_cents: number;
  pct_change: number;
  currency: string;
}

interface AlertsResponse {
  data: AlertItem[];
}

function formatPrice(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}

interface NewsPanelProps {
  onCardSelect?: (id: string, name: string) => void;
}

export function NewsPanel({ onCardSelect }: NewsPanelProps = {}) {
  const { data, loading, error } = usePolling<AlertsResponse>(
    () => api.get<AlertsResponse>("/market/alerts?limit=15&period=7d"),
    120_000,
  );

  const alerts = data?.data ?? [];

  if (!loading && error) {
    return (
      <DataPanel title="Price Alerts (>5% Move)">
        <PanelErrorState message={error} />
      </DataPanel>
    );
  }

  if (!loading && alerts.length === 0) {
    return (
      <DataPanel title="Price Alerts (>5% Move)">
        <PanelEmptyState
          icon={Bell}
          message="Price alerts flag cards that moved more than 5% in the past week. They'll appear here once enough price history has built up."
          ctaLabel="Browse the catalog"
          ctaHref="/cards"
        />
      </DataPanel>
    );
  }

  return (
    <DataPanel title="Price Alerts (>5% Move)">
      <div className="max-h-[320px] divide-y divide-[var(--color-border)] overflow-auto">
        {loading && alerts.length === 0 ? (
          <div className="px-2 py-6 text-center text-[10px] text-[var(--color-muted-foreground)]">
            Loading alerts...
          </div>
        ) : (
          alerts.map((a) => {
            const isUp = a.pct_change > 0;
            const color = isUp ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]";
            const sign = isUp ? "+" : "";

            return (
              <button
                key={a.id}
                onClick={() =>
                  onCardSelect
                    ? onCardSelect(a.id, a.name)
                    : (window.location.href = `/cards/${a.id}`)
                }
                className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] text-left hover:bg-[var(--color-muted)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{a.name}</div>
                  <div className="text-[9px] text-[var(--color-muted-foreground)]">
                    {a.set_name}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono tabular-nums">{formatPrice(a.current_price_cents)}</div>
                  <div className={`font-mono tabular-nums text-[10px] ${color}`}>
                    {sign}
                    {a.pct_change.toFixed(1)}%
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </DataPanel>
  );
}
