import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../lib/api";
import { formatReturn } from "../../lib/money";

interface ChartData {
  dates: string[];
  values: number[];
  returns: number[];
}

const PERIODS = ["1M", "3M", "6M", "1Y", "ALL"] as const;

export function PerformanceChart({ portfolioId }: { portfolioId: string }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("3M");
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<ChartData>(`/performance/${portfolioId}/chart?period=${period}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [portfolioId, period]);

  const chartPoints = data
    ? data.dates.map((date, i) => ({
        date: new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        value: (data.values[i] ?? 0) / 100,
        return: data.returns[i] ?? 0,
      }))
    : [];

  const cumulativeReturn = data?.returns.length ? (data.returns[data.returns.length - 1] ?? 0) : 0;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Portfolio Performance</h3>
          {data && (
            <p
              className={`text-lg font-bold tabular-nums ${
                cumulativeReturn >= 0
                  ? "text-[var(--color-positive)]"
                  : "text-[var(--color-negative)]"
              }`}
            >
              {formatReturn(cumulativeReturn)}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded px-2 py-1 text-xs font-medium ${
                period === p
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-[var(--color-muted-foreground)]">
          Loading chart...
        </div>
      ) : chartPoints.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-[var(--color-muted-foreground)]">
          No performance data yet. Add transactions and sync prices to see your performance chart.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartPoints}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
              }}
              formatter={(value: unknown) => [`$${Number(value).toFixed(2)}`, "Value"]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
