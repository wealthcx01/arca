import { BarChart3, Layers, Package, Plus, Wallet } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { DataPanel } from "../components/terminal/DataPanel";
import { FxRatesPanel } from "../components/terminal/FxRatesPanel";
import { GradingPremiumPanel } from "../components/terminal/GradingPremiumPanel";
import { NewsPanel } from "../components/terminal/NewsPanel";
import { PanelEmptyState, PanelErrorState } from "../components/terminal/PanelEmptyState";
import { PriceChartPanel } from "../components/terminal/PriceChartPanel";
import { SetPerformancePanel } from "../components/terminal/SetPerformancePanel";
import { TopMoversPanel } from "../components/terminal/TopMoversPanel";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";

interface OverviewData {
  total_cards: number;
  priced_cards: number;
  fx_rates: { rate: number; base: string; quote: string }[];
}

interface PortfolioSummary {
  id: string;
  name: string;
  base_currency: string;
  holdings: {
    mktvalue_cents: number;
    total_cost_basis_cents: number;
    pnl_cents: number;
  }[];
}

interface SetInfo {
  set_code: string;
  set_name: string;
  card_count: number;
  avg_price_cents: number;
  total_value_cents: number;
}

function formatCompact(cents: number): string {
  if (Math.abs(cents) >= 10_000_00) return `$${(cents / 100_00).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(0)}`;
}

/** The first thing a brand-new user (no portfolio yet) sees — relocated from the Portfolio page. */
function WelcomeBanner({
  showCreate,
  onShowCreate,
}: {
  showCreate: boolean;
  onShowCreate: () => void;
}) {
  const [name, setName] = useState("My Collection");
  const [currency, setCurrency] = useState("GBP");

  const handleCreate = async () => {
    await api.post("/portfolio", { name, base_currency: currency });
    window.location.reload();
  };

  return (
    <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6">
      {showCreate ? (
        <div className="mx-auto max-w-sm">
          <h2 className="mb-4 text-lg font-semibold">Create Your Portfolio</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Portfolio Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Base Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm"
              >
                <option value="GBP">GBP (British Pound)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="SGD">SGD (Singapore Dollar)</option>
                <option value="HKD">HKD (Hong Kong Dollar)</option>
                <option value="JPY">JPY (Japanese Yen)</option>
              </select>
            </div>
            <button
              onClick={handleCreate}
              className="w-full rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
            >
              Create Portfolio
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <Package size={40} className="mb-3 text-[var(--color-muted-foreground)]" />
          <h2 className="text-xl font-semibold">Welcome to ARCA</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--color-muted-foreground)]">
            Track your Pokemon card collection like a pro. Create your first portfolio to get
            started — the panels below will fill in with real data as it becomes available.
          </p>
          <button
            onClick={onShowCreate}
            className="mt-4 flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
          >
            <Plus size={14} />
            Create Portfolio
          </button>
        </div>
      )}
    </div>
  );
}

