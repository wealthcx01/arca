import { useCallback, useState } from "react";
import { FxRatesPanel } from "../components/terminal/FxRatesPanel";
import { GradingPremiumPanel } from "../components/terminal/GradingPremiumPanel";
import { NewsPanel } from "../components/terminal/NewsPanel";
import { PriceChartPanel } from "../components/terminal/PriceChartPanel";
import { SetPerformancePanel } from "../components/terminal/SetPerformancePanel";
import { TopMoversPanel } from "../components/terminal/TopMoversPanel";
import { DataPanel } from "../components/terminal/DataPanel";
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
  if (Math.abs(cents) >= 10_000_00) return "$" + (cents / 100_00).toFixed(1) + "K";
  return "$" + (cents / 100).toFixed(0);
}

export function OverviewPage() {
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>();
  const [selectedCardName, setSelectedCardName] = useState<string | undefined>();

  const handleCardSelect = useCallback((id: string, name: string) => {
    setSelectedCardId(id);
    setSelectedCardName(name);
  }, []);

  const { data: overview } = usePolling<OverviewData>(
    () => api.get<OverviewData>("/market/overview"),
    120_000,
  );

  const { data: portfolios } = usePolling<PortfolioSummary[]>(
    () =>
      api
        .get<PortfolioSummary[]>("/portfolio")
        .then(async (list) => {
          if (list.length === 0) return [];
          const detail = await api.get<PortfolioSummary>(`/portfolio/${list[0]!.id}`);
          return [detail];
        })
        .catch(() => []),
    120_000,
  );

  const { data: setsData } = usePolling<{ data: SetInfo[] }>(
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

  return (
    <div className="grid gap-3 lg:grid-cols-[30%_35%_35%]">
      {/* Left column */}
      <div className="flex flex-col gap-3">
        <SetPerformancePanel />

        {/* Portfolio Stats */}
        <DataPanel title="Portfolio">
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
        </DataPanel>

        <FxRatesPanel />
        <GradingPremiumPanel />
      </div>

      {/* Center column */}
      <div className="flex flex-col gap-3">
        <TopMoversPanel onCardSelect={handleCardSelect} />
        <NewsPanel onCardSelect={handleCardSelect} />

        {/* Market stats */}
        <DataPanel title="Market Stats">
          <div className="divide-y divide-[var(--color-border)]">
            <div className="flex items-center justify-between px-2 py-1.5 text-[11px]">
              <span className="text-[var(--color-muted-foreground)]">Total Cards</span>
              <span className="font-mono tabular-nums">
                {(overview?.total_cards ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 text-[11px]">
              <span className="text-[var(--color-muted-foreground)]">Priced Cards</span>
              <span className="font-mono tabular-nums">
                {(overview?.priced_cards ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 text-[11px]">
              <span className="text-[var(--color-muted-foreground)]">Coverage</span>
              <span className="font-mono tabular-nums">
                {overview && overview.total_cards > 0
                  ? ((overview.priced_cards / overview.total_cards) * 100).toFixed(0)
                  : 0}
                %
              </span>
            </div>
          </div>
        </DataPanel>
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-3">
        <PriceChartPanel cardId={selectedCardId} cardName={selectedCardName} />

        {/* Era breakdown — live data */}
        <DataPanel title="Market Intel — By Era">
          <div className="max-h-[240px] overflow-auto">
            <table className="w-full terminal-dense">
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
                    <td className="px-2 py-1 font-medium">{era.label}</td>
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
        </DataPanel>
      </div>
    </div>
  );
}

/** Categorize sets by era and compute aggregate stats. */
function categorizeByEra(sets: SetInfo[]) {
  const eraKeywords: { label: string; keywords: string[] }[] = [
    { label: "Vintage", keywords: ["base", "jungle", "fossil", "rocket", "gym", "neo", "expedition", "aquapolis", "skyridge"] },
    { label: "Ex Era", keywords: ["ex "] },
    { label: "DP / Platinum", keywords: ["diamond", "pearl", "platinum", "pop"] },
    { label: "BW / XY", keywords: ["black", "white", "xy", "flashfire", "phantom", "roaring", "primal", "ancient origins", "breakthrough", "breakpoint", "fates collide", "steam siege", "evolutions"] },
    { label: "Sun & Moon", keywords: ["sun", "moon", "ultra prism", "burning", "celestial", "cosmic", "unified", "unbroken", "hidden fates", "detective"] },
    { label: "Sword & Shield", keywords: ["sword", "shield", "vivid", "chilling", "evolving", "fusion", "brilliant", "astral", "lost origin", "silver tempest", "crown zenith", "champion"] },
    { label: "Scarlet & Violet", keywords: ["scarlet", "violet", "paldea", "obsidian", "151", "paradox", "temporal", "twilight", "shrouded", "stellar", "surging", "prismatic"] },
  ];

  const result: { label: string; setCount: number; avgPrice: number; totalValue: number }[] = [];
  const assigned = new Set<string>();

  for (const era of eraKeywords) {
    const eraSets = sets.filter(
      (s) =>
        !assigned.has(s.set_code) &&
        era.keywords.some((k) => s.set_name.toLowerCase().includes(k)),
    );
    for (const s of eraSets) assigned.add(s.set_code);

    if (eraSets.length > 0) {
      const totalValue = eraSets.reduce((sum, s) => sum + s.total_value_cents, 0);
      const avgPrice =
        eraSets.reduce((sum, s) => sum + s.avg_price_cents, 0) / eraSets.length;
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
