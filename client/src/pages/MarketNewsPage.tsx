import { Newspaper } from "lucide-react";
import { useState } from "react";
import { DataPanel } from "../components/terminal/DataPanel";
import { type Column, DataTable } from "../components/terminal/DataTable";
import { PanelEmptyState, PanelErrorState } from "../components/terminal/PanelEmptyState";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { safeLinkHref } from "../lib/newsUrl";
import { formatRelativeTime } from "../lib/time";

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

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  url: string | null;
  published_at: string | number;
  sentiment: "positive" | "negative" | "neutral";
}

interface NewsResponse {
  data: NewsItem[];
}

function formatPrice(cents: number): string {
  if (!cents) return "—";
  return `$${(cents / 100).toFixed(2)}`;
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

export function MarketNewsPage() {
  const [period, setPeriod] = useState("7d");

  const { data, loading } = usePolling<AlertsResponse>(
    () => api.get<AlertsResponse>(`/market/alerts?limit=50&period=${period}`),
    120_000,
    [period],
  );

  const {
    data: newsData,
    loading: newsLoading,
    error: newsError,
  } = usePolling<NewsResponse>(() => api.get<NewsResponse>("/news?limit=30"), 120_000);

  const alerts = data?.data ?? [];
  const news = newsData?.data ?? [];

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
      {/* Main: News */}
      <DataPanel title="News">
        {newsLoading && news.length === 0 ? (
          <div className="py-12 text-center text-[10px] text-[var(--color-muted-foreground)]">
            Loading news...
          </div>
        ) : newsError ? (
          <PanelErrorState message={newsError} />
        ) : news.length === 0 ? (
          <PanelEmptyState
            icon={Newspaper}
            message="No news yet. Market commentary and articles will appear here once published."
            ctaLabel="Browse the catalog"
            ctaHref="/cards"
          />
        ) : (
          <div
            className="divide-y divide-[var(--color-border)] overflow-auto"
            style={{ maxHeight: "calc(100vh - 200px)" }}
          >
            {news.map((item) => {
              const href = safeLinkHref(item.url);
              const published = formatRelativeTime(item.published_at);
              return (
                <div key={item.id} className="px-3 py-2.5">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-medium hover:underline"
                    >
                      {item.title}
                    </a>
                  ) : (
                    <span className="text-[12px] font-medium">{item.title}</span>
                  )}
                  {item.summary && (
                    <p className="mt-1 text-[10px] leading-snug text-[var(--color-muted-foreground)]">
                      {item.summary}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[9px] text-[var(--color-muted-foreground)]">
                    <span>{item.source}</span>
                    {published && <span>· {published}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DataPanel>

      {/* Sidebar: Price alerts (secondary — not to be confused with news) */}
      <div className="flex flex-col gap-3">
        <DataPanel
          title="Price Alerts"
          toolbar={
            <div className="flex gap-0.5">
              {["1d", "7d", "30d"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                    period === p
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
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
              onRowClick={(r) => {
                window.location.href = `/cards/${r.id}`;
              }}
              maxHeight="calc(100vh - 200px)"
              emptyMessage="No significant price movements found"
            />
          )}
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
