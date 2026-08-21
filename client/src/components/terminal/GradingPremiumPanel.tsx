import { Award } from "lucide-react";
import { usePolling } from "../../hooks/usePolling";
import { api } from "../../lib/api";
import { DataPanel } from "./DataPanel";
import { PanelEmptyState, PanelErrorState } from "./PanelEmptyState";

interface GradedItem {
  id: string;
  name: string;
  set_name: string;
  raw_price_cents: number;
  grading_company: string;
  grade: string;
  graded_price_cents: number;
  premium_pct: number;
}

interface GradedResponse {
  data: GradedItem[];
}

function formatPrice(cents: number): string {
  if (!cents) return "—";
  return "$" + (cents / 100).toFixed(2);
}

export function GradingPremiumPanel() {
  const { data, loading, error } = usePolling<GradedResponse>(
    () => api.get<GradedResponse>("/market/graded?limit=10"),
    120_000,
  );

  const items = data?.data ?? [];

  if (!loading && error) {
    return (
      <DataPanel title="Grading Premiums">
        <PanelErrorState message={error} />
      </DataPanel>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <DataPanel title="Grading Premiums">
        <PanelEmptyState
          icon={Award}
          message="Grading premiums compare raw vs. graded card prices. They'll appear here once graded price data is available."
          ctaLabel="Browse graded market"
          ctaHref="/graded"
        />
      </DataPanel>
    );
  }

  return (
    <DataPanel title="Grading Premiums">
      <div className="max-h-[240px] overflow-auto">
        <table className="w-full terminal-dense">
          <thead className="sticky top-0 bg-[var(--color-muted)]">
            <tr>
              <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Card
              </th>
              <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Raw
              </th>
              <th className="px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Grade
              </th>
              <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Graded
              </th>
              <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Prem%
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading && items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-4 text-center text-[10px] text-[var(--color-muted-foreground)]"
                >
                  Loading...
                </td>
              </tr>
            ) : (
              items.map((item, i) => (
                <tr key={`${item.id}-${item.grade}-${i}`} className="hover:bg-[var(--color-muted)]">
                  <td className="max-w-[100px] truncate px-2 py-1 font-medium">{item.name}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                    {formatPrice(item.raw_price_cents)}
                  </td>
                  <td className="px-2 py-1 text-center text-[9px] font-semibold">
                    {item.grading_company} {item.grade}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">
                    {formatPrice(item.graded_price_cents)}
                  </td>
                  <td
                    className={`px-2 py-1 text-right font-mono tabular-nums ${
                      item.premium_pct > 0
                        ? "text-[var(--color-positive)]"
                        : "text-[var(--color-negative)]"
                    }`}
                  >
                    {item.premium_pct > 0 ? "+" : ""}
                    {item.premium_pct.toFixed(0)}%
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
