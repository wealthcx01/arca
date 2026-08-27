/**
 * Chart toolbar — period selector, chart type toggle, indicator toggles.
 */

import type { ChartPeriod, ChartType, IndicatorType } from "./types";

interface ChartControlsProps {
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  activeIndicators: IndicatorType[];
  onToggleIndicator: (indicator: IndicatorType) => void;
}

const PERIODS: ChartPeriod[] = ["1W", "1M", "3M", "6M", "1Y", "ALL"];
const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "candlestick", label: "OHLC" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
];
const INDICATORS: { value: IndicatorType; label: string }[] = [
  { value: "SMA_20", label: "SMA" },
  { value: "EMA_12", label: "EMA" },
  { value: "BB_UPPER", label: "BB" },
  { value: "RSI_14", label: "RSI" },
  { value: "ATR_14", label: "ATR" },
];

export function ChartControls({
  period,
  onPeriodChange,
  chartType,
  onChartTypeChange,
  activeIndicators,
  onToggleIndicator,
}: ChartControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
      {/* Period selector */}
      <div className="flex rounded border border-[var(--color-border)]">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            className={`px-2 py-1 transition-colors ${
              period === p
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <span className="text-[var(--color-border)]">|</span>

      {/* Chart type toggle */}
      <div className="flex rounded border border-[var(--color-border)]">
        {CHART_TYPES.map((ct) => (
          <button
            key={ct.value}
            onClick={() => onChartTypeChange(ct.value)}
            className={`px-2 py-1 transition-colors ${
              chartType === ct.value
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
            }`}
          >
            {ct.label}
          </button>
        ))}
      </div>

      <span className="text-[var(--color-border)]">|</span>

      {/* Indicator toggles */}
      <div className="flex gap-1">
        {INDICATORS.map((ind) => {
          // For BB, check both BB_UPPER and BB_LOWER
          const isActive =
            ind.value === "BB_UPPER"
              ? activeIndicators.includes("BB_UPPER")
              : activeIndicators.includes(ind.value);

          return (
            <button
              key={ind.value}
              onClick={() => {
                if (ind.value === "BB_UPPER") {
                  // Toggle both BB_UPPER and BB_LOWER together
                  onToggleIndicator("BB_UPPER");
                  onToggleIndicator("BB_LOWER");
                } else {
                  onToggleIndicator(ind.value);
                }
              }}
              className={`rounded px-2 py-1 transition-colors ${
                isActive
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                  : "bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
              } border border-[var(--color-border)]`}
            >
              {ind.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
