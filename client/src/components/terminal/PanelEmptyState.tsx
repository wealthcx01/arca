import type { LucideIcon } from "lucide-react";

interface PanelEmptyStateProps {
  icon: LucideIcon;
  message: string;
  ctaLabel: string;
  /** Navigate to another page. Provide exactly one of ctaHref / onCtaClick. */
  ctaHref?: string;
  /** Perform an in-page action (e.g. open a form already on this page) instead of navigating. */
  onCtaClick?: () => void;
}

/** Genuine "no data yet" state for a terminal panel: what it's for + one next action. */
export function PanelEmptyState({
  icon: Icon,
  message,
  ctaLabel,
  ctaHref,
  onCtaClick,
}: PanelEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <Icon size={18} className="text-[var(--color-muted-foreground)]" />
      <p className="max-w-[240px] text-[11px] leading-snug text-[var(--color-muted-foreground)]">
        {message}
      </p>
      {onCtaClick ? (
        <button
          type="button"
          onClick={onCtaClick}
          className="text-[11px] font-medium text-[var(--color-primary)] hover:underline"
        >
          {ctaLabel}
        </button>
      ) : (
        <a
          href={ctaHref}
          className="text-[11px] font-medium text-[var(--color-primary)] hover:underline"
        >
          {ctaLabel}
        </a>
      )}
    </div>
  );
}

/** Distinct from PanelEmptyState on purpose: an API failure is not a first-run absence of data. */
export function PanelErrorState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
      <p className="text-[11px] font-medium text-[var(--color-negative)]">Failed to load</p>
      {message && (
        <p className="max-w-[220px] text-[10px] text-[var(--color-muted-foreground)]">{message}</p>
      )}
    </div>
  );
}
