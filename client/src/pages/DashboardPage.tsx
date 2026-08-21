import { BarChart3, Package, Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { AddHoldingDialog } from "../components/portfolio/AddHoldingDialog";
import { HoldingsTable } from "../components/portfolio/HoldingsTable";
import { PerformanceChart } from "../components/portfolio/PerformanceChart";
import { DashboardSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toaster";
import { api } from "../lib/api";
import { formatMoney, formatMoneyCompact, formatReturn } from "../lib/money";

interface PortfolioDetail {
  id: string;
  name: string;
  base_currency: string;
  description: string | null;
  holdings: HoldingItem[];
}

interface DerivedSummary {
  total_value_cents: number;
  total_cost_basis_cents: number;
  total_pnl_cents: number;
  total_pnl_pct: number;
  total_holdings: number;
  total_cards: number;
}

function deriveSummary(holdings: HoldingItem[]): DerivedSummary {
  const total_value_cents = holdings.reduce((s, h) => s + h.mktvalue_cents, 0);
  const total_cost_basis_cents = holdings.reduce((s, h) => s + h.total_cost_basis_cents, 0);
  const total_pnl_cents = total_value_cents - total_cost_basis_cents;
  const total_pnl_pct =
    total_cost_basis_cents > 0 ? (total_pnl_cents / total_cost_basis_cents) * 100 : 0;
  return {
    total_value_cents,
    total_cost_basis_cents,
    total_pnl_cents,
    total_pnl_pct: Math.round(total_pnl_pct * 100) / 100,
    total_holdings: holdings.length,
    total_cards: new Set(holdings.map((h) => h.card?.name)).size,
  };
}

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

interface PortfolioListItem {
  id: string;
  name: string;
  base_currency: string;
}

export function DashboardPage() {
  const { toast } = useToast();
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [data, setData] = useState<PortfolioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    api
      .get<PortfolioListItem[]>("/portfolio")
      .then((res) => {
        setPortfolios(res);
        if (res.length > 0 && res[0]) {
          setActivePortfolioId(res[0].id);
        }
      })
      .catch((err) => toast.error(err.message || "Failed to load portfolios"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activePortfolioId) return;
    setLoading(true);
    api
      .get<PortfolioDetail>(`/portfolio/${activePortfolioId}`)
      .then(setData)
      .catch((err) => toast.error(err.message || "Failed to load portfolio"))
      .finally(() => setLoading(false));
  }, [activePortfolioId]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  // No portfolios yet — the full first-run welcome treatment lives on the Overview page now;
  // this is just a pointer back there, not a duplicate welcome state.
  if (portfolios.length === 0) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center text-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          You don't have a portfolio yet.
        </p>
        <a
          href="/overview"
          className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          Go to Overview to create one
        </a>
      </div>
    );
  }

  const summary = data ? deriveSummary(data.holdings ?? []) : null;
  const currency = data?.base_currency || "GBP";
  const isProfit = (summary?.total_pnl_cents ?? 0) >= 0;
  const gradedCount = data?.holdings?.filter((h) => h.is_graded).length ?? 0;

  return (
    <div className="space-y-4">
      {/* Portfolio selector + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={activePortfolioId || ""}
            onChange={(e) => setActivePortfolioId(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-sm font-medium"
          >
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={14} />
          Add Card
        </button>
      </div>

      {/* Terminal-style metrics bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 font-mono text-xs">
        <span className="text-[var(--color-muted-foreground)]">
          VALUE{" "}
          <span className="font-semibold text-[var(--color-foreground)]">
            {formatMoneyCompact(summary?.total_value_cents ?? 0)}
          </span>
        </span>
        <span className="text-[var(--color-border)]">|</span>
        <span className="text-[var(--color-muted-foreground)]">
          COST{" "}
          <span className="text-[var(--color-foreground)]">
            {formatMoneyCompact(summary?.total_cost_basis_cents ?? 0)}
          </span>
        </span>
        <span className="text-[var(--color-border)]">|</span>
        <span className="text-[var(--color-muted-foreground)]">
          P&L{" "}
          <span
            className={`font-semibold ${isProfit ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}
          >
            {formatMoney(summary?.total_pnl_cents ?? 0, currency)} (
            {formatReturn(summary?.total_pnl_pct ?? 0)})
          </span>
        </span>
        <span className="text-[var(--color-border)]">|</span>
        <span className="text-[var(--color-muted-foreground)]">
          CARDS <span className="text-[var(--color-foreground)]">{summary?.total_cards ?? 0}</span>
        </span>
        <span className="text-[var(--color-border)]">|</span>
        <span className="text-[var(--color-muted-foreground)]">
          GRADED <span className="text-[var(--color-foreground)]">{gradedCount}</span>
        </span>
        <span className="text-[var(--color-border)]">|</span>
        <span className="text-[var(--color-muted-foreground)]">
          HOLDINGS{" "}
          <span className="text-[var(--color-foreground)]">{summary?.total_holdings ?? 0}</span>
        </span>
      </div>

      {/* Overview stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total Cards"
          value={String(summary?.total_cards ?? 0)}
          icon={<Package size={14} />}
        />
        <StatCard
          label="Cost Basis"
          value={formatMoney(summary?.total_cost_basis_cents ?? 0, currency)}
          icon={<Wallet size={14} />}
        />
        <StatCard
          label="Current Value"
          value={formatMoney(summary?.total_value_cents ?? 0, currency)}
          icon={<BarChart3 size={14} />}
        />
        <StatCard
          label="Profit / Loss"
          value={formatMoney(summary?.total_pnl_cents ?? 0, currency)}
          subtitle={formatReturn(summary?.total_pnl_pct ?? 0)}
          icon={isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          variant={isProfit ? "positive" : "negative"}
        />
      </div>

      {/* Performance chart */}
      {activePortfolioId && <PerformanceChart portfolioId={activePortfolioId} />}

      {/* Top movers (if holdings exist) */}
      {data?.holdings && data.holdings.length > 0 && (
        <TopMovers holdings={data.holdings} currency={currency} />
      )}

      {/* Holdings table */}
      <HoldingsTable holdings={data?.holdings ?? []} currency={currency} />

      {/* Add holding dialog */}
      {showAddDialog && activePortfolioId && (
        <AddHoldingDialog
          portfolioId={activePortfolioId}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            if (activePortfolioId) {
              api.get<PortfolioDetail>(`/portfolio/${activePortfolioId}`).then(setData);
            }
          }}
        />
      )}
    </div>
  );
}

