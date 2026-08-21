import { LineChart } from "lucide-react";
import { usePolling } from "../../hooks/usePolling";
import { api } from "../../lib/api";
import { DataPanel } from "./DataPanel";
import { PanelEmptyState, PanelErrorState } from "./PanelEmptyState";

interface SetData {
  set_code: string;
  set_name: string;
  card_count: number;
  avg_price_cents: number;
  total_value_cents: number;
  last_updated: number | null;
}

interface SetsResponse {
  data: SetData[];
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatValue(cents: number): string {
  if (cents >= 100000) return `$${(cents / 100000).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(0)}`;
}

export function SetPerformancePanel() {
  const { data, loading, error } = usePolling<SetsResponse>(
    () => api.get<SetsResponse>("/market/sets?limit=15"),
    120_000,
  );

  const sets = data?.data ?? [];

  if (!loading && error) {
    return (
      <DataPanel title="Set Indices">
        <PanelErrorState message={error} />
      </DataPanel>
    );
  }

  if (!loading && sets.length === 0) {
    return (
      <DataPanel title="Set Indices">
        <PanelEmptyState
          icon={LineChart}
          message="Set indices show average and total card value per Pokemon set. They'll appear here once set price data is available."
          ctaLabel="Browse sets"
          ctaHref="/sets"
        />
      </DataPanel>
    );
  }

  return (
    <DataPanel title="Set Indices">
      <div className="max-h-[320px] overflow-auto">
        <table className="w-full terminal-dense">
          <thead className="sticky top-0 bg-[var(--color-muted)]">
            <tr>
              <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Set
              </th>
              <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Avg
              </th>
              <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Total
              </th>
              <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Cards
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading && sets.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-4 text-center text-[10px] text-[var(--color-muted-foreground)]"
                >
                  Loading...
                </td>
              </tr>
            ) : (
              sets.map((s) => (
                <tr
                  key={s.set_code}
                  className="cursor-pointer hover:bg-[var(--color-muted)]"
                  onClick={() => {
                    window.location.href = `/sets?set=${s.set_code}`;
                  }}
                >
                  <td className="max-w-[140px] truncate px-2 py-1 font-medium">{s.set_name}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">
                    {formatPrice(s.avg_price_cents)}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                    {formatValue(s.total_value_cents)}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                    {s.card_count}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DataPanel>
  );
}
