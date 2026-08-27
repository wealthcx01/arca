import { useState } from "react";
import { DataPanel } from "../components/terminal/DataPanel";
import { type Column, DataTable } from "../components/terminal/DataTable";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";

interface MoverItem {
  id: string;
  name: string;
  set_name: string;
  set_code: string;
  rarity: string | null;
  image_url: string | null;
  current_price_cents: number;
  change_cents: number;
  pct_change: number;
  currency: string;
}

interface MoversResponse {
  data: MoverItem[];
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

const rankingTabs = [
  { label: "Top Gainers", sort: "pct_change" },
  { label: "Top Losers", sort: "pct_change" },
  { label: "Most Expensive", sort: "abs_change" },
  { label: "Biggest Movers", sort: "abs_change" },
];

export function ScreenerPage() {
  const [selectedSet, setSelectedSet] = useState("");
  const [selectedRarity, setSelectedRarity] = useState("");
  const [period, setPeriod] = useState("7d");
  const [activeTab, setActiveTab] = useState(0);

  const { data: setsData } = usePolling<SetsResponse>(
    () => api.get<SetsResponse>("/cards/sets"),
    300_000,
  );

  const setFilter = selectedSet ? `&set=${selectedSet}` : "";
  const rarityFilter = selectedRarity ? `&rarity=${selectedRarity}` : "";

  const { data, loading } = usePolling<MoversResponse>(
    () =>
      api.get<MoversResponse>(
        `/market/movers?limit=50&period=${period}&sort=pct_change${setFilter}${rarityFilter}`,
      ),
    120_000,
    [period, selectedSet, selectedRarity],
  );

  let items = data?.data ?? [];

  // Filter by tab
  if (activeTab === 0) {
    // Top Gainers
    items = items.filter((m) => m.pct_change > 0).sort((a, b) => b.pct_change - a.pct_change);
  } else if (activeTab === 1) {
    // Top Losers
    items = items.filter((m) => m.pct_change < 0).sort((a, b) => a.pct_change - b.pct_change);
  } else if (activeTab === 2) {
    // Most Expensive
    items = [...items].sort((a, b) => b.current_price_cents - a.current_price_cents);
  } else {
    // Biggest Movers (abs)
    items = [...items].sort((a, b) => Math.abs(b.pct_change) - Math.abs(a.pct_change));
  }

  const columns: Column<MoverItem>[] = [
    {
      key: "name",
      label: "Card",
      sortable: true,
      sortFn: (a, b) => a.name.localeCompare(b.name),
      render: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-[9px] text-[var(--color-muted-foreground)]">{row.set_name}</div>
        </div>
      ),
    },
    {
      key: "rarity",
      label: "Rarity",
      render: (row) => (
        <span className="text-[var(--color-muted-foreground)]">{row.rarity || "—"}</span>
      ),
    },
    {
      key: "current_price_cents",
      label: "Price",
      align: "right",
      sortable: true,
      sortFn: (a, b) => a.current_price_cents - b.current_price_cents,
      render: (row) => (
        <span className="font-mono font-semibold tabular-nums">
          {formatPrice(row.current_price_cents)}
        </span>
      ),
    },
    {
      key: "change_cents",
      label: "Change",
      align: "right",
      sortable: true,
      sortFn: (a, b) => a.change_cents - b.change_cents,
      render: (row) => {
        const isUp = row.change_cents >= 0;
        const color = isUp ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]";
        const sign = isUp ? "+" : "";
        return (
          <span className={`font-mono tabular-nums ${color}`}>
            {sign}
            {formatPrice(row.change_cents)}
          </span>
        );
      },
    },
    {
      key: "pct_change",
      label: "% Change",
      align: "right",
      sortable: true,
      sortFn: (a, b) => a.pct_change - b.pct_change,
      render: (row) => {
        const isUp = row.pct_change >= 0;
        const color = isUp ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]";
        const sign = isUp ? "+" : "";
        return (
          <span className={`font-mono font-semibold tabular-nums ${color}`}>
            {sign}
            {row.pct_change.toFixed(1)}%
          </span>
        );
      },
    },
  ];

  const rarities = [
    "",
    "Common",
    "Uncommon",
    "Rare",
    "Rare Holo",
    "Rare Holo EX",
    "Rare Holo GX",
    "Rare Holo V",
    "Rare Holo VMAX",
    "Rare Ultra",
    "Rare Secret",
    "Rare Rainbow",
    "Illustration Rare",
    "Special Art Rare",
    "Hyper Rare",
    "Double Rare",
  ];

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Filters:
        </span>

        <select
          value={selectedSet}
          onChange={(e) => setSelectedSet(e.target.value)}
          className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-0.5 text-[11px]"
        >
          <option value="">All Sets</option>
          {(setsData?.data ?? []).map((s) => (
            <option key={s.set_code} value={s.set_code}>
              {s.set_name}
            </option>
          ))}
        </select>

        <select
          value={selectedRarity}
          onChange={(e) => setSelectedRarity(e.target.value)}
          className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-0.5 text-[11px]"
        >
          {rarities.map((r) => (
            <option key={r} value={r}>
              {r || "All Rarities"}
            </option>
          ))}
        </select>

        <div className="flex gap-0.5">
          {["1d", "7d", "30d", "90d"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                period === p
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Ranking tabs */}
      <div className="flex gap-0.5">
        {rankingTabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={`rounded-t px-3 py-1.5 text-[11px] font-medium ${
              activeTab === i
                ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <DataPanel title={`${rankingTabs[activeTab]!.label} (${items.length})`}>
        {loading && items.length === 0 ? (
          <div className="py-12 text-center text-[10px] text-[var(--color-muted-foreground)]">
            Loading...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={items}
            rowKey={(r) => r.id}
            onRowClick={(r) => {
              window.location.href = `/cards/${r.id}`;
            }}
            maxHeight="calc(100vh - 280px)"
            emptyMessage="No data matching filters. Try adjusting period or filters."
          />
        )}
      </DataPanel>
    </div>
  );
}
