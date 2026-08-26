import { cn } from "../../lib/utils";

/**
 * ARCA brand mark: a graded-slab frame around an ascending bar read, crossed by a
 * single trendline that dips then breaks upward — the "alpha" signal ARCA's data
 * pipeline is built to find. Gold-on-ground so it reads as earned, not decorative;
 * see docs/brand/design-rationale.md for the full rationale.
 */
export function ArcaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="ARCA"
    >
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="7"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <rect x="8" y="18" width="3.4" height="7" rx="0.6" fill="currentColor" />
      <rect x="14.3" y="13.5" width="3.4" height="11.5" rx="0.6" fill="currentColor" />
      <rect x="20.6" y="9" width="3.4" height="16" rx="0.6" fill="currentColor" />
      <path
        d="M7 16.5 L14 20 L22.3 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle cx="22.3" cy="7.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function ArcaLogo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <ArcaMark className={cn("h-5 w-5 text-[var(--color-primary)]", markClassName)} />
      {showWordmark && (
        <span className="font-display text-base font-semibold tracking-tight text-[var(--color-foreground)]">
          ARCA
        </span>
      )}
    </span>
  );
}
