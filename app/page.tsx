"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetchYahoo5m, normalizeSeries, SeriesBar } from "@/lib/yahoo";
import { computeLevels } from "@/lib/levels";
import { analyzeReactions, generateSignals, PatternStats, Signal } from "@/lib/analysis";
import { PriceChart } from "@/components/PriceChart";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HomePage() {
  const [symbol, setSymbol] = useState<string>("SPY");
  const [range, setRange] = useState<string>("10d");
  const [isClient, setIsClient] = useState(false);

  const { data, isLoading, error, mutate } = useSWR(
    isClient ? ["yahoo", symbol, range] : null,
    async ([, s, r]) => fetchYahoo5m(String(s), String(r))
  );

  useEffect(() => setIsClient(true), []);

  const { bars, tz, latestSessionDate, firstBarOfLatestSession } = useMemo(() => {
    if (!data) return { bars: [] as SeriesBar[], tz: "UTC", latestSessionDate: "", firstBarOfLatestSession: undefined as SeriesBar | undefined };
    const normalized = normalizeSeries(data);
    const byDay = new Map<string, SeriesBar[]>();
    for (const b of normalized.bars) {
      const key = new Intl.DateTimeFormat("en-US", { timeZone: normalized.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(b.time * 1000));
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(b);
    }
    const days = Array.from(byDay.keys()).sort();
    const latest = days[days.length - 1];
    const todayBars = byDay.get(latest) ?? [];
    const firstBar = todayBars.find((b) => {
      const d = new Date(b.time * 1000);
      const hour = Number(
        new Intl.DateTimeFormat("en-US", { timeZone: normalized.timezone, hour: "2-digit", hour12: false }).format(d)
      );
      const minute = Number(
        new Intl.DateTimeFormat("en-US", { timeZone: normalized.timezone, minute: "2-digit", hour12: false }).format(d)
      );
      return hour === 9 && minute === 30;
    }) ?? todayBars[0];

    return { bars: normalized.bars, tz: normalized.timezone, latestSessionDate: latest, firstBarOfLatestSession: firstBar };
  }, [data]);

  const levels = useMemo(() => {
    if (!firstBarOfLatestSession) return null;
    const A = firstBarOfLatestSession.high;
    const B = firstBarOfLatestSession.low;
    return computeLevels(A, B);
  }, [firstBarOfLatestSession]);

  const patternStats: PatternStats | null = useMemo(() => {
    if (!levels || bars.length === 0) return null;
    return analyzeReactions(bars, tz, levels);
  }, [bars, tz, levels]);

  const signals: Signal[] = useMemo(() => {
    if (!patternStats || !levels) return [];
    return generateSignals(bars, levels, patternStats);
  }, [bars, levels, patternStats]);

  return (
    <div className="container vstack" style={{ gap: 16 }}>
      <div className="card vstack" style={{ gap: 12 }}>
        <div className="row" style={{ alignItems: "center" }}>
          <div className="hstack" style={{ gap: 8 }}>
            <input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Symbol (e.g., SPY, AAPL)" />
            <select className="input" value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="5d">5d</option>
              <option value="10d">10d</option>
              <option value="1mo">1mo</option>
              <option value="3mo">3mo</option>
            </select>
            <button className="button" onClick={() => mutate()} disabled={isLoading}>Load</button>
          </div>
          {error ? <span className="badge" style={{ color: "#ef4444" }}>Error loading</span> : null}
          {isLoading ? <span className="badge">Loading...</span> : null}
        </div>
        <div className="small">Timezone: {tz} ? Latest session: {latestSessionDate || "-"}</div>
      </div>

      <div className="card">
        <PriceChart bars={bars} levels={levels || undefined} timezone={tz} signals={signals} />
      </div>

      <div className="row">
        <div className="col card vstack" style={{ gap: 12 }}>
          <div className="hstack" style={{ justifyContent: "space-between" }}>
            <strong>Levels (First 5-min candle)</strong>
            <span className="small">A = High, B = Low</span>
          </div>
          {levels ? (
            <div className="vstack" style={{ gap: 6 }}>
              {["A1","A2","A3","A4"].map((k) => (
                <div key={k} className="hstack" style={{ justifyContent: "space-between" }}>
                  <div className="hstack" style={{ gap: 8 }}>
                    <span className="level red" style={{ width: 12 }}></span>
                    <span>{k}</span>
                  </div>
                  <span>{(levels as any)[k].toFixed(2)}</span>
                </div>
              ))}
              {["B1","B2","B3","B4"].map((k) => (
                <div key={k} className="hstack" style={{ justifyContent: "space-between" }}>
                  <div className="hstack" style={{ gap: 8 }}>
                    <span className="level green" style={{ width: 12 }}></span>
                    <span>{k}</span>
                  </div>
                  <span>{(levels as any)[k].toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="small">Levels will appear after loading data.</div>
          )}
        </div>

        <div className="col card vstack" style={{ gap: 12 }}>
          <strong>Pattern stats (last sessions)</strong>
          {patternStats ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Touches</th>
                  <th>Bounces</th>
                  <th>Breaks</th>
                  <th>Bounce %</th>
                </tr>
              </thead>
              <tbody>
                {patternStats.rows.map((r) => (
                  <tr key={r.key}>
                    <td>{r.key}</td>
                    <td>{r.touches}</td>
                    <td>{r.bounces}</td>
                    <td>{r.breaks}</td>
                    <td>{(r.bounces / Math.max(1, r.touches) * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="small">Load data to see behavior patterns.</div>
          )}
        </div>

        <div className="col card vstack" style={{ gap: 12 }}>
          <strong>Signals</strong>
          {signals.length ? (
            <div className="vstack" style={{ gap: 8 }}>
              {signals.map((s, idx) => (
                <div key={idx} className="hstack" style={{ justifyContent: "space-between" }}>
                  <span>{s.type.toUpperCase()} {s.reason}</span>
                  <span className="small">Entry {s.entry.toFixed(2)} ? SL {s.stopLoss.toFixed(2)} ? TP {s.takeProfit.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="small">No signals yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
