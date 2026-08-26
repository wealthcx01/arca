/**
 * OHLC candlestick chart with optional SMA/EMA overlay lines.
 * Fetches from /api/analytics/:cardId/ohlc.
 */

import {
  AreaSeries,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  LineSeries,
  type SeriesType,
  type Time,
} from "lightweight-charts";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { ChartControls } from "./ChartControls";
import { LightweightChart } from "./LightweightChart";
import type { ChartPeriod, ChartType, IndicatorType, LineData, OHLCData } from "./types";
import { PERIOD_DAYS, getChartTheme, getIndicatorColors } from "./types";

interface CandlestickChartProps {
  cardId: string;
  currency?: string;
  height?: number;
  isDark?: boolean;
  showControls?: boolean;
}

export function CandlestickChart({
  cardId,
  currency = "USD",
  height = 400,
  isDark = false,
  showControls = true,
}: CandlestickChartProps) {
  const [period, setPeriod] = useState<ChartPeriod>("3M");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [activeIndicators, setActiveIndicators] = useState<IndicatorType[]>([]);
  const [ohlcData, setOhlcData] = useState<OHLCData[]>([]);
  const [indicatorData, setIndicatorData] = useState<Record<string, LineData[]>>({});
  const [loading, setLoading] = useState(true);

  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  const theme = getChartTheme(isDark);
  const indicatorColors = getIndicatorColors(isDark);

  // Fetch OHLC data
  useEffect(() => {
    setLoading(true);
    const days = PERIOD_DAYS[period];
    api
      .get<{
        data: Array<{
          date: string;
          open_cents: number;
          high_cents: number;
          low_cents: number;
          close_cents: number;
        }>;
      }>(`/analytics/${cardId}/ohlc?days=${days}&currency=${currency}`)
      .then((res) => {
        const mapped: OHLCData[] = res.data.map((d) => ({
          time: d.date,
          open: d.open_cents / 100,
          high: d.high_cents / 100,
          low: d.low_cents / 100,
          close: d.close_cents / 100,
        }));
        setOhlcData(mapped);
      })
      .catch(() => setOhlcData([]))
      .finally(() => setLoading(false));
  }, [cardId, period, currency]);

  // Fetch indicator data when indicators change
  useEffect(() => {
    if (activeIndicators.length === 0) {
      setIndicatorData({});
      return;
    }

    const days = PERIOD_DAYS[period];
    const indicatorStr = activeIndicators.join(",");
    api
      .get<{ data: Record<string, Array<{ date: string; value_e6: number }>> }>(
        `/analytics/${cardId}/indicators?days=${days}&currency=${currency}&indicators=${indicatorStr}`,
      )
      .then((res) => {
        const mapped: Record<string, LineData[]> = {};
        for (const [key, values] of Object.entries(res.data)) {
          const isPrice = key.startsWith("SMA") || key.startsWith("EMA") || key.startsWith("BB");
          mapped[key] = values.map((v) => ({
            time: v.date,
            value: isPrice ? v.value_e6 / 1_000_000 / 100 : v.value_e6 / 1_000_000,
          }));
        }
        setIndicatorData(mapped);
      })
      .catch(() => setIndicatorData({}));
  }, [cardId, activeIndicators, period, currency]);

  // Build chart when data changes
  // rebuildSeries is a function declaration and biome does not look inside it, so it reports
  // these four dependencies as unnecessary. Its body reads all of them directly. Removing them
  // would stop the chart rebuilding when the data, the chart type or the palette changes —
  // verified by reading rebuildSeries, not assumed. The directive must sit on the line directly
  // above the hook, so it goes last.
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive, see above
  const handleChart = useCallback(
    (chart: IChartApi) => {
      chartRef.current = chart;
      rebuildSeries(chart);
    },
    [ohlcData, indicatorData, chartType, theme],
  );

  // rebuildSeries is a function declaration and biome does not look inside it, so it reports
  // these four dependencies as unnecessary. Its body reads all of them directly. Removing them
  // would stop the chart rebuilding when the data, the chart type or the palette changes —
  // verified by reading rebuildSeries, not assumed. The directive must sit on the line directly
  // above the hook, so it goes last.
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive, see above
  useEffect(() => {
    if (chartRef.current) {
      rebuildSeries(chartRef.current);
    }
  }, [ohlcData, indicatorData, chartType, theme]);

  function rebuildSeries(chart: IChartApi) {
    // Remove old series
    if (mainSeriesRef.current) {
      try {
        chart.removeSeries(mainSeriesRef.current);
      } catch {
        /* already removed */
      }
    }
    for (const [, series] of indicatorSeriesRef.current) {
      try {
        chart.removeSeries(series);
      } catch {
        /* already removed */
      }
    }
    indicatorSeriesRef.current.clear();
    mainSeriesRef.current = null;

    if (ohlcData.length === 0) return;

    if (chartType === "candlestick") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: theme.upColor,
        downColor: theme.downColor,
        borderUpColor: theme.upColor,
        borderDownColor: theme.downColor,
        wickUpColor: theme.upColor,
        wickDownColor: theme.downColor,
      });
      series.setData(
        ohlcData.map((d) => ({
          time: d.time as Time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        })),
      );
      mainSeriesRef.current = series;
    } else if (chartType === "line") {
      const series = chart.addSeries(LineSeries, {
        color: theme.primaryColor,
        lineWidth: 2,
      });
      series.setData(ohlcData.map((d) => ({ time: d.time as Time, value: d.close })));
      mainSeriesRef.current = series;
    } else {
      const series = chart.addSeries(AreaSeries, {
        topColor: `${theme.primaryColor}40`,
        bottomColor: `${theme.primaryColor}05`,
        lineColor: theme.primaryColor,
        lineWidth: 2,
      });
      series.setData(ohlcData.map((d) => ({ time: d.time as Time, value: d.close })));
      mainSeriesRef.current = series;
    }

    // Add indicator overlays (only price-based on main chart)
    for (const [name, data] of Object.entries(indicatorData)) {
      if (!name.startsWith("SMA") && !name.startsWith("EMA") && !name.startsWith("BB")) continue;
      const series = chart.addSeries(LineSeries, {
        color: indicatorColors[name] || theme.secondaryColor,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(data.map((d) => ({ time: d.time as Time, value: d.value })));
      indicatorSeriesRef.current.set(name, series);
    }

    chart.timeScale().fitContent();
  }

  const toggleIndicator = (ind: IndicatorType) => {
    setActiveIndicators((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind],
    );
  };

  if (loading && ohlcData.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
        style={{ height }}
      >
        <span className="text-xs text-[var(--color-muted-foreground)]">Loading chart...</span>
      </div>
    );
  }

  if (ohlcData.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
        style={{ height }}
      >
        <span className="text-xs text-[var(--color-muted-foreground)]">No OHLC data available</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showControls && (
        <ChartControls
          period={period}
          onPeriodChange={setPeriod}
          chartType={chartType}
          onChartTypeChange={setChartType}
          activeIndicators={activeIndicators}
          onToggleIndicator={toggleIndicator}
        />
      )}
      <LightweightChart height={height} theme={theme} onChart={handleChart} />
    </div>
  );
}
