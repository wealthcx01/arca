/**
 * Set momentum heatmap — CSS grid colored by trend score.
 * Green = positive trend, Red = negative trend, intensity = |trend|.
 */

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface SetData {
  set_code: string;
  set_name: string;
  card_count: number;
  avg_trend: number;
  avg_arca_score: number;
  total_value_cents: number;
}

export function SetMomentumHeatmap() {
  const [data, setData] = useState<SetData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: SetData[] }>("/analytics/heatmap")
      .then((res) => setData(res.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-[var(--color-muted-foreground)]">
        Loading heatmap...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-[var(--color-muted-foreground)]">
        No momentum data available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1 sm:grid-cols-6 md:grid-cols-8">
      {data.slice(0, 48).map((set) => {
        const trend = set.avg_trend ?? 0;
        const intensity = Math.min(1, Math.abs(trend) / 50);
        const isPositive = trend >= 0;

        const mixPct = Math.round((0.1 + intensity * 0.5) * 100);
        const bgColor = isPositive
          ? `color-mix(in srgb, var(--color-positive) ${mixPct}%, var(--color-card))`
          : `color-mix(in srgb, var(--color-negative) ${mixPct}%, var(--color-card))`;

        const textColor =
          intensity > 0.3
            ? isPositive
              ? "var(--color-positive-foreground)"
              : "var(--color-negative-foreground)"
            : "var(--color-foreground)";

        return (
          <a
            key={set.set_code}
            href={`/market/sets/${set.set_code}`}
            className="flex flex-col items-center justify-center rounded p-2 text-center transition-transform hover:scale-105"
            style={{ backgroundColor: bgColor, color: textColor }}
            title={`${set.set_name}: Trend ${trend > 0 ? "+" : ""}${trend.toFixed(0)}, ${set.card_count} cards`}
          >
            <span className="text-[9px] font-semibold uppercase leading-tight">
              {set.set_code.length > 6 ? set.set_code.slice(0, 6) : set.set_code}
            </span>
            <span className="font-mono text-[10px] font-bold tabular-nums">
              {trend > 0 ? "+" : ""}
              {trend.toFixed(0)}
            </span>
          </a>
        );
      })}
    </div>
  );
}
