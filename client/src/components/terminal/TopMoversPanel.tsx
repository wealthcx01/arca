import { TrendingUp } from "lucide-react";
import { useState } from "react";
import { usePolling } from "../../hooks/usePolling";
import { api } from "../../lib/api";
import { DataPanel } from "./DataPanel";
import { PanelEmptyState, PanelErrorState } from "./PanelEmptyState";

interface MoverItem {
  id: string;
  name: string;
  set_name: string;
  rarity: string | null;
  current_price_cents: number;
  change_cents: number;
  pct_change: number;
  currency: string;
}

interface MoversResponse {
  data: MoverItem[];
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface TopMoversPanelProps {
  onCardSelect?: (id: string, name: string) => void;
}

export function TopMoversPanel({ onCardSelect }: TopMoversPanelProps = {}) {
  const [period, setPeriod] = useState("7d");
  const { data, loading, error } = usePolling<MoversResponse>(
    () => api.get<MoversResponse>(`/market/movers?limit=20&period=${period}`),
    120_000,
    [period],
  );

  const items = data?.data ?? [];
  const gainers = items.filter((m) => m.pct_change > 0);
  const losers = items.filter((m) => m.pct_change < 0);

  const periodButtons = ["1d", "7d", "30d"];

  const toolbar = (
    <div className="flex gap-0.5">
      {periodButtons.map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
            period === p
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );

  if (!loading && error) {
    return (
      <DataPanel title="Top Movers" toolbar={toolbar}>
        <PanelErrorState message={error} />
      </DataPanel>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <DataPanel title="Top Movers" toolbar={toolbar}>
        <PanelEmptyState
          icon={TrendingUp}
          message="Top gainers and losers will appear here once graded price data is available for your tracked sets."
          ctaLabel="Browse the catalog"
          ctaHref="/cards"
        />
      </DataPanel>
    );
  }

  return (
    <DataPanel title="Top Movers" toolbar={toolbar}>
      <div className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
        {/* Gainers */}
        <div>
          <div className="border-b border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-1">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-positive)]">
              Gainers
            </span>
          </div>
          <div className="max-h-[280px] divide-y divide-[var(--color-border)] overflow-auto">
            {gainers.length === 0 ? (
              <div className="px-2 py-4 text-center text-[10px] text-[var(--color-muted-foreground)]">
                {loading ? "Loading..." : "No gainers"}
              </div>
            ) : (
              gainers.slice(0, 10).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    if (onCardSelect) onCardSelect(m.id, m.name);
                    else window.location.href = `/cards/${m.id}`;
                  }}
                  className="flex w-full items-center justify-between px-2 py-1 text-[11px] text-left hover:bg-[var(--color-muted)]"
                >
                  <span className="max-w-[45%] truncate font-medium">{m.name}</span>
                  <span className="font-mono tabular-nums text-[var(--color-muted-foreground)]">
                    {formatPrice(m.current_price_cents)}
                  </span>
                  <span className="font-mono tabular-nums text-[var(--color-positive)]">
                    +{m.pct_change.toFixed(1)}%
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Losers */}
        <div>
          <div className="border-b border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-1">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-negative)]">
              Losers
            </span>
          </div>
          <div className="max-h-[280px] divide-y divide-[var(--color-border)] overflow-auto">
            {losers.length === 0 ? (
              <div className="px-2 py-4 text-center text-[10px] text-[var(--color-muted-foreground)]">
                {loading ? "Loading..." : "No losers"}
              </div>
            ) : (
              losers.slice(0, 10).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    if (onCardSelect) onCardSelect(m.id, m.name);
                    else window.location.href = `/cards/${m.id}`;
                  }}
                  className="flex w-full items-center justify-between px-2 py-1 text-[11px] text-left hover:bg-[var(--color-muted)]"
                >
                  <span className="max-w-[45%] truncate font-medium">{m.name}</span>
                  <span className="font-mono tabular-nums text-[var(--color-muted-foreground)]">
                    {formatPrice(m.current_price_cents)}
                  </span>
                  <span className="font-mono tabular-nums text-[var(--color-negative)]">
                    {m.pct_change.toFixed(1)}%
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </DataPanel>
  );
}