function TopMovers({ holdings, currency }: { holdings: HoldingItem[]; currency: string }) {
  const sorted = [...holdings].sort((a, b) => b.pnl_pct - a.pnl_pct);
  const gainers = sorted.filter((h) => h.pnl_pct > 0).slice(0, 5);
  const losers = sorted
    .filter((h) => h.pnl_pct < 0)
    .reverse()
    .slice(0, 5);

  if (gainers.length === 0 && losers.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {gainers.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-positive)]">
              Top Gainers
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {gainers.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="truncate font-medium" style={{ maxWidth: "60%" }}>
                  {h.card.name}
                </span>
                <span className="font-mono tabular-nums text-[var(--color-positive)]">
                  +{h.pnl_pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {losers.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-negative)]">
              Top Losers
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {losers.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="truncate font-medium" style={{ maxWidth: "60%" }}>
                  {h.card.name}
                </span>
                <span className="font-mono tabular-nums text-[var(--color-negative)]">
                  {h.pnl_pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  icon,
  variant,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: "positive" | "negative";
}) {
  const bgClass =
    variant === "positive"
      ? "bg-green-50 dark:bg-green-950/30"
      : variant === "negative"
        ? "bg-red-50 dark:bg-red-950/30"
        : "bg-[var(--color-card)]";

  return (
    <div className={`rounded-lg border border-[var(--color-border)] p-3 ${bgClass}`}>
      <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1.5 text-lg font-semibold tabular-nums">{value}</p>
      {subtitle && (
        <p
          className={`mt-0.5 text-xs font-medium ${
            variant === "positive"
              ? "text-[var(--color-positive)]"
              : variant === "negative"
                ? "text-[var(--color-negative)]"
                : "text-[var(--color-muted-foreground)]"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
