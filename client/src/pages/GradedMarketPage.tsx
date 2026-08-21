import { useState } from "react";
import { DataPanel } from "../components/terminal/DataPanel";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";

interface GradedItem {
  id: string;
  name: string;
  set_name: string;
  set_code: string;
  rarity: string | null;
  raw_price_cents: number;
  currency: string;
  grading_company: string;
  grade: string;
  graded_price_cents: number;
  premium_pct: number;
}

interface GradedResponse {
  data: GradedItem[];
}

interface SetInfo {
  set_code: string;
  set_name: string;
  card_count: number;
}

interface SetsResponse {
  data: SetInfo[];
}

function formatPrice(cents: number): string {
  if (!cents) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

// Group graded data by card_id to create a row per card with grade columns
interface CardGradeRow {
  id: string;
  name: string;
  set_name: string;
  rarity: string | null;
  raw_price_cents: number;
  grades: Record<string, { price_cents: number; premium_pct: number }>;
}

const gradeColumns = ["PSA 10", "PSA 9", "CGC 10", "CGC 9.5", "BGS 10"];

export function GradedMarketPage() {
  const [selectedSet, setSelectedSet] = useState("");

  const { data: setsData } = usePolling<SetsResponse>(
    () => api.get<SetsResponse>("/cards/sets"),
    300_000,
  );

  const setFilter = selectedSet ? `&set=${selectedSet}` : "";
  const { data, loading } = usePolling<GradedResponse>(
    () => api.get<GradedResponse>(`/market/graded?limit=50${setFilter}`),
    120_000,
    [selectedSet],
  );

  const items = data?.data ?? [];

  // Group by card id
  const cardMap = new Map<string, CardGradeRow>();
  for (const item of items) {
    let row = cardMap.get(item.id);
    if (!row) {
      row = {
        id: item.id,
        name: item.name,
        set_name: item.set_name,
        rarity: item.rarity,
        raw_price_cents: item.raw_price_cents,
        grades: {},
      };
      cardMap.set(item.id, row);
    }
    const key = `${item.grading_company} ${item.grade}`;
    row.grades[key] = {
      price_cents: item.graded_price_cents,
      premium_pct: item.premium_pct,
    };
  }

  const rows = Array.from(cardMap.values());

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold">Graded Market</h1>
        <select
          value={selectedSet}
          onChange={(e) => setSelectedSet(e.target.value)}
          className="rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-[11px]"
        >
          <option value="">All Sets</option>
          {(setsData?.data ?? []).map((s) => (
            <option key={s.set_code} value={s.set_code}>
              {s.set_name}
            </option>
          ))}
        </select>
      </div>

      <DataPanel title="Graded Price Comparison">
        <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
          <table className="w-full terminal-dense">
            <thead className="sticky top-0 bg-[var(--color-muted)]">
              <tr>
                <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Card
                </th>
                <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Set
                </th>
                <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Raw
                </th>
                {gradeColumns.map((g) => (
                  <th
                    key={g}
                    className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]"
                  >
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={3 + gradeColumns.length}
                    className="py-8 text-center text-[10px] text-[var(--color-muted-foreground)]"
                  >
                    Loading graded prices...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={3 + gradeColumns.length}
                    className="py-8 text-center text-[10px] text-[var(--color-muted-foreground)]"
                  >
                    No graded price data available. Add BYOK keys for pricing providers that support
                    graded data.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer hover:bg-[var(--color-muted)]"
                    onClick={() => (window.location.href = `/cards/${row.id}`)}
                  >
                    <td className="max-w-[160px] truncate px-2 py-1 font-medium">{row.name}</td>
                    <td className="max-w-[120px] truncate px-2 py-1 text-[var(--color-muted-foreground)]">
                      {row.set_name}
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums">
                      {formatPrice(row.raw_price_cents)}
                    </td>
                    {gradeColumns.map((g) => {
                      const cell = row.grades[g];
                      if (!cell) {
                        return (
                          <td
                            key={g}
                            className="px-2 py-1 text-right text-[var(--color-muted-foreground)]"
                          >
                            —
                          </td>
                        );
                      }
                      return (
                        <td key={g} className="px-2 py-1 text-right">
                          <div className="font-mono tabular-nums">
                            {formatPrice(cell.price_cents)}
                          </div>
                          <div
                            className={`text-[9px] font-mono tabular-nums ${
                              cell.premium_pct > 0
                                ? "text-[var(--color-positive)]"
                                : "text-[var(--color-negative)]"
                            }`}
                          >
                            {cell.premium_pct > 0 ? "+" : ""}
                            {cell.premium_pct.toFixed(0)}%
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataPanel>
    </div>
  );
}
