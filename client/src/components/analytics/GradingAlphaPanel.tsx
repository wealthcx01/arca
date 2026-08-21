/**
 * Grading Alpha panel — ROI table with color-coded alpha per company/grade.
 */

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/money";

interface GradingAlphaResult {
  grading_company: string;
  grade: string;
  raw_price_cents: number;
  graded_price_cents: number;
  grading_cost_cents: number;
  alpha_bp: number;
}

interface GradingAlphaPanelProps {
  cardId: string;
}

export function GradingAlphaPanel({ cardId }: GradingAlphaPanelProps) {
  const [data, setData] = useState<GradingAlphaResult[]>([]);

  useEffect(() => {
    api
      .get<{ data: GradingAlphaResult[] }>(`/analytics/${cardId}/grading-alpha`)
      .then((res) => setData(res.data))
      .catch(() => setData([]));
  }, [cardId]);

  if (data.length === 0) return null;

  // Sort: PSA before CGC before BGS, then by grade descending
  const sorted = [...data].sort((a, b) => {
    const companyOrder: Record<string, number> = { PSA: 0, CGC: 1, BGS: 2 };
    const ca = companyOrder[a.grading_company] ?? 3;
    const cb = companyOrder[b.grading_company] ?? 3;
    if (ca !== cb) return ca - cb;
    return Number(b.grade) - Number(a.grade);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm terminal-dense">
        <thead>
          <tr className="text-left text-[10px] font-medium uppercase text-[var(--color-muted-foreground)]">
            <th className="px-2 py-1">Company</th>
            <th className="px-2 py-1">Grade</th>
            <th className="px-2 py-1 text-right">Raw</th>
            <th className="px-2 py-1 text-right">Graded</th>
            <th className="px-2 py-1 text-right">Cost</th>
            <th className="px-2 py-1 text-right">Alpha</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => {
            const alphaPct = (item.alpha_bp / 100).toFixed(1);
            const alphaColor =
              item.alpha_bp > 0
                ? "text-[var(--color-positive)]"
                : item.alpha_bp < -1000
                  ? "text-[var(--color-negative)]"
                  : "text-[var(--color-muted-foreground)]";

            return (
              <tr
                key={`${item.grading_company}-${item.grade}`}
                className="border-t border-[var(--color-border)]"
              >
                <td className="px-2 py-1 font-medium">{item.grading_company}</td>
                <td className="px-2 py-1 font-mono">{item.grade}</td>
                <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                  {formatMoney(item.raw_price_cents, "USD")}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular-nums">
                  {formatMoney(item.graded_price_cents, "USD")}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                  {formatMoney(item.grading_cost_cents, "USD")}
                </td>
                <td
                  className={`px-2 py-1 text-right font-mono font-bold tabular-nums ${alphaColor}`}
                >
                  {item.alpha_bp > 0 ? "+" : ""}
                  {alphaPct}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
