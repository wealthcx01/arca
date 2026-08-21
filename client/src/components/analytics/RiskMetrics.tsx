/**
 * Risk metrics panel — volatility, Sharpe, drawdown, liquidity as metric cards.
 */

interface RiskMetricsProps {
  volatility_e6?: number | null;
  sharpe_e6?: number | null;
  max_drawdown_bp?: number | null;
  liquidity_score?: number | null;
}

function MetricRow({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <span className="text-[10px] uppercase text-[var(--color-muted-foreground)]">{label}</span>
        {subtitle && (
          <span className="ml-1 text-[9px] text-[var(--color-muted-foreground)]">({subtitle})</span>
        )}
      </div>
      <span className={`font-mono text-sm font-bold tabular-nums ${color || ""}`}>{value}</span>
    </div>
  );
}

export function RiskMetrics({
  volatility_e6,
  sharpe_e6,
  max_drawdown_bp,
  liquidity_score,
}: RiskMetricsProps) {
  const vol = volatility_e6 != null ? `${((volatility_e6 / 1_000_000) * 100).toFixed(1)}%` : "—";
  const sharpe = sharpe_e6 != null ? (sharpe_e6 / 1_000_000).toFixed(2) : "—";
  const dd = max_drawdown_bp != null ? `${(max_drawdown_bp / 100).toFixed(1)}%` : "—";
  const liq = liquidity_score != null ? String(liquidity_score) : "—";

  const sharpeColor =
    sharpe_e6 != null
      ? sharpe_e6 > 1_000_000
        ? "text-[var(--color-positive)]"
        : sharpe_e6 < 0
          ? "text-[var(--color-negative)]"
          : ""
      : "";

  const ddColor =
    max_drawdown_bp != null
      ? max_drawdown_bp > 2000
        ? "text-[var(--color-negative)]"
        : max_drawdown_bp > 1000
          ? "text-[var(--color-warning)]"
          : "text-[var(--color-positive)]"
      : "";

  const liqColor =
    liquidity_score != null
      ? liquidity_score >= 70
        ? "text-[var(--color-positive)]"
        : liquidity_score >= 40
          ? "text-[var(--color-warning)]"
          : "text-[var(--color-negative)]"
      : "";

  return (
    <div className="divide-y divide-[var(--color-border)] text-sm">
      <MetricRow label="Volatility" value={vol} subtitle="annual" />
      <MetricRow label="Sharpe" value={sharpe} color={sharpeColor} />
      <MetricRow label="Max Drawdown" value={dd} color={ddColor} />
      <MetricRow label="Liquidity" value={liq} subtitle="/100" color={liqColor} />
    </div>
  );
}