export function OverviewPage() {
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>();
  const [selectedCardName, setSelectedCardName] = useState<string | undefined>();
  const [showCreatePortfolio, setShowCreatePortfolio] = useState(false);
  const welcomeBannerRef = useRef<HTMLDivElement>(null);

  // Shared by every empty-panel CTA that needs "create a portfolio" rather than a page navigation —
  // keeps first-run users on this page instead of bouncing them to the Portfolio page dead end.
  const openCreatePortfolio = useCallback(() => {
    setShowCreatePortfolio(true);
    welcomeBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleCardSelect = useCallback((id: string, name: string) => {
    setSelectedCardId(id);
    setSelectedCardName(name);
  }, []);

  const {
    data: overview,
    loading: overviewLoading,
    error: overviewError,
  } = usePolling<OverviewData>(() => api.get<OverviewData>("/market/overview"), 120_000);

  const {
    data: portfolios,
    loading: portfoliosLoading,
    error: portfoliosError,
  } = usePolling<PortfolioSummary[]>(
    () =>
      api.get<PortfolioSummary[]>("/portfolio").then(async (list) => {
        if (list.length === 0) return [];
        const detail = await api.get<PortfolioSummary>(`/portfolio/${list[0]!.id}`);
        return [detail];
      }),
    120_000,
  );

  const {
    data: setsData,
    loading: setsLoading,
    error: setsError,
  } = usePolling<{ data: SetInfo[] }>(
    () => api.get<{ data: SetInfo[] }>("/market/sets?limit=50"),
    300_000,
  );

  const portfolio = portfolios?.[0];
  const holdings = portfolio?.holdings ?? [];
  const totalValue = holdings.reduce((s, h) => s + h.mktvalue_cents, 0);
  const totalCost = holdings.reduce((s, h) => s + h.total_cost_basis_cents, 0);
  const totalPnl = totalValue - totalCost;

  // Aggregate set data by era
  const allSets = setsData?.data ?? [];
  const eraStats = categorizeByEra(allSets);

  // True first-run: the user has no portfolio at all yet (not just zero holdings on an existing one).
  const isFirstRun = portfolios !== null && portfolios.length === 0;

  return (
    <div>
      {isFirstRun && (
        <div ref={welcomeBannerRef}>
          <WelcomeBanner
            showCreate={showCreatePortfolio}
            onShowCreate={() => setShowCreatePortfolio(true)}
          />
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[30%_35%_35%]">
        {/* Left column */}
        <div className="flex flex-col gap-3">
          <SetPerformancePanel />

          {/* Portfolio Stats */}
          <DataPanel title="Portfolio">
            {portfoliosLoading && !portfolio ? (
              <div className="px-2 py-4 text-center text-[10px] text-[var(--color-muted-foreground)]">
                Loading...
              </div>
            ) : portfoliosError ? (
              <PanelErrorState message={portfoliosError} />
            ) : holdings.length === 0 ? (
              <PanelEmptyState
                icon={Wallet}
                message="Your portfolio value, cost basis, and P&L will appear here once you add your first card."
                ctaLabel={isFirstRun ? "Create a portfolio" : "Add your first card"}
                {...(isFirstRun ? { onCtaClick: openCreatePortfolio } : { ctaHref: "/portfolio" })}
              />
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                <div className="flex items-center justify-between px-2 py-1.5 text-[11px]">
                  <span className="text-[var(--color-muted-foreground)]">Value</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {formatCompact(totalValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 text-[11px]">
                  <span className="text-[var(--color-muted-foreground)]">Cost</span>
                  <span className="font-mono tabular-nums">{formatCompact(totalCost)}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 text-[11px]">
                  <span className="text-[var(--color-muted-foreground)]">P&L</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      totalPnl >= 0
                        ? "text-[var(--color-positive)]"
                        : "text-[var(--color-negative)]"
                    }`}
                  >
                    {totalPnl >= 0 ? "+" : ""}
                    {formatCompact(totalPnl)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 text-[11px]">
                  <span className="text-[var(--color-muted-foreground)]">Cards</span>
                  <span className="font-mono tabular-nums">{holdings.length}</span>
                </div>
              </div>
            )}
          </DataPanel>

          <FxRatesPanel hasPortfolio={!isFirstRun} onCreatePortfolio={openCreatePortfolio} />
          <GradingPremiumPanel />
        </div>

        {/* Center column */}
        <div className="flex flex-col gap-3">
          <TopMoversPanel onCardSelect={handleCardSelect} />
          <NewsPanel onCardSelect={handleCardSelect} />

          {/* Market stats */}
          <DataPanel title="Market Stats">
            {overviewLoading && !overview ? (
              <div className="px-2 py-4 text-center text-[10px] text-[var(--color-muted-foreground)]">
                Loading...
              </div>
            ) : overviewError ? (
              <PanelErrorState message={overviewError} />
            ) : !overview || overview.total_cards === 0 ? (
              <PanelEmptyState
                icon={BarChart3}
                message="Market-wide card counts and pricing coverage will appear here once catalog data has synced."
                ctaLabel="Browse the catalog"
                ctaHref="/cards"
              />
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                <div className="flex items-center justify-between px-2 py-1.5 text-[11px]">
                  <span className="text-[var(--color-muted-foreground)]">Total Cards</span>
                  <span className="font-mono tabular-nums">
                    {overview.total_cards.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 text-[11px]">
                  <span className="text-[var(--color-muted-foreground)]">Priced Cards</span>
                  <span className="font-mono tabular-nums">
                    {overview.priced_cards.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 text-[11px]">
                  <span className="text-[var(--color-muted-foreground)]">Coverage</span>
                  <span className="font-mono tabular-nums">
                    {((overview.priced_cards / overview.total_cards) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </DataPanel>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3">
          <PriceChartPanel cardId={selectedCardId} cardName={selectedCardName} />

          {/* Era breakdown — live data */}
          <DataPanel title="Market Intel — By Era">
            {setsLoading && eraStats.length === 0 ? (
              <div className="px-2 py-4 text-center text-[10px] text-[var(--color-muted-foreground)]">
                Loading...
              </div>
            ) : setsError ? (
              <PanelErrorState message={setsError} />
            ) : eraStats.length === 0 ? (
              <PanelEmptyState
                icon={Layers}
                message="Set data broken down by era will appear here once set information has synced."
                ctaLabel="Browse sets"
                ctaHref="/sets"
              />
            ) : (
              <div className="max-h-[240px] overflow-auto">
                <table className="w-full table-fixed terminal-dense">
                  <colgroup>
                    <col />
                    <col className="w-10" />
                    <col className="w-14" />
                    <col className="w-20" />
                  </colgroup>
                  <thead className="sticky top-0 bg-[var(--color-muted)]">
                    <tr>
                      <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                        Era
                      </th>
                      <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                        Sets
                      </th>
                      <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                        Avg
                      </th>
                      <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {eraStats.map((era) => (
                      <tr key={era.label} className="hover:bg-[var(--color-muted)]">
                        <td className="truncate px-2 py-1 font-medium" title={era.label}>
                          {era.label}
                        </td>
                        <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                          {era.setCount}
                        </td>
                        <td className="px-2 py-1 text-right font-mono tabular-nums">
                          ${(era.avgPrice / 100).toFixed(0)}
                        </td>
                        <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                          {formatCompact(era.totalValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataPanel>
        </div>
      </div>
    </div>
  );
}

/** Categorize sets by era and compute aggregate stats. */
function categorizeByEra(sets: SetInfo[]) {
  const eraKeywords: { label: string; keywords: string[] }[] = [
    {
      label: "Vintage",
      keywords: [
        "base",
        "jungle",
        "fossil",
        "rocket",
        "gym",
        "neo",
        "expedition",
        "aquapolis",
        "skyridge",
      ],
    },
    { label: "Ex Era", keywords: ["ex "] },
    { label: "DP / Platinum", keywords: ["diamond", "pearl", "platinum", "pop"] },
    {
      label: "BW / XY",
      keywords: [
        "black",
        "white",
        "xy",
        "flashfire",
        "phantom",
        "roaring",
        "primal",
        "ancient origins",
        "breakthrough",
        "breakpoint",
        "fates collide",
        "steam siege",
        "evolutions",
      ],
    },
    {
      label: "Sun & Moon",
      keywords: [
        "sun",
        "moon",
        "ultra prism",
        "burning",
        "celestial",
        "cosmic",
        "unified",
        "unbroken",
        "hidden fates",
        "detective",
      ],
    },
    {
      label: "Sword & Shield",
      keywords: [
        "sword",
        "shield",
        "vivid",
        "chilling",
        "evolving",
        "fusion",
        "brilliant",
        "astral",
        "lost origin",
        "silver tempest",
        "crown zenith",
        "champion",
      ],
    },
    {
      label: "Scarlet & Violet",
      keywords: [
        "scarlet",
        "violet",
        "paldea",
        "obsidian",
        "151",
        "paradox",
        "temporal",
        "twilight",
        "shrouded",
        "stellar",
        "surging",
        "prismatic",
      ],
    },
  ];

  const result: { label: string; setCount: number; avgPrice: number; totalValue: number }[] = [];
  const assigned = new Set<string>();

  for (const era of eraKeywords) {
    const eraSets = sets.filter(
      (s) =>
        !assigned.has(s.set_code) && era.keywords.some((k) => s.set_name.toLowerCase().includes(k)),
    );
    for (const s of eraSets) assigned.add(s.set_code);

    if (eraSets.length > 0) {
      const totalValue = eraSets.reduce((sum, s) => sum + s.total_value_cents, 0);
      const avgPrice = eraSets.reduce((sum, s) => sum + s.avg_price_cents, 0) / eraSets.length;
      result.push({ label: era.label, setCount: eraSets.length, avgPrice, totalValue });
    }
  }

  // "Other" for unmatched
  const other = sets.filter((s) => !assigned.has(s.set_code));
  if (other.length > 0) {
    const totalValue = other.reduce((sum, s) => sum + s.total_value_cents, 0);
    const avgPrice = other.reduce((sum, s) => sum + s.avg_price_cents, 0) / other.length;
    result.push({ label: "Other", setCount: other.length, avgPrice, totalValue });
  }

  return result;
}
