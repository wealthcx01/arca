import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../components/ui/Toaster";
import { api } from "../lib/api";
import { formatMoney } from "../lib/money";

interface Transaction {
  id: string;
  card: { name: string; set_name: string; image_url: string | null };
  type: "BUY" | "SELL";
  quantity: number;
  price_cents: number;
  currency: string;
  trade_date: string;
  shipping_cents: number;
  fees_cents: number;
  taxes_cents: number;
  condition: string | null;
  is_graded: boolean;
  grade: string | null;
  grading_company: string | null;
  source: string;
}

interface PortfolioListItem {
  id: string;
  name: string;
  base_currency: string;
}

type SortField = "date" | "name" | "type" | "qty" | "price" | "total";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 25;

export function TransactionsPage() {
  const { toast } = useToast();
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api
      .get<PortfolioListItem[]>("/portfolio")
      .then((res) => {
        setPortfolios(res);
        if (res.length > 0 && res[0]) setActiveId(res[0].id);
      })
      .catch((err) => toast.error(err.message || "Failed to load portfolios"))
      .finally(() => setLoading(false));
  }, [toast]);

  const loadTransactions = useCallback(() => {
    if (!activeId) return;
    const params = typeFilter !== "ALL" ? `?type=${typeFilter}` : "";
    api
      .get<Transaction[]>(`/portfolio/${activeId}/transactions${params}`)
      .then((data) => {
        setTransactions(data);
        setPage(1);
      })
      .catch((err) => toast.error(err.message || "Failed to load transactions"));
  }, [activeId, typeFilter, toast]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleDelete = async (txId: string) => {
    if (!confirm("Delete this transaction? Holdings will be recalculated.")) return;
    try {
      await api.delete(`/portfolio/${activeId}/transactions/${txId}`);
      loadTransactions();
    } catch {
      toast.error("Failed to delete transaction");
    }
  };

  const handleExport = () => {
    const headers = [
      "Date",
      "Card",
      "Set",
      "Type",
      "Qty",
      "Price",
      "Currency",
      "Fees",
      "Condition",
      "Source",
    ];
    const rows = transactions.map((t) => [
      new Date(t.trade_date).toISOString().split("T")[0],
      t.card.name,
      t.card.set_name,
      t.type,
      t.quantity,
      (t.price_cents / 100).toFixed(2),
      t.currency,
      ((t.fees_cents + t.shipping_cents + t.taxes_cents) / 100).toFixed(2),
      t.condition || "",
      t.source,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arca-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    const arr = [...transactions];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortField) {
        case "date":
          return dir * (new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
        case "name":
          return dir * a.card.name.localeCompare(b.card.name);
        case "type":
          return dir * a.type.localeCompare(b.type);
        case "qty":
          return dir * (a.quantity - b.quantity);
        case "price":
          return dir * (a.price_cents - b.price_cents);
        case "total": {
          const aTotal =
            a.price_cents * a.quantity + a.shipping_cents + a.fees_cents + a.taxes_cents;
          const bTotal =
            b.price_cents * b.quantity + b.shipping_cents + b.fees_cents + b.taxes_cents;
          return dir * (aTotal - bTotal);
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [transactions, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ArrowUp size={10} className="inline ml-0.5" />
    ) : (
      <ArrowDown size={10} className="inline ml-0.5" />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Transaction History</h1>
        <div className="flex items-center gap-2">
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-sm"
          >
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-muted)]"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Filters + count */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["ALL", "BUY", "SELL"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded px-3 py-1 text-xs font-medium ${
                typeFilter === t
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {sorted.length} transaction{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-muted-foreground)]">
          No transactions yet
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    <th
                      className="cursor-pointer select-none px-4 py-2 hover:text-[var(--color-foreground)]"
                      onClick={() => handleSort("date")}
                    >
                      Date <SortIcon field="date" />
                    </th>
                    <th
                      className="cursor-pointer select-none px-3 py-2 hover:text-[var(--color-foreground)]"
                      onClick={() => handleSort("name")}
                    >
                      Card <SortIcon field="name" />
                    </th>
                    <th
                      className="cursor-pointer select-none px-3 py-2 hover:text-[var(--color-foreground)]"
                      onClick={() => handleSort("type")}
                    >
                      Type <SortIcon field="type" />
                    </th>
                    <th
                      className="cursor-pointer select-none px-3 py-2 hover:text-[var(--color-foreground)]"
                      onClick={() => handleSort("qty")}
                    >
                      Qty <SortIcon field="qty" />
                    </th>
                    <th
                      className="cursor-pointer select-none px-3 py-2 hover:text-[var(--color-foreground)]"
                      onClick={() => handleSort("price")}
                    >
                      Price <SortIcon field="price" />
                    </th>
                    <th
                      className="cursor-pointer select-none px-3 py-2 hover:text-[var(--color-foreground)]"
                      onClick={() => handleSort("total")}
                    >
                      Total <SortIcon field="total" />
                    </th>
                    <th className="px-3 py-2">Fees</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((t, idx) => {
                    const totalCents =
                      t.price_cents * t.quantity + t.shipping_cents + t.fees_cents + t.taxes_cents;
                    return (
                      <tr
                        key={t.id}
                        className={`border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-muted)] ${
                          idx % 2 === 1
                            ? "bg-[color-mix(in_srgb,var(--color-muted)_30%,transparent)]"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-2 tabular-nums text-[var(--color-muted-foreground)]">
                          {new Date(t.trade_date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {t.card.image_url && (
                              <img
                                src={t.card.image_url}
                                alt=""
                                className="h-8 w-6 rounded object-cover"
                                loading="lazy"
                              />
                            )}
                            <div>
                              <p className="font-medium">{t.card.name}</p>
                              <p className="text-xs text-[var(--color-muted-foreground)]">
                                {t.card.set_name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                              t.type === "BUY"
                                ? "bg-[color-mix(in_srgb,var(--color-positive)_15%,transparent)] text-[var(--color-positive)]"
                                : "bg-[color-mix(in_srgb,var(--color-negative)_15%,transparent)] text-[var(--color-negative)]"
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums">{t.quantity}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatMoney(t.price_cents, t.currency)}
                        </td>
                        <td className="px-3 py-2 tabular-nums font-medium">
                          {formatMoney(totalCents, t.currency)}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-[var(--color-muted-foreground)]">
                          {t.fees_cents + t.shipping_cents + t.taxes_cents > 0
                            ? formatMoney(
                                t.fees_cents + t.shipping_cents + t.taxes_cents,
                                t.currency,
                              )
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                          {t.source}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="rounded p-1 text-[var(--color-muted-foreground)] hover:bg-[color-mix(in_srgb,var(--color-negative)_10%,transparent)] hover:text-[var(--color-negative)]"
                            title="Delete transaction"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of{" "}
                {sorted.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded p-1 hover:bg-[var(--color-muted)] disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1">…</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`rounded px-2 py-0.5 ${
                          p === page
                            ? "bg-[var(--color-primary)] text-white"
                            : "hover:bg-[var(--color-muted)]"
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded p-1 hover:bg-[var(--color-muted)] disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
