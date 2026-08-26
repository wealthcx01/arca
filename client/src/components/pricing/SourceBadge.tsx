// Source identity is carried by the label text, not a rainbow of hues — a single
// restrained neutral tag reads as "terminal data feed," not a decorative legend.
const SOURCE_BADGE_CLASS =
  "border border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]";

const SOURCE_LABELS: Record<string, string> = {
  tcgplayer: "TCGPlayer",
  cardmarket: "CardMarket",
  tcgdex: "TCGdex",
  tcgcsv: "TCGCSV",
  "pokemon-tcg": "Pokemon TCG API",
  "pokemon-price-tracker": "Price Tracker",
  "pokemon-price-tracker:ebay": "eBay (PPT)",
  poketrace: "PokeTrace",
  "poketrace:tcgplayer": "TCGPlayer (PT)",
  "poketrace:ebay": "eBay (PT)",
  "poketrace:cardmarket": "CardMarket (PT)",
  pricecharting: "PriceCharting",
};

interface SourceBadgeProps {
  source: string;
  size?: "sm" | "md";
}

export function SourceBadge({ source, size = "sm" }: SourceBadgeProps) {
  const label = SOURCE_LABELS[source] ?? source;
  const sizeClass = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs";

  return (
    <span
      className={`inline-block rounded font-mono font-medium ${SOURCE_BADGE_CLASS} ${sizeClass}`}
    >
      {label}
    </span>
  );
}
