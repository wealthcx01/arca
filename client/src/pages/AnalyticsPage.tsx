import { AreaSeries, type IChartApi, type Time } from "lightweight-charts";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArcaScoreBadge } from "../components/analytics/ArcaScoreBadge";
import { DivergencePanel } from "../components/analytics/DivergencePanel";
import { SetMomentumHeatmap } from "../components/analytics/SetMomentumHeatmap";
import { LightweightChart } from "../components/charts/LightweightChart";
import { getChartTheme } from "../components/charts/types";
import { DataPanel } from "../components/terminal/DataPanel";
import { AnalyticsSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toaster";
import { api } from "../lib/api";
import { formatMoney } from "../lib/money";

interface ScreenerCard {
  id: string;
  name: string;
  set_name: string;
  set_code: string;
  rarity: string | null;
  market_price_cents: number | null;
  currency: string;
  arca_score: number | null;
  volatility_e6: number | null;
  sharpe_e6: number | null;
  max_drawdown_bp: number | null;
  liquidity_score: number | null;
  trend_score: number | null;
}

interface MarketIndexPoint {
  date: string;
  index_value_e6: number;
  total_market_cap_cents: number;
  card_count: number;
}

interface PortfolioListItem {
  id: string;
  name: string;
  base_currency: string;
}

interface PortfolioRisk {
  total_value_cents: number;
  weighted_volatility_e6: number;
  weighted_sharpe_e6: number;
  max_drawdown_bp: number;
  diversification_ratio: number;
  concentration_hhi_bp: number;
  top5_concentration_bp: number;
  currency_exposure: Record<string, number>;
  card_count: number;
  avg_arca_score: number;
}

const COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#4f46e5",
  "#c026d3",
];

