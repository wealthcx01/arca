import { Edit3, Plus, Star, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DataPanel } from "../components/terminal/DataPanel";
import { type Column, DataTable } from "../components/terminal/DataTable";
import { PriceChartPanel } from "../components/terminal/PriceChartPanel";
import { useToast } from "../components/ui/Toaster";
import { api } from "../lib/api";

interface WatchlistSummary {
  id: string;
  name: string;
  item_count: number;
}

interface WatchlistItem {
  id: string;
  card_id: string;
  card_name: string;
  set_name: string;
  set_code: string;
  rarity: string | null;
  image_url: string | null;
  market_price_cents: number;
  low_price_cents: number;
  mid_price_cents: number;
  high_price_cents: number;
  currency: string | null;
}

interface WatchlistDetail {
  watchlist: { id: string; name: string };
  items: WatchlistItem[];
}

interface WatchlistsResponse {
  data: WatchlistSummary[];
}

function formatPrice(cents: number): string {
  if (!cents) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export function WatchlistPage() {
  const { toast } = useToast();
  const [watchlists, setWatchlists] = useState<WatchlistSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WatchlistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>();
  const [selectedCardName, setSelectedCardName] = useState<string | undefined>();
  const [showAddCard, setShowAddCard] = useState(false);
  const [addCardQuery, setAddCardQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; set_name: string }[]
  >([]);

  // Load watchlists
  useEffect(() => {
    api
      .get<WatchlistsResponse>("/watchlist")
      .then((res) => {
        setWatchlists(res.data);
        // ARCA-65: decide against CURRENT state rather than the closure's copy.
        //
        // This read `activeId` from the closure, so the rule wanted it as a dependency — and adding
        // it would have refetched the whole watchlist list every time the user selected a different
        // watchlist. The functional form asks React for the current value instead: no dependency,
        // same behaviour, and no stale-closure risk either.
        setActiveId((current) => current || res.data[0]?.id || null);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  // Load active watchlist detail
  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }
    api
      .get<WatchlistDetail>(`/watchlist/${activeId}`)
      .then(setDetail)
      .catch((e) => toast.error(e.message));
  }, [activeId, toast]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await api.post<{ data: WatchlistSummary }>("/watchlist", {
        name: newName.trim(),
      });
      setWatchlists((prev) => [...prev, { ...res.data, item_count: 0 }]);
      setActiveId(res.data.id);
      setShowCreate(false);
      setNewName("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/watchlist/${id}`);
      setWatchlists((prev) => prev.filter((w) => w.id !== id));
      if (activeId === id) {
        setActiveId(watchlists.find((w) => w.id !== id)?.id ?? null);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!activeId) return;
    try {
      await api.delete(`/watchlist/${activeId}/items/${itemId}`);
      setDetail((prev) =>
        prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : null,
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  const handleSearchCards = async (q: string) => {
    setAddCardQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get<{ data: { id: string; name: string; set_name: string }[] }>(
        `/cards?q=${encodeURIComponent(q)}&limit=10`,
      );
      setSearchResults(res.data);
    } catch {
      setSearchResults([]);
    }
  };

  const handleAddCard = async (cardId: string) => {
    if (!activeId) return;
    try {
      await api.post(`/watchlist/${activeId}/items`, { card_id: cardId });
      // Refresh
      const updated = await api.get<WatchlistDetail>(`/watchlist/${activeId}`);
      setDetail(updated);
      setShowAddCard(false);
      setAddCardQuery("");
      setSearchResults([]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    }
  };

  const columns: Column<WatchlistItem>[] = [
    {
      key: "card_name",
      label: "Card",
      sortable: true,
      sortFn: (a, b) => a.card_name.localeCompare(b.card_name),
      render: (row) => <span className="font-medium">{row.card_name}</span>,
    },
    {
      key: "set_name",
      label: "Set",
      render: (row) => <span className="text-[var(--color-muted-foreground)]">{row.set_name}</span>,
    },
    {
      key: "rarity",
      label: "Rarity",
      render: (row) => (
        <span className="text-[var(--color-muted-foreground)]">{row.rarity || "—"}</span>
      ),
    },
    {
      key: "market_price_cents",
      label: "Market",
      align: "right",
      sortable: true,
      sortFn: (a, b) => a.market_price_cents - b.market_price_cents,
      render: (row) => (
        <span className="font-mono font-semibold tabular-nums">
          {formatPrice(row.market_price_cents)}
        </span>
      ),
    },
    {
      key: "low_price_cents",
      label: "Low",
      align: "right",
      render: (row) => (
        <span className="font-mono tabular-nums text-[var(--color-muted-foreground)]">
          {formatPrice(row.low_price_cents)}
        </span>
      ),
    },
    {
      key: "high_price_cents",
      label: "High",
      align: "right",
      render: (row) => (
        <span className="font-mono tabular-nums text-[var(--color-muted-foreground)]">
          {formatPrice(row.high_price_cents)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "32px",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveItem(row.id);
          }}
          className="rounded p-0.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
        >
          <X size={12} />
        </button>
      ),
    },
  ];

  const items = detail?.items ?? [];

  return (
    <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
      {/* Left: Watchlist selector */}
      <div className="flex flex-col gap-3">
        <DataPanel
          title="Watchlists"
          toolbar={
            <button
              onClick={() => setShowCreate(true)}
              className="rounded p-0.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              <Plus size={12} />
            </button>
          }
        >
          <div className="divide-y divide-[var(--color-border)]">
            {loading ? (
              <div className="px-2 py-4 text-center text-[10px] text-[var(--color-muted-foreground)]">
                Loading...
              </div>
            ) : watchlists.length === 0 ? (
              <div className="px-2 py-4 text-center text-[10px] text-[var(--color-muted-foreground)]">
                No watchlists yet
              </div>
            ) : (
              watchlists.map((wl) => (
                // ARCA-65. This row was a div wearing role="button" + tabIndex + a hand-rolled
                // Enter handler. It could not simply become a <button>, because it contains the
                // delete button and nesting buttons is invalid HTML — which is probably why it was
                // written this way in the first place.
                //
                // So the row is a plain container and the SELECTABLE part is its own button. Real
                // buttons get Space as well as Enter, the focus ring, and the right semantics for
                // free, and the delete button is now a sibling rather than an illegal child.
                <div
                  key={wl.id}
                  className={`flex items-center justify-between transition-colors ${
                    activeId === wl.id
                      ? "bg-[var(--color-highlight)]"
                      : "hover:bg-[var(--color-muted)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveId(wl.id)}
                    className="flex flex-1 cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left"
                  >
                    <Star size={11} className="text-[var(--color-primary)]" />
                    <span className="text-[11px] font-medium">{wl.name}</span>
                  </button>
                  <div className="flex items-center gap-1 pr-2">
                    <span className="text-[9px] text-[var(--color-muted-foreground)]">
                      {wl.item_count}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(wl.id)}
                      className="rounded p-0.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Create form */}
          {showCreate && (
            <div className="border-t border-[var(--color-border)] p-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Watchlist name..."
                className="w-full rounded border border-[var(--color-input)] bg-[var(--color-background)] px-2 py-1 text-[11px]"
              />
              <div className="mt-1 flex gap-1">
                <button
                  onClick={handleCreate}
                  className="flex-1 rounded bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary-foreground)]"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </DataPanel>

        {/* Price chart for selected card */}
        {selectedCardId && <PriceChartPanel cardId={selectedCardId} cardName={selectedCardName} />}
      </div>

      {/* Right: Watchlist items */}
      <div className="flex flex-col gap-3">
        {activeId && (
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{detail?.watchlist?.name ?? "Watchlist"}</h2>
            <button
              onClick={() => setShowAddCard(true)}
              className="flex items-center gap-1 rounded bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary-foreground)]"
            >
              <Plus size={10} />
              Add Card
            </button>
          </div>
        )}

        {/* Add card search overlay */}
        {showAddCard && (
          <DataPanel title="Search Cards to Add">
            <div className="p-2">
              <input
                value={addCardQuery}
                onChange={(e) => handleSearchCards(e.target.value)}
                placeholder="Search by card name..."
                className="w-full rounded border border-[var(--color-input)] bg-[var(--color-background)] px-2 py-1 text-[11px]"
              />
              {searchResults.length > 0 && (
                <div className="mt-1 max-h-[200px] divide-y divide-[var(--color-border)] overflow-auto rounded border border-[var(--color-border)]">
                  {searchResults.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => handleAddCard(card.id)}
                      className="w-full px-2 py-1.5 text-left text-[11px] hover:bg-[var(--color-muted)]"
                    >
                      <span className="font-medium">{card.name}</span>
                      <span className="ml-2 text-[var(--color-muted-foreground)]">
                        {card.set_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  setShowAddCard(false);
                  setAddCardQuery("");
                  setSearchResults([]);
                }}
                className="mt-1 text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              >
                Cancel
              </button>
            </div>
          </DataPanel>
        )}

        <DataPanel title={`Cards (${items.length})`}>
          <DataTable
            columns={columns}
            data={items}
            rowKey={(r) => r.id}
            onRowClick={(r) => {
              setSelectedCardId(r.card_id);
              setSelectedCardName(r.card_name);
            }}
            maxHeight="calc(100vh - 240px)"
            emptyMessage={activeId ? "No cards in this watchlist" : "Select a watchlist"}
          />
        </DataPanel>
      </div>
    </div>
  );
}
