"use client";

import { useEffect, useMemo, useRef } from "react";
import { createChart, ColorType, ISeriesApi } from "lightweight-charts";
import { SeriesBar } from "@/lib/yahoo";
import { ComputedLevels } from "@/lib/levels";
import { Signal } from "@/lib/analysis";

export function PriceChart({ bars, levels, timezone, signals }: { bars: SeriesBar[]; levels?: ComputedLevels; timezone: string; signals: Signal[]; }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const lineLevels = useMemo(() => {
    if (!levels) return [] as { price: number; color: string; title: string }[];
    return [
      { price: levels.A1, color: "#ef4444", title: "A1" },
      { price: levels.A2, color: "#ef4444", title: "A2" },
      { price: levels.A3, color: "#ef4444", title: "A3" },
      { price: levels.A4, color: "#ef4444", title: "A4" },
      { price: levels.B1, color: "#22c55e", title: "B1" },
      { price: levels.B2, color: "#22c55e", title: "B2" },
      { price: levels.B3, color: "#22c55e", title: "B3" },
      { price: levels.B4, color: "#22c55e", title: "B4" },
    ];
  }, [levels]);

  useEffect(() => {
    const container = containerRef.current!;
    const chart = createChart(container, {
      layout: { background: { type: ColorType.Solid, color: "#0b0f19" }, textColor: "#e6edf3" },
      grid: { vertLines: { color: "#1f2637" }, horzLines: { color: "#1f2637" } },
      rightPriceScale: { borderColor: "#1f2637" },
      timeScale: { borderColor: "#1f2637", timeVisible: true, secondsVisible: false },
      autoSize: true,
    });
    const series = chart.addCandlestickSeries({ upColor: "#22c55e", downColor: "#ef4444", wickUpColor: "#22c55e", wickDownColor: "#ef4444", borderVisible: false });
    candleSeriesRef.current = series;

    const resizeObserver = new ResizeObserver(() => chart.timeScale().fitContent());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      candleSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    series.setData(bars.map((b) => ({ time: b.time as any, open: b.open, high: b.high, low: b.low, close: b.close })));
  }, [bars]);

  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    // Clear existing price lines by re-setting options (no direct clear API)
    // Add new price lines for levels
    for (const lvl of lineLevels) {
      series.createPriceLine({ price: lvl.price, color: lvl.color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: lvl.title });
    }
  }, [lineLevels]);

  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    // Add signals as markers
    series.setMarkers(
      signals.map((s) => ({ time: s.time as any, position: s.type === "buy" ? "belowBar" : "aboveBar", color: s.type === "buy" ? "#22c55e" : "#ef4444", shape: s.type === "buy" ? "arrowUp" : "arrowDown", text: s.reason }))
    );
  }, [signals]);

  return <div ref={containerRef} style={{ width: "100%", height: 520 }} />;
}
