import { ArrowUpDown, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { formatMoney, formatReturn } from "../../lib/money";

interface HoldingItem {
  id: string;
  card: { name: string; set_name: string; image_url: string | null };
  quantity: number;
  condition: string | null;
  is_graded: boolean;
  grade: string | null;
  grading_company: string | null;
  avg_cost_cents: number;
  total_cost_basis_cents: number;
  mktvalue_cents: number;
  currency: string;
  pnl_cents: number;
  pnl_pct: number;
}

type SortKey = "name" | "quantity" | "cost" | "value" | "pnl" | "pnl_pct";

export function HoldingsTable({
  holdings,
  currency,
}: {
  holdings: HoldingItem[];
  currency: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterGraded, setFilterGraded] = useState<"all" | "graded" | "raw">("all");

  const filtered = useMemo(() => {
    let result = holdings;
    if (filterGraded === "graded") result = result.filter((h) => h.is_graded);
    if (filterGraded === "raw") result = result.filter((h) => !h.is_graded);
    return result;
  }, [holdings, filterGraded]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.card.name.localeCompare(b.card.name);
          break;
        case "quantity":
          cmp = a.quantity - b.quantity;
          break;
        case "cost":
          cmp = a.total_cost_basis_cents - b.total_cost_basis_cents;
          break;
        case "value":
          cmp = a.mktvalue_cents - b.mktvalue_cents;
          break;
        case "pnl":
          cmp = a.pnl_cents - b.pnl_cents;
          break;
        case "pnl_pct":
          cmp = a.pnl_pct - b.pnl_pct;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  if (holdings.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No holdings yet. Add cards to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="text-sm font-semibold">Holdings ({sorted.length})</h3>
        <div className="flex items-center gap-2">
          <select
            value={filterGraded}
            onChange={(e) => setFilterGraded(e.target.value as "all" | "graded" | "raw")}
            className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs"
          >
            <option value="all">All</option>
            <option value="graded">Graded</option>
            <option value="raw">Raw</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              <th className="sticky left-0 bg-[var(--color-card)] px-4 py-2">Card</th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort("quantity")}>
                <span className="flex items-center gap-1">
                  Qty <ArrowUpDown size={10} />
                </span>
              </th>
              <th className="px-3 py-2">Condition</th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort("cost")}>
                <span className="flex items-center gap-1">
                  Cost Basis <ArrowUpDown size={10} />
                </span>
              </th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort("value")}>
                <span className="flex items-center gap-1">
                  Value <ArrowUpDown size={10} />
                </span>
              </th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort("pnl")}>
                <span className="flex items-center gap-1">
                  P&L <ArrowUpDown size={10} />
                </span>
              </th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort("pnl_pct")}>
                <span className="flex items-center gap-1">
                  P&L % <ArrowUpDown size={10} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => (
              <tr
                key={h.id}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-muted)]"
              >
                <td className="sticky left-0 bg-[var(--color-card)] px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    {h.card.image_url && (
                      <img
                        src={h.card.image_url}
                        alt={h.card.name}
                        className="h-10 w-7 rounded object-cover"
                        loading="lazy"
                      />
                    )}
                    <div>
                      <p className="font-medium">{h.card.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {h.card.set_name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 tabular-nums">{h.quantity}</td>
                <td className="px-3 py-2.5">
                  <span className="text-xs">
                    {h.is_graded ? (
                      <span className="rounded bg-[var(--color-highlight)] px-1.5 py-0.5 font-mono text-[var(--color-primary)]">
                        {h.grading_company} {h.grade}
                      </span>
                    ) : (
                      h.condition || "NM"
                    )}
                  </span>
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {formatMoney(h.total_cost_basis_cents, currency)}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {formatMoney(h.mktvalue_cents, currency)}
                </td>
                <td
                  className={`px-3 py-2.5 tabular-nums font-medium ${h.pnl_cents >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}
                >
                  {formatMoney(h.pnl_cents, currency)}
                </td>
                <td
                  className={`px-3 py-2.5 tabular-nums font-medium ${h.pnl_pct >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}
                >
                  {formatReturn(h.pnl_pct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
