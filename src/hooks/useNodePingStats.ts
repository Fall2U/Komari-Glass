"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPingHistory } from "@/lib/api";
import type { PingRecord } from "@/lib/types";

interface PingBar {
  key: string;
  className: string;
  tooltip: string;
}

interface NodePingStats {
  avgLatency: number;
  avgLoss: number;
  hasData: boolean;
  loading: boolean;
  latencyDisplay: string;
  lossDisplay: string;
  latencyBars: PingBar[];
  lossBars: PingBar[];
}

const BAR_COUNT = 20;
const EMPTY_BARS = BAR_COUNT;

// Shared in-memory cache so many cards don't stampede the API
const cache = new Map<
  string,
  { at: number; records: PingRecord[]; promise?: Promise<PingRecord[]> }
>();
const CACHE_TTL = 60_000;

function cacheKey(uuid: string, hours: number) {
  return `${uuid}:${hours}`;
}

async function loadRecords(uuid: string, hours: number): Promise<PingRecord[]> {
  const key = cacheKey(uuid, hours);
  const hit = cache.get(key);
  if (hit?.promise) return hit.promise;
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.records;

  const promise = fetchPingHistory(uuid, hours)
    .then((res) => {
      const records = res.records;
      cache.set(key, { at: Date.now(), records });
      return records;
    })
    .catch(() => {
      cache.set(key, { at: Date.now(), records: [] });
      return [] as PingRecord[];
    });

  cache.set(key, { at: 0, records: hit?.records || [], promise });
  return promise;
}

function latencyClass(ms: number): string {
  if (ms <= 60) return "bg-signal-1";
  if (ms <= 100) return "bg-signal-2";
  if (ms <= 160) return "bg-signal-3";
  if (ms <= 200) return "bg-signal-4";
  return "bg-signal-5";
}

function lossClass(pct: number): string {
  if (pct <= 1) return "bg-signal-1";
  if (pct <= 3) return "bg-signal-2";
  if (pct <= 6) return "bg-signal-3";
  if (pct <= 9) return "bg-signal-4";
  return "bg-signal-5";
}

function emptyBars(label: string): PingBar[] {
  return Array.from({ length: EMPTY_BARS }, (_, i) => ({
    key: `empty-${label}-${i}`,
    className: "bg-muted-foreground/15",
    tooltip: label,
  }));
}

function buildBuckets(records: PingRecord[]): {
  history: Array<{ time: string; latency: number | null; loss: number | null }>;
  avgLatency: number;
  avgLoss: number;
} {
  if (!records.length) {
    return { history: [], avgLatency: 0, avgLoss: 0 };
  }

  const sorted = [...records].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  const first = new Date(sorted[0].time).getTime();
  const last = new Date(sorted[sorted.length - 1].time).getTime();
  const span = Math.max(last - first, 1);
  const count = Math.min(BAR_COUNT, Math.max(sorted.length, 4));
  const bucketSize = span / count;

  const history: Array<{
    time: string;
    latency: number | null;
    loss: number | null;
  }> = [];

  let idx = 0;
  const allLatencies: number[] = [];
  let totalSamples = 0;
  let lostSamples = 0;

  for (let i = 0; i < count; i++) {
    const start = first + bucketSize * i;
    const end = i === count - 1 ? last + 1 : start + bucketSize;
    let latSum = 0;
    let latN = 0;
    let total = 0;
    let lost = 0;

    while (idx < sorted.length) {
      const r = sorted[idx];
      const t = new Date(r.time).getTime();
      if (t >= end) break;
      if (t >= start) {
        total += 1;
        totalSamples += 1;
        if (r.value >= 0) {
          latSum += r.value;
          latN += 1;
          allLatencies.push(r.value);
        } else {
          lost += 1;
          lostSamples += 1;
        }
      }
      idx += 1;
    }

    history.push({
      time: new Date(start).toISOString(),
      latency: latN ? latSum / latN : null,
      loss: total ? (lost / total) * 100 : null,
    });
  }

  return {
    history,
    avgLatency: allLatencies.length
      ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
      : 0,
    avgLoss: totalSamples ? (lostSamples / totalSamples) * 100 : 0,
  };
}

export function useNodePingStats(
  uuid: string,
  enabled = true,
  hours = 1
): NodePingStats {
  const [records, setRecords] = useState<PingRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !uuid) {
      setRecords([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadRecords(uuid, hours).then((data) => {
      if (!cancelled) {
        setRecords(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uuid, enabled, hours]);

  return useMemo(() => {
    const { history, avgLatency, avgLoss } = buildBuckets(records);
    const hasData = history.some(
      (h) => h.latency !== null || h.loss !== null
    );

    const latencyBars: PingBar[] = hasData
      ? history.map((h, i) => ({
          key: `lat-${h.time}-${i}`,
          className:
            h.latency === null
              ? "bg-muted-foreground/15"
              : latencyClass(h.latency),
          tooltip:
            h.latency === null
              ? `${new Date(h.time).toLocaleTimeString()}\n无采样`
              : `${new Date(h.time).toLocaleTimeString()}\n${Math.round(h.latency)} ms`,
        }))
      : emptyBars(loading ? "加载中" : "无采样数据");

    const lossBars: PingBar[] = hasData
      ? history.map((h, i) => ({
          key: `loss-${h.time}-${i}`,
          className:
            h.loss === null ? "bg-muted-foreground/15" : lossClass(h.loss),
          tooltip:
            h.loss === null
              ? `${new Date(h.time).toLocaleTimeString()}\n无采样`
              : `${new Date(h.time).toLocaleTimeString()}\n${h.loss.toFixed(1)}%`,
        }))
      : emptyBars(loading ? "加载中" : "无采样数据");

    return {
      avgLatency,
      avgLoss,
      hasData,
      loading,
      latencyDisplay: hasData
        ? `${Math.round(avgLatency)} ms`
        : loading
          ? "…"
          : "—",
      lossDisplay: hasData
        ? `${avgLoss.toFixed(1)}%`
        : loading
          ? "…"
          : "—",
      latencyBars,
      lossBars,
    };
  }, [records, loading]);
}
