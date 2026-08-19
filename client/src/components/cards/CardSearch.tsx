import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";

interface CardResult {
  id: string;
  name: string;
  set_name: string;
  set_code: string;
  rarity: string | null;
  image_url: string | null;
  supertype: string;
}

interface CardSearchProps {
  onSelect: (card: CardResult) => void;
  placeholder?: string;
}

export function CardSearch({ onSelect, placeholder = "Search cards..." }: CardSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<{ data: CardResult[]; pagination: { total: number } }>(
        `/cards?q=${encodeURIComponent(q)}&limit=10`,
      );
      setResults(res.data);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(timerRef.current);
  }, [query, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const card = results[selectedIndex];
      if (card) {
        onSelect(card);
        setQuery("");
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] py-1.5 pl-8 pr-3 text-sm outline-none focus:border-[var(--color-ring)] focus:ring-1 focus:ring-[var(--color-ring)]"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted-foreground)]">
            ...
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
          {results.map((card, i) => (
            <button
              key={card.id}
              type="button"
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)] ${
                i === selectedIndex ? "bg-[var(--color-muted)]" : ""
              }`}
              onMouseDown={() => {
                onSelect(card);
                setQuery("");
                setOpen(false);
              }}
            >
              {card.image_url && (
                <img
                  src={card.image_url}
                  alt=""
                  className="h-8 w-6 rounded object-cover"
                  loading="lazy"
                />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{card.name}</p>
                <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                  {card.set_name} {card.rarity ? `· ${card.rarity}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-center text-sm text-[var(--color-muted-foreground)] shadow-lg">
          No cards found for "{query}"
        </div>
      )}
    </div>
  );
}
