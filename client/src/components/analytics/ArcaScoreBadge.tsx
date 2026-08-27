/**
 * ARCA Score badge — color gradient (0-30 negative, 30-60 warning, 60-80 positive,
 * 80-100 gold/primary). The gold tier is deliberate: gold is reserved across the app
 * for signals ARCA has actually proven, and a Strong score is the clearest one.
 * Shows tooltip with sub-score breakdown.
 */

interface ArcaScoreBadgeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]";
  if (score >= 60) return "bg-[var(--color-positive)] text-[var(--color-positive-foreground)]";
  if (score >= 30) return "bg-[var(--color-warning)] text-[var(--color-warning-foreground)]";
  return "bg-[var(--color-negative)] text-[var(--color-negative-foreground)]";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 30) return "Fair";
  return "Weak";
}

const sizeClasses = {
  sm: "text-[10px] px-1.5 py-0.5 min-w-[28px]",
  md: "text-xs px-2 py-1 min-w-[36px]",
  lg: "text-sm px-3 py-1.5 min-w-[44px]",
};

export function ArcaScoreBadge({ score, size = "md", showLabel = false }: ArcaScoreBadgeProps) {
  if (score == null) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded font-mono font-bold tabular-nums bg-[var(--color-muted)] text-[var(--color-muted-foreground)] ${sizeClasses[size]}`}
      >
        —
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono font-bold tabular-nums ${getScoreColor(score)} ${sizeClasses[size]}`}
      title={`ARCA Score: ${score}/100 (${getScoreLabel(score)})`}
    >
      {score}
      {showLabel && (
        <span className="text-[0.75em] font-normal opacity-80">{getScoreLabel(score)}</span>
      )}
    </span>
  );
}
