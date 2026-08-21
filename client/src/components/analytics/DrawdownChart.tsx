/**
 * Drawdown (underwater) chart — shows drawdown from peak over time.
 */

import { AreaSeries, type IChartApi, LineSeries, type Time } from "lightweight-charts";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { LightweightChart } from "../charts/LightweightChart";
import { type ChartPeriod, PERIOD_DAYS, getChartTheme } from "../charts/types";

interface DrawdownChartProps {
  cardId: string;
  currency?: string;
  period?: ChartPeriod;
  height?: number;
  isDark?: boolean;
}

export function DrawdownChart({
  cardId,
  currency = "USD",
  period = "3M",
  height = 150,
  isDark = false,
}: DrawdownChartProps) {
  const [drawdownData, setDrawdownData] = useState<Array<{ time: string; value: number }>>([]);
  const theme = getChartTheme(isDark);

  useEffect(() => {
    const days = PERIOD_DAYS[period];
    api
      .get<{ data: Array<{ date: string; close_cents: number }> }>(
        `/analytics/${cardId}/ohlc?days=${days}&currency=${currency}`,
      )
      .then((res) => {
        // Compute drawdown from peak
        let peak = 0;
        const dd = res.data.map((d) => {
          const close = d.close_cents;
          if (close > peak) peak = close;
          const drawdown = peak > 0 ? -((peak - close) / peak) * 100 : 0;
          return { time: d.date, value: drawdown };
        });
        setDrawdownData(dd);
      })
      .catch(() => setDrawdownData([]));
  }, [cardId, period, currency]);

  if (drawdownData.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-card)]"
        style={{ height }}
      >
        <span className="text-[10px] text-[var(--color-muted-foreground)]">Drawdown — No data</span>
      </div>
    );
  }

  const handleChart = (chart: IChartApi) => {
    const series = chart.addSeries(AreaSeries, {
      topColor: "transparent",
      bottomColor: `${theme.downColor}20`,
      lineColor: theme.downColor,
      lineWidth: 2,
      priceLineVisible: false,
    });
    series.setData(drawdownData.map((d) => ({ time: d.time as Time, value: d.value })));

    // Zero line
    const zeroLine = chart.addSeries(LineSeries, {
      color: theme.textColor,
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    if (drawdownData.length >= 2) {
      zeroLine.setData([
        { time: drawdownData[0]!.time as Time, value: 0 },
        { time: drawdownData[drawdownData.length - 1]!.time as Time, value: 0 },
      ]);
    }

    chart.timeScale().fitContent();
  };

  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        Drawdown from Peak (%)
      </div>
      <LightweightChart height={height} theme={theme} onChart={handleChart} />
    </div>
  );
}
