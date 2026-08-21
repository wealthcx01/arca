/**
 * Technical summary panel — RSI gauge, MACD signal, trend arrow, SMA crossover.
 */

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

interface TechnicalSummaryProps {
  rsi?: number; // 0-100
  macdSignal?: "bullish" | "bearish" | "neutral";
  trendScore?: number; // -100 to +100
  smaStatus?: "above" | "below" | "cross_up" | "cross_down";
}

function RsiGauge({ value }: { value: number }) {
  const isOverBought = value > 70;
  const isOverSold = value < 30;
  const color = isOverBought
    ? "text-[var(--color-negative)]"
    : isOverSold
      ? "text-[var(--color-positive)]"
      : "text-[var(--color-foreground)]";
  const label = isOverBought ? "Overbought" : isOverSold ? "Oversold" : "Neutral";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase text-[var(--color-muted-foreground)]">RSI (14)</span>
        <span className={`font-mono text-sm font-bold tabular-nums ${color}`}>
          {value.toFixed(0)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--color-muted)]">
        <div
          className={`h-full rounded-full transition-all ${
            isOverBought
              ? "bg-[var(--color-negative)]"
              : isOverSold
                ? "bg-[var(--color-positive)]"
                : "bg-[var(--color-primary)]"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <div className="text-right text-[9px] text-[var(--color-muted-foreground)]">{label}</div>
    </div>
  );
}

export function TechnicalSummary({
  rsi,
  macdSignal = "neutral",
  trendScore = 0,
  smaStatus = "above",
}: TechnicalSummaryProps) {
  const trendIcon =
    trendScore > 20 ? (
      <TrendingUp size={14} className="text-[var(--color-positive)]" />
    ) : trendScore < -20 ? (
      <TrendingDown size={14} className="text-[var(--color-negative)]" />
    ) : (
      <Minus size={14} className="text-[var(--color-muted-foreground)]" />
    );

  const macdColor =
    macdSignal === "bullish"
      ? "text-[var(--color-positive)]"
      : macdSignal === "bearish"
        ? "text-[var(--color-negative)]"
        : "text-[var(--color-muted-foreground)]";

  const smaLabel =
    smaStatus === "cross_up"
      ? "Golden Cross"
      : smaStatus === "cross_down"
        ? "Death Cross"
        : smaStatus === "above"
          ? "Above SMA"
          : "Below SMA";

  return (
    <div className="space-y-3 text-sm">
      {rsi != null && <RsiGauge value={rsi} />}

      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase text-[var(--color-muted-foreground)]">MACD</span>
        <span className={`text-xs font-semibold capitalize ${macdColor}`}>{macdSignal}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase text-[var(--color-muted-foreground)]">Trend</span>
        <span className="flex items-center gap-1">
          {trendIcon}
          <span className="font-mono text-xs tabular-nums">
            {trendScore > 0 ? "+" : ""}
            {trendScore}
          </span>
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase text-[var(--color-muted-foreground)]">SMA (20)</span>
        <span className="text-xs font-medium">{smaLabel}</span>
      </div>
    </div>
  );
}
