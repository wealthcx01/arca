import { useState } from "react";
import { DataPanel } from "../components/terminal/DataPanel";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";

interface SetInfo {
  set_code: string;
  set_name: string;
  card_count: number;
}

interface SetsResponse {
  data: SetInfo[];
}

interface SetDetail {
  set: { set_code: string; set_name: string; card_count: number };
  cards: {
    id: string;
    name: string;
    card_number: string;
    rarity: string | null;
    image_url: string | null;
    market_price_cents: number;
    currency: string | null;
  }[];
}

const eras = [
  { label: "All Sets", filter: "" },
  {
    label: "Vintage (1999-2003)",
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
  { label: "Ex Era (2003-2007)", keywords: ["ex "] },
  { label: "Diamond & Pearl", keywords: ["diamond", "pearl", "platinum"] },
  { label: "BW / XY", keywords: ["black", "white", "xy", "flashfire", "phantom", "roaring"] },
  {
    label: "Sun & Moon",
    keywords: ["sun", "moon", "ultra prism", "burning", "celestial", "cosmic", "unified"],
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

function formatPrice(cents: number): string {
  if (!cents) return "—";
  return "$" + (cents / 100).toFixed(2);
}

export function SetsErasPage() {
  const [selectedEra, setSelectedEra] = useState(0);
  const [selectedSet, setSelectedSet] = useState<string | null>(null);

  const { data: setsData, loading: setsLoading } = usePolling<SetsResponse>(
    () => api.get<SetsResponse>("/cards/sets"),
    300_000,
  );

  const { data: setDetail, loading: detailLoading } = usePolling<SetDetail>(
    () =>
      selectedSet
        ? api.get<SetDetail>(`/market/sets/${selectedSet}`)
        : Promise.resolve({ set: { set_code: "", set_name: "", card_count: 0 }, cards: [] }),
    120_000,
    [selectedSet],
  );

  // Also check URL param
  const urlSet = new URLSearchParams(window.location.search).get("set");
  if (urlSet && !selectedSet) {
    setSelectedSet(urlSet);
  }

  const allSets = setsData?.data ?? [];
  const era = eras[selectedEra]!;

  const filteredSets =
    selectedEra === 0
      ? allSets
      : allSets.filter((s) => era.keywords?.some((k) => s.set_name.toLowerCase().includes(k)));

  return (
    <div className="grid gap-3 lg:grid-cols-[220px_1fr_1fr]">
      {/* Left: Era list */}
      <DataPanel title="Eras">
        <div className="divide-y divide-[var(--color-border)]">
          {eras.map((e, i) => (
            <button
              key={e.label}
              onClick={() => {
                setSelectedEra(i);
                setSelectedSet(null);
              }}
              className={`w-full px-2 py-1.5 text-left text-[11px] transition-colors ${
                selectedEra === i
                  ? "bg-[var(--color-highlight)] font-semibold text-[var(--color-primary)]"
                  : "text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </DataPanel>

      {/* Center: Sets in selected era */}
      <DataPanel title={`Sets — ${era.label}`}>
        <div className="max-h-[calc(100vh-180px)] overflow-auto">
          <table className="w-full terminal-dense">
            <thead className="sticky top-0 bg-[var(--color-muted)]">
              <tr>
                <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Set Name
                </th>
                <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Cards
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {setsLoading && filteredSets.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="py-6 text-center text-[10px] text-[var(--color-muted-foreground)]"
                  >
                    Loading sets...
                  </td>
                </tr>
              ) : filteredSets.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="py-6 text-center text-[10px] text-[var(--color-muted-foreground)]"
                  >
                    No sets found
                  </td>
                </tr>
              ) : (
                filteredSets.map((s) => (
                  <tr
                    key={s.set_code}
                    className={`cursor-pointer transition-colors ${
                      selectedSet === s.set_code
                        ? "bg-[var(--color-highlight)]"
                        : "hover:bg-[var(--color-muted)]"
                    }`}
                    onClick={() => setSelectedSet(s.set_code)}
                  >
                    <td className="px-2 py-1 font-medium">{s.set_name}</td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                      {s.card_count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataPanel>

      {/* Right: Set detail / cards */}
      <DataPanel
        title={
          setDetail?.set?.set_name
            ? `${setDetail.set.set_name} (${setDetail.set.card_count} cards)`
            : "Select a set"
        }
      >
        <div className="max-h-[calc(100vh-180px)] overflow-auto">
          {!selectedSet ? (
            <div className="py-12 text-center text-[10px] text-[var(--color-muted-foreground)]">
              Select a set to view cards
            </div>
          ) : detailLoading ? (
            <div className="py-12 text-center text-[10px] text-[var(--color-muted-foreground)]">
              Loading...
            </div>
          ) : (
            <table className="w-full terminal-dense">
              <thead className="sticky top-0 bg-[var(--color-muted)]">
                <tr>
                  <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    #
                  </th>
                  <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Name
                  </th>
                  <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Rarity
                  </th>
                  <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {(setDetail?.cards ?? []).map((card) => (
                  <tr
                    key={card.id}
                    className="cursor-pointer hover:bg-[var(--color-muted)]"
                    onClick={() => (window.location.href = `/cards/${card.id}`)}
                  >
                    <td className="px-2 py-1 font-mono text-[var(--color-muted-foreground)]">
                      {card.card_number}
                    </td>
                    <td className="max-w-[160px] truncate px-2 py-1 font-medium">{card.name}</td>
                    <td className="px-2 py-1 text-[var(--color-muted-foreground)]">
                      {card.rarity || "—"}
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums">
                      {formatPrice(card.market_price_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DataPanel>
    </div>
  );
}
