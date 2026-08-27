/**
 * Separate indicator pane below the main chart — RSI, MACD.
 */

import { HistogramSeries, type IChartApi, LineSeries, type Time } from "lightweight-charts";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { LightweightChart } from "./LightweightChart";
import type { LineData } from "./types";
import { type ChartPeriod, PERIOD_DAYS, getChartTheme } from "./types";

interface IndicatorPaneProps {
  cardId: string;
  currency?: string;
  indicator: "RSI_14" | "MACD";
  period: ChartPeriod;
  height?: number;
  isDark?: boolean;
}

export function IndicatorPane({
  cardId,
  currency = "USD",
  indicator,
  period,
  height = 150,
  isDark = false,
}: IndicatorPaneProps) {
  const [data, setData] = useState<Record<string, LineData[]>>({});
  const theme = getChartTheme(isDark);

  useEffect(() => {
    const days = PERIOD_DAYS[period];
    const indicators = indicator === "MACD" ? "MACD,MACD_SIGNAL,MACD_HIST" : indicator;

    api
      .get<{ data: Record<string, Array<{ date: string; value_e6: number }>> }>(
        `/analytics/${cardId}/indicators?days=${days}&currency=${currency}&indicators=${indicators}`,
      )
      .then((res) => {
        const mapped: Record<string, LineData[]> = {};
        for (const [key, values] of Object.entries(res.data)) {
          mapped[key] = values.map((v) => ({
            time: v.date,
            value: v.value_e6 / 1_000_000,
          }));
        }
        setData(mapped);
      })
      .catch(() => setData({}));
  }, [cardId, indicator, period, currency]);

  const handleChart = (chart: IChartApi) => {
    if (indicator === "RSI_14") {
      const rsiData = data.RSI_14;
      if (rsiData && rsiData.length > 0) {
        const series = chart.addSeries(LineSeries, {
          color: theme.primaryColor,
          lineWidth: 2,
          priceLineVisible: false,
        });
        series.setData(rsiData.map((d) => ({ time: d.time as Time, value: d.value })));

        // Overbought/oversold reference lines
        if (rsiData.length >= 2) {
          const obSeries = chart.addSeries(LineSeries, {
            color: theme.downColor,
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          obSeries.setData([
            { time: rsiData[0]!.time as Time, value: 70 },
            { time: rsiData[rsiData.length - 1]!.time as Time, value: 70 },
          ]);

          const osSeries = chart.addSeries(LineSeries, {
            color: theme.upColor,
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          osSeries.setData([
            { time: rsiData[0]!.time as Time, value: 30 },
            { time: rsiData[rsiData.length - 1]!.time as Time, value: 30 },
          ]);
        }
      }
    } else if (indicator === "MACD") {
      const histData = data.MACD_HIST;
      const macdData = data.MACD;
      const signalData = data.MACD_SIGNAL;

      if (histData && histData.length > 0) {
        const histSeries = chart.addSeries(HistogramSeries, {
          priceLineVisible: false,
          lastValueVisible: false,
        });
        histSeries.setData(
          histData.map((d) => ({
            time: d.time as Time,
            value: d.value,
            color: d.value >= 0 ? theme.upColor : theme.downColor,
          })),
        );
      }

      if (macdData && macdData.length > 0) {
        const series = chart.addSeries(LineSeries, {
          color: theme.primaryColor,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        series.setData(macdData.map((d) => ({ time: d.time as Time, value: d.value })));
      }

      if (signalData && signalData.length > 0) {
        const series = chart.addSeries(LineSeries, {
          color: theme.secondaryColor,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        series.setData(signalData.map((d) => ({ time: d.time as Time, value: d.value })));
      }
    }

    chart.timeScale().fitContent();
  };

  const hasData =
    indicator === "RSI_14" ? (data.RSI_14?.length ?? 0) > 0 : (data.MACD?.length ?? 0) > 0;

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-card)]"
        style={{ height }}
      >
        <span className="text-[10px] text-[var(--color-muted-foreground)]">
          {indicator} — No data
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {indicator === "RSI_14" ? "RSI (14)" : "MACD (12, 26, 9)"}
      </div>
      <LightweightChart height={height} theme={theme} onChart={handleChart} />
    </div>
  );
}
