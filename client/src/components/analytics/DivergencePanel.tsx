/**
 * Price source divergence panel — cards where providers disagree most.
 */

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/money";

interface DivergenceItem {
  id: string;
  name: string;
  set_name: string;
  rarity: string | null;
  min_price_cents: number;
  max_price_cents: number;
  spread_cents: number;
  spread_pct: number;
  source_count: number;
  sources: string;
}

export function DivergencePanel() {
  const [data, setData] = useState<DivergenceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: DivergenceItem[] }>("/analytics/divergence?limit=15")
      .then((res) => setData(res.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-[var(--color-muted-foreground)]">
        Loading divergence data...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-[var(--color-muted-foreground)]">
        No divergence data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm terminal-dense">
        <thead>
          <tr className="text-left text-[10px] font-medium uppercase text-[var(--color-muted-foreground)]">
            <th className="px-2 py-1">Card</th>
            <th className="px-2 py-1 text-right">Low</th>
            <th className="px-2 py-1 text-right">High</th>
            <th className="px-2 py-1 text-right">Spread</th>
            <th className="px-2 py-1 text-right">Sources</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const confidence =
              item.spread_pct > 30 ? "Low" : item.spread_pct > 15 ? "Medium" : "High";
            const confColor =
              confidence === "Low"
                ? "text-[var(--color-negative)]"
                : confidence === "Medium"
                  ? "text-[var(--color-warning)]"
                  : "text-[var(--color-positive)]";

            return (
              <tr key={item.id} className="border-t border-[var(--color-border)]">
                <td className="px-2 py-1">
                  <a href={`/cards/${item.id}`} className="hover:text-[var(--color-primary)]">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-[9px] text-[var(--color-muted-foreground)]">
                      {item.set_name}
                    </div>
                  </a>
                </td>
                <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                  {formatMoney(item.min_price_cents, "USD")}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                  {formatMoney(item.max_price_cents, "USD")}
                </td>
                <td
                  className={`px-2 py-1 text-right font-mono font-bold tabular-nums ${confColor}`}
                >
                  {item.spread_pct.toFixed(0)}%
                </td>
                <td className="px-2 py-1 text-right font-mono text-[10px] text-[var(--color-muted-foreground)]">
                  {item.source_count}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
