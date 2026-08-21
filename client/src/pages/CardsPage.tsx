import { ChevronLeft, ChevronRight, Grid3X3, ImageOff, List, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { CardsGridSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toaster";
import { api } from "../lib/api";

interface Card {
  id: string;
  name: string;
  set_name: string;
  set_code: string;
  card_number: string;
  rarity: string | null;
  image_url: string | null;
  image_url_hires: string | null;
  supertype: string;
  types: string | null;
  hp: number | null;
  artist: string | null;
}

interface SetInfo {
  set_code: string;
  set_name: string;
  card_count: number;
}

export function CardsPage() {
  const { toast } = useToast();
  const [cards, setCards] = useState<Card[]>([]);
  const [sets, setSets] = useState<SetInfo[]>([]);
  const [query, setQuery] = useState("");
  const [setFilter, setSetFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [supertypeFilter, setSupertypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const limit = 20;

  // Load sets
  useEffect(() => {
    api
      .get<{ data: SetInfo[] }>("/cards/sets")
      .then((res) => setSets(res.data))
      .catch((err) => toast.error(err.message || "Failed to load sets"));
  }, [toast]);

  // Load cards
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (setFilter) params.set("set", setFilter);
    if (rarityFilter) params.set("rarity", rarityFilter);
    if (supertypeFilter) params.set("supertype", supertypeFilter);
    params.set("page", String(page));
    params.set("limit", String(limit));

    api
      .get<{ data: Card[]; pagination: { total: number } }>(`/cards?${params}`)
      .then((res) => {
        setCards(res.data);
        setTotal(res.pagination.total);
      })
      .catch((err) => toast.error(err.message || "Failed to load cards"))
      .finally(() => setLoading(false));
  }, [query, setFilter, rarityFilter, supertypeFilter, page, toast]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Card Database</h1>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded p-1.5 ${viewMode === "grid" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"}`}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded p-1.5 ${viewMode === "list" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search cards..."
            className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] py-1.5 pl-8 pr-3 text-sm outline-none focus:border-[var(--color-ring)]"
          />
        </div>
        <select
          value={setFilter}
          onChange={(e) => {
            setSetFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
        >
          <option value="">All Sets</option>
          {sets.map((s) => (
            <option key={s.set_code} value={s.set_code}>
              {s.set_name} ({s.card_count})
            </option>
          ))}
        </select>
        <select
          value={supertypeFilter}
          onChange={(e) => {
            setSupertypeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
        >
          <option value="">All Types</option>
          <option value="Pokémon">Pokemon</option>
          <option value="Trainer">Trainer</option>
          <option value="Energy">Energy</option>
        </select>
        <select
          value={rarityFilter}
          onChange={(e) => {
            setRarityFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
        >
          <option value="">All Rarities</option>
          <option value="Common">Common</option>
          <option value="Uncommon">Uncommon</option>
          <option value="Rare">Rare</option>
          <option value="Rare Holo">Rare Holo</option>
          <option value="Rare Holo EX">Rare Holo EX</option>
          <option value="Rare Holo V">Rare Holo V</option>
          <option value="Rare Ultra">Rare Ultra</option>
          <option value="Rare Secret">Rare Secret</option>
          <option value="Illustration Rare">Illustration Rare</option>
          <option value="Special Art Rare">Special Art Rare</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-xs text-[var(--color-muted-foreground)]">
        {total.toLocaleString()} cards found
      </p>

      {loading ? (
        <CardsGridSkeleton />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {cards.map((card) => (
            <a
              key={card.id}
              href={`/cards/${card.id}`}
              className="group overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] transition-shadow hover:shadow-md"
            >
              {card.image_url ? (
                <img
                  src={card.image_url}
                  alt={card.name}
                  className="aspect-[2.5/3.5] w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-[2.5/3.5] items-center justify-center bg-[var(--color-muted)] text-xs text-[var(--color-muted-foreground)]">
                  No Image
                </div>
              )}
              <div className="p-2">
                <p className="truncate text-xs font-medium" title={card.name}>
                  {card.name}
                </p>
                <p
                  className="truncate text-[10px] text-[var(--color-muted-foreground)]"
                  title={card.set_name}
                >
                  {card.set_name}
                </p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                <th className="px-4 py-2">Card</th>
                <th className="px-3 py-2">Set</th>
                <th className="px-3 py-2">Rarity</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">HP</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr
                  key={card.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-muted)]"
                >
                  <td className="px-4 py-2">
                    <a href={`/cards/${card.id}`} className="flex items-center gap-2">
                      {card.image_url && (
                        <img
                          src={card.image_url}
                          alt=""
                          className="h-8 w-6 rounded object-cover"
                          loading="lazy"
                        />
                      )}
                      <span className="font-medium">{card.name}</span>
                    </a>
                  </td>
                  <td className="px-3 py-2 text-[var(--color-muted-foreground)]">
                    {card.set_name}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-muted-foreground)]">
                    {card.rarity || "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-muted-foreground)]">
                    {card.supertype}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--color-muted-foreground)]">
                    {card.hp || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded p-1.5 hover:bg-[var(--color-muted)] disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-[var(--color-muted-foreground)]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded p-1.5 hover:bg-[var(--color-muted)] disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
