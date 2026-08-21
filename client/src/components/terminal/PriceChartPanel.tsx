import { LineChart as LineChartIcon } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePolling } from "../../hooks/usePolling";
import { api } from "../../lib/api";
import { DataPanel } from "./DataPanel";
import { PanelEmptyState, PanelErrorState } from "./PanelEmptyState";

interface HistoryPoint {
  recorded_at: number;
  market_price_cents: number | null;
  mid_price_cents: number | null;
}

interface HistoryResponse {
  card_id: string;
  days: number;
  history: HistoryPoint[];
}

interface PriceChartPanelProps {
  cardId?: string;
  cardName?: string;
}

export function PriceChartPanel({ cardId, cardName }: PriceChartPanelProps) {
  const [days, setDays] = useState(30);

  const { data, loading, error } = usePolling<HistoryResponse>(
    () =>
      cardId
        ? api.get<HistoryResponse>(`/pricing/${cardId}/history?days=${days}`)
        : Promise.resolve({ card_id: "", days: 0, history: [] }),
    120_000,
    [cardId, days],
  );

  const periodButtons = [
    { label: "7D", value: 7 },
    { label: "1M", value: 30 },
    { label: "3M", value: 90 },
    { label: "1Y", value: 365 },
  ];

  const chartData = (data?.history ?? [])
    .filter((p) => p.market_price_cents != null)
    .map((p) => ({
      date: new Date(p.recorded_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      price: (p.market_price_cents ?? 0) / 100,
      timestamp: p.recorded_at,
    }))
    .reverse();

  return (
    <DataPanel
      title={cardName ? `Price — ${cardName}` : "Price Chart"}
      toolbar={
        <div className="flex gap-0.5">
          {periodButtons.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                days === p.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="p-2" style={{ height: 200 }}>
        {!cardId ? (
          <div className="flex h-full items-center justify-center">
            <PanelEmptyState
              icon={LineChartIcon}
              message="Price history for any card you select (from Top Movers, Alerts, or the catalog) will chart here."
              ctaLabel="Browse the catalog"
              ctaHref="/cards"
            />
          </div>
        ) : !loading && error ? (
          <div className="flex h-full items-center justify-center">
            <PanelErrorState message={error} />
          </div>
        ) : loading && chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[10px] text-[var(--color-muted-foreground)]">
            Loading chart...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <PanelEmptyState
              icon={LineChartIcon}
              message="No price history has been recorded yet for this card."
              ctaLabel="Browse the catalog"
              ctaHref="/cards"
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={45}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 11,
                }}
                formatter={(value: unknown) => [`$${Number(value).toFixed(2)}`, "Price"]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="var(--color-primary)"
                strokeWidth={1.5}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </DataPanel>
  );
}
