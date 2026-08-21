const SOURCE_COLORS: Record<string, string> = {
  tcgplayer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cardmarket: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  tcgdex: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  tcgcsv: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "pokemon-tcg": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "pokemon-price-tracker": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  poketrace: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  pricecharting: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

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
  // Get color from base source (strip sub-source like ":ebay")
  const baseSource = source.split(":")[0] ?? source;
  const colorClass =
    SOURCE_COLORS[baseSource] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400";
  const label = SOURCE_LABELS[source] ?? source;

  const sizeClass = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs";

  return (
    <span className={`inline-block rounded font-medium ${colorClass} ${sizeClass}`}>{label}</span>
  );
}
