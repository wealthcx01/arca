/**
 * React wrapper around TradingView lightweight-charts createChart().
 * Handles resize, theme switching, and cleanup.
 */

import {
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  createChart,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { ChartTheme } from "./types";

interface LightweightChartProps {
  height?: number;
  theme: ChartTheme;
  onChart?: (chart: IChartApi) => void;
  className?: string;
}

export function LightweightChart({
  height = 400,
  theme,
  onChart,
  className = "",
}: LightweightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // ARCA-65. `onChart` is an inline callback whose own deps include `theme`, and `theme` is a fresh
  // object every render (`getChartTheme(isDark)`). Naming it as a dependency below would destroy and
  // recreate the chart on every render — the fix that produces the bug. Held in a ref instead, so
  // the effect always calls the latest one without depending on its identity.
  const onChartRef = useRef(onChart);
  useEffect(() => {
    onChartRef.current = onChart;
  });

  // Same reasoning for the initial look. The creation effect wants the height and theme as they are
  // AT MOUNT; naming them as dependencies would rebuild the chart whenever they changed, which is
  // exactly what the applyOptions effect below exists to avoid. A ref says "current value, no
  // dependency" precisely.
  const initialRef = useRef({ height, theme });
  initialRef.current = { height, theme };

  useEffect(() => {
    if (!containerRef.current) return;

    const { height: initialHeight, theme: initialTheme } = initialRef.current;
    const chart = createChart(containerRef.current, {
      height: initialHeight,
      layout: {
        background: { type: ColorType.Solid, color: initialTheme.background },
        textColor: initialTheme.textColor,
      },
      grid: {
        vertLines: { color: initialTheme.gridColor },
        horzLines: { color: initialTheme.gridColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: initialTheme.borderColor,
      },
      timeScale: {
        borderColor: initialTheme.borderColor,
        timeVisible: false,
      },
    });

    chartRef.current = chart;
    onChartRef.current?.(chart);

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        chart.applyOptions({ width });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
    // Created once. Height and theme are applied by the effect below rather than by recreating the
    // chart, which is what the library's applyOptions is for.
  }, []);

  // ARCA-65: apply height and theme changes to the existing chart.
  //
  // This did not exist, and its absence was a real bug the lint rule pointed at: the chart read
  // `height` and `theme` only at creation, so changing either did nothing until the component
  // happened to remount. Toggling dark mode left every chart on the old palette.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      height,
      layout: {
        background: { type: ColorType.Solid, color: theme.background },
        textColor: theme.textColor,
      },
      grid: {
        vertLines: { color: theme.gridColor },
        horzLines: { color: theme.gridColor },
      },
      rightPriceScale: { borderColor: theme.borderColor },
      timeScale: { borderColor: theme.borderColor },
    });
  }, [height, theme.background, theme.textColor, theme.gridColor, theme.borderColor]);

  // Update theme without recreating chart
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: theme.background },
        textColor: theme.textColor,
      },
      grid: {
        vertLines: { color: theme.gridColor },
        horzLines: { color: theme.gridColor },
      },
      rightPriceScale: { borderColor: theme.borderColor },
      timeScale: { borderColor: theme.borderColor },
    });
  }, [theme]);

  return <div ref={containerRef} className={`w-full ${className}`} style={{ minHeight: height }} />;
}
