import { ChangeDisplay, PriceCell } from "./PriceCell";

interface QuoteBoxProps {
  name: string;
  subtitle?: string;
  priceCents: number;
  prevPriceCents?: number;
  changeCents: number;
  changePct: number;
  currency?: string;
  onClick?: () => void;
}

export function QuoteBox({
  name,
  subtitle,
  priceCents,
  prevPriceCents,
  changeCents,
  changePct,
  onClick,
}: QuoteBoxProps) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 ${
        onClick ? "cursor-pointer hover:bg-[var(--color-muted)]" : ""
      }`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {name}
      </div>
      {subtitle && (
        <div className="mb-1 truncate text-[9px] text-[var(--color-muted-foreground)]">
          {subtitle}
        </div>
      )}
      <div className="text-sm font-semibold">
        <PriceCell value={priceCents} prevValue={prevPriceCents} />
      </div>
      <div className="mt-0.5 text-[10px]">
        <ChangeDisplay change={changeCents} changePct={changePct} />
      </div>
    </div>
  );
}