export function AnalyticsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"market" | "screener" | "portfolio">("market");
  const [marketIndex, setMarketIndex] = useState<MarketIndexPoint[]>([]);
  const [screenerData, setScreenerData] = useState<ScreenerCard[]>([]);
  const [screenerSort, setScreenerSort] = useState("arca_score");
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const [activePortfolio, setActivePortfolio] = useState("");
  const [portfolioRisk, setPortfolioRisk] = useState<PortfolioRisk | null>(null);
  const [loading, setLoading] = useState(true);

  const isDark = document.documentElement.classList.contains("dark");

  // Load market index
  useEffect(() => {
    api
      .get<{ data: MarketIndexPoint[] }>("/analytics/market-index?days=90")
      .then((res) => setMarketIndex(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load screener data
  useEffect(() => {
    if (tab !== "screener") return;
    setScreenerLoading(true);
    api
      .get<{ data: ScreenerCard[] }>(`/analytics/screener?sort=${screenerSort}&limit=50`)
      .then((res) => setScreenerData(res.data))
      .catch(() => toast.error("Failed to load screener"))
      .finally(() => setScreenerLoading(false));
  }, [tab, screenerSort, toast]);

  // Load portfolios for portfolio tab
  useEffect(() => {
    if (tab !== "portfolio") return;
    api
      .get<PortfolioListItem[]>("/portfolio")
      .then((res) => {
        setPortfolios(res);
        if (res.length > 0 && res[0]) setActivePortfolio(res[0].id);
      })
      .catch(() => {});
  }, [tab]);

  // Load portfolio risk
  useEffect(() => {
    if (!activePortfolio) return;
    api
      .get<{ data: PortfolioRisk }>(`/analytics/portfolio/${activePortfolio}/risk`)
      .then((res) => setPortfolioRisk(res.data))
      .catch(() => setPortfolioRisk(null));
  }, [activePortfolio]);

  if (loading) return <AnalyticsSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Analytics</h1>
        <div className="flex rounded border border-[var(--color-border)] font-mono text-[10px]">
          {(["market", "screener", "portfolio"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                tab === t
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "market" && <MarketTab marketIndex={marketIndex} isDark={isDark} />}
      {tab === "screener" && (
        <ScreenerTab
          data={screenerData}
          loading={screenerLoading}
          sort={screenerSort}
          onSortChange={setScreenerSort}
        />
      )}
      {tab === "portfolio" && (
        <PortfolioTab
          portfolios={portfolios}
          activeId={activePortfolio}
          onActiveChange={setActivePortfolio}
          risk={portfolioRisk}
        />
      )}
    </div>
  );
}

function MarketTab({ marketIndex, isDark }: { marketIndex: MarketIndexPoint[]; isDark: boolean }) {
  const theme = getChartTheme(isDark);

  return (
    <div className="space-y-4">
      {/* Market Index Chart */}
      <DataPanel title="ARCA Market Index" headerColor="primary">
        <div className="p-3">
          {marketIndex.length > 0 ? (
            <LightweightChart
              height={250}
              theme={theme}
              onChart={(chart) => {
                const series = chart.addSeries(AreaSeries, {
                  topColor: `${theme.primaryColor}30`,
                  bottomColor: `${theme.primaryColor}05`,
                  lineColor: theme.primaryColor,
                  lineWidth: 2,
                });
                series.setData(
                  marketIndex.map((d) => ({
                    time: d.date as Time,
                    value: d.index_value_e6 / 1_000_000,
                  })),
                );
                chart.timeScale().fitContent();
              }}
            />
          ) : (
            <div className="flex h-32 items-center justify-center text-xs text-[var(--color-muted-foreground)]">
              No market index data. Run analytics pipeline to generate.
            </div>
          )}
        </div>
      </DataPanel>

      {/* Market stats */}
      {marketIndex.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(() => {
            const latest = marketIndex[marketIndex.length - 1]!;
            return (
              <>
                <StatCard
                  label="Index Value"
                  value={(latest.index_value_e6 / 1_000_000).toFixed(2)}
                />
                <StatCard
                  label="Market Cap"
                  value={formatMoney(latest.total_market_cap_cents, "USD")}
                />
                <StatCard label="Cards Tracked" value={String(latest.card_count)} />
                <StatCard label="Data Points" value={String(marketIndex.length)} subtitle="days" />
              </>
            );
          })()}
        </div>
      )}

      {/* Set Momentum Heatmap */}
      <DataPanel title="Set Momentum Heatmap">
        <div className="p-3">
          <SetMomentumHeatmap />
        </div>
      </DataPanel>

      {/* Price Divergence */}
      <DataPanel title="Price Source Divergence" headerColor="warning">
        <DivergencePanel />
      </DataPanel>
    </div>
  );
}

function ScreenerTab({
  data,
  loading,
  sort,
  onSortChange,
}: {
  data: ScreenerCard[];
  loading: boolean;
  sort: string;
  onSortChange: (s: string) => void;
}) {
  const sortOptions = [
    { value: "arca_score", label: "ARCA Score" },
    { value: "sharpe", label: "Sharpe" },
    { value: "liquidity", label: "Liquidity" },
    { value: "volatility", label: "Volatility" },
    { value: "trend", label: "Trend" },
    { value: "price", label: "Price" },
  ];

  return (
    <DataPanel
      title="Card Screener"
      headerColor="primary"
      toolbar={
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="rounded bg-transparent px-1 py-0.5 text-[10px] text-white"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </select>
      }
    >
      {loading ? (
        <div className="flex h-32 items-center justify-center text-xs text-[var(--color-muted-foreground)]">
          Loading screener...
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-xs text-[var(--color-muted-foreground)]">
          No analytics data. Run the analytics pipeline first.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm terminal-dense">
            <thead>
              <tr className="text-left text-[10px] font-medium uppercase text-[var(--color-muted-foreground)]">
                <th className="px-2 py-1">Card</th>
                <th className="px-2 py-1">Set</th>
                <th className="px-2 py-1 text-right">Price</th>
                <th className="px-2 py-1 text-center">ARCA</th>
                <th className="px-2 py-1 text-right">Sharpe</th>
                <th className="px-2 py-1 text-right">Vol</th>
                <th className="px-2 py-1 text-right">Liq</th>
                <th className="px-2 py-1 text-right">Trend</th>
              </tr>
            </thead>
            <tbody>
              {data.map((card) => (
                <tr
                  key={card.id}
                  className="border-t border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                >
                  <td className="px-2 py-1">
                    <a
                      href={`/cards/${card.id}`}
                      className="font-medium hover:text-[var(--color-primary)]"
                    >
                      {card.name}
                    </a>
                  </td>
                  <td className="px-2 py-1 text-[var(--color-muted-foreground)]">
                    {card.set_name?.length > 15
                      ? `${card.set_name.slice(0, 15)}...`
                      : card.set_name}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">
                    {card.market_price_cents
                      ? formatMoney(card.market_price_cents, card.currency || "USD")
                      : "—"}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <ArcaScoreBadge score={card.arca_score} size="sm" />
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">
                    {card.sharpe_e6 != null ? (card.sharpe_e6 / 1_000_000).toFixed(2) : "—"}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">
                    {card.volatility_e6 != null
                      ? `${((card.volatility_e6 / 1_000_000) * 100).toFixed(0)}%`
                      : "—"}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">
                    {card.liquidity_score ?? "—"}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">
                    {card.trend_score != null ? (
                      <span
                        className={
                          card.trend_score > 0
                            ? "text-[var(--color-positive)]"
                            : card.trend_score < 0
                              ? "text-[var(--color-negative)]"
                              : ""
                        }
                      >
                        {card.trend_score > 0 ? "+" : ""}
                        {card.trend_score}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DataPanel>
  );
}

function PortfolioTab({
  portfolios,
  activeId,
  onActiveChange,
  risk,
}: {
  portfolios: PortfolioListItem[];
  activeId: string;
  onActiveChange: (id: string) => void;
  risk: PortfolioRisk | null;
}) {
  if (portfolios.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--color-muted-foreground)]">
        No portfolios found. Create a portfolio first.
      </div>
    );
  }

  const currency = portfolios.find((p) => p.id === activeId)?.base_currency || "GBP";

  return (
    <div className="space-y-4">
      <select
        value={activeId}
        onChange={(e) => onActiveChange(e.target.value)}
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-sm"
      >
        {portfolios.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {risk && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Total Value" value={formatMoney(risk.total_value_cents, currency)} />
            <StatCard label="Avg ARCA Score" value={String(risk.avg_arca_score)} />
            <StatCard
              label="Portfolio Vol"
              value={`${((risk.weighted_volatility_e6 / 1_000_000) * 100).toFixed(1)}%`}
              subtitle="annual"
            />
            <StatCard label="Wtd Sharpe" value={(risk.weighted_sharpe_e6 / 1_000_000).toFixed(2)} />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Max Drawdown"
              value={`${(risk.max_drawdown_bp / 100).toFixed(1)}%`}
              color={risk.max_drawdown_bp > 2000 ? "text-[var(--color-negative)]" : ""}
            />
            <StatCard
              label="Top 5 Concentration"
              value={`${(risk.top5_concentration_bp / 100).toFixed(1)}%`}
              color={risk.top5_concentration_bp > 6000 ? "text-[var(--color-negative)]" : ""}
            />
            <StatCard label="Diversification" value={`${risk.diversification_ratio}%`} />
            <StatCard label="Unique Cards" value={String(risk.card_count)} />
          </div>

          {/* Currency exposure */}
          {Object.keys(risk.currency_exposure).length > 0 && (
            <DataPanel title="Currency Exposure">
              <div className="p-3">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={Object.entries(risk.currency_exposure).map(([name, value]) => ({
                        name,
                        value: value / 100,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={(e) => e.name}
                    >
                      {Object.keys(risk.currency_exposure).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: unknown) => formatMoney(Math.round(Number(v) * 100), currency)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </DataPanel>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${color || ""}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-[var(--color-muted-foreground)]">{subtitle}</p>}
    </div>
  );
}
