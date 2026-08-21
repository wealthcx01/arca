/**
 * Historical volatility line chart with ATR visualization.
 */

import { AreaSeries, type IChartApi, type Time } from "lightweight-charts";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { LightweightChart } from "./LightweightChart";
import type { ChartPeriod, LineData } from "./types";
import { PERIOD_DAYS, getChartTheme } from "./types";

interface VolatilityChartProps {
  cardId: string;
  currency?: string;
  period?: ChartPeriod;
  height?: number;
  isDark?: boolean;
}

export function VolatilityChart({
  cardId,
  currency = "USD",
  period = "3M",
  height = 200,
  isDark = false,
}: VolatilityChartProps) {
  const [atrData, setAtrData] = useState<LineData[]>([]);
  const theme = getChartTheme(isDark);

  useEffect(() => {
    const days = PERIOD_DAYS[period];
    api
      .get<{ data: Record<string, Array<{ date: string; value_e6: number }>> }>(
        `/analytics/${cardId}/indicators?days=${days}&currency=${currency}&indicators=ATR_14`,
      )
      .then((res) => {
        const atr = res.data["ATR_14"];
        if (atr) {
          setAtrData(
            atr.map((v) => ({
              time: v.date,
              value: v.value_e6 / 1_000_000 / 100,
            })),
          );
        }
      })
      .catch(() => setAtrData([]));
  }, [cardId, period, currency]);

  if (atrData.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-card)]"
        style={{ height }}
      >
        <span className="text-[10px] text-[var(--color-muted-foreground)]">
          Volatility — No data
        </span>
      </div>
    );
  }

  const handleChart = (chart: IChartApi) => {
    const series = chart.addSeries(AreaSeries, {
      topColor: `${theme.downColor}30`,
      bottomColor: `${theme.downColor}05`,
      lineColor: theme.downColor,
      lineWidth: 2,
      priceLineVisible: false,
    });
    series.setData(atrData.map((d) => ({ time: d.time as Time, value: d.value })));
    chart.timeScale().fitContent();
  };

  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        ATR (14) — Volatility
      </div>
      <LightweightChart height={height} theme={theme} onChart={handleChart} />
    </div>
  );
}
