import { useState } from "react";
import { DataPanel } from "../components/terminal/DataPanel";
import { type Column, DataTable } from "../components/terminal/DataTable";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";

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
  if (!cents) return "—";
  return "$" + (cents / 100).toFixed(2);
}

const columns: Column<AlertItem>[] = [
  {
    key: "name",
    label: "Card",
    sortable: true,
    sortFn: (a, b) => a.name.localeCompare(b.name),
    render: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    key: "set_name",
    label: "Set",
    sortable: true,
    sortFn: (a, b) => a.set_name.localeCompare(b.set_name),
    render: (row) => <span className="text-[var(--color-muted-foreground)]">{row.set_name}</span>,
  },
  {
    key: "rarity",
    label: "Rarity",
    render: (row) => (
      <span className="text-[var(--color-muted-foreground)]">{row.rarity || "—"}</span>
    ),
  },
  {
    key: "old_price_cents",
    label: "Previous",
    align: "right",
    sortable: true,
    sortFn: (a, b) => a.old_price_cents - b.old_price_cents,
    render: (row) => (
      <span className="font-mono tabular-nums text-[var(--color-muted-foreground)]">
        {formatPrice(row.old_price_cents)}
      </span>
    ),
  },
  {
    key: "current_price_cents",
    label: "Current",
    align: "right",
    sortable: true,
    sortFn: (a, b) => a.current_price_cents - b.current_price_cents,
    render: (row) => (
      <span className="font-mono font-semibold tabular-nums">
        {formatPrice(row.current_price_cents)}
      </span>
    ),
  },
  {
    key: "pct_change",
    label: "Change %",
    align: "right",
    sortable: true,
    sortFn: (a, b) => a.pct_change - b.pct_change,
    render: (row) => {
      const isUp = row.pct_change > 0;
      const color = isUp ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]";
      const sign = isUp ? "+" : "";
      return (
        <span className={`font-mono font-semibold tabular-nums ${color}`}>
          {sign}
          {row.pct_change.toFixed(1)}%
        </span>
      );
    },
  },
];

// Release calendar placeholder
const releaseCalendar = [
  { date: "2026-03-28", name: "Prismatic Evolutions: Surprise Box" },
  { date: "2026-04-04", name: "Journey Together" },
  { date: "2026-06-13", name: "Destined Rivals" },
  { date: "2026-08-08", name: "Space-Time Smackdown" },
];

export function MarketNewsPage() {
  const [period, setPeriod] = useState("7d");

  const { data, loading } = usePolling<AlertsResponse>(
    () => api.get<AlertsResponse>(`/market/alerts?limit=50&period=${period}`),
    120_000,
    [period],
  );

  const alerts = data?.data ?? [];

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
      {/* Main: Price alerts table */}
      <DataPanel
        title="Price Alerts"
        toolbar={
          <div className="flex gap-0.5">
            {["1d", "7d", "30d"].map((p) => (
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
        }
      >
        {loading && alerts.length === 0 ? (
          <div className="py-12 text-center text-[10px] text-[var(--color-muted-foreground)]">
            Loading alerts...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={alerts}
            rowKey={(r) => r.id}
            onRowClick={(r) => (window.location.href = `/cards/${r.id}`)}
            maxHeight="calc(100vh - 200px)"
            emptyMessage="No significant price movements found"
          />
        )}
      </DataPanel>

      {/* Sidebar: Release calendar */}
      <div className="flex flex-col gap-3">
        <DataPanel title="Release Calendar">
          <div className="divide-y divide-[var(--color-border)]">
            {releaseCalendar.map((item) => {
              const d = new Date(item.date);
              const isPast = d < new Date();
              return (
                <div key={item.date} className={`px-2 py-2 ${isPast ? "opacity-50" : ""}`}>
                  <div className="text-[10px] font-semibold text-[var(--color-primary)]">
                    {d.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="mt-0.5 text-[11px]">{item.name}</div>
                </div>
              );
            })}
          </div>
        </DataPanel>

        <DataPanel title="About Alerts">
          <div className="px-2 py-3 text-[10px] leading-relaxed text-[var(--color-muted-foreground)]">
            Cards with &gt;5% price movement within the selected period are flagged as alerts. Price
            data is sourced from multiple providers and conflated for accuracy.
          </div>
        </DataPanel>
      </div>
    </div>
  );
}
