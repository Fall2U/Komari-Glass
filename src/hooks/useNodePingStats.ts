"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchPingHistory,
  fetchPingMetricSeries,
  fetchPingMetricStats,
} from "@/lib/api";
import {
  buildMetricPingSource,
  summarizePingSource,
  type PingSource,
} from "@/lib/ping";

interface PingBar {
  key: string;
  className: string;
  tooltip: string;
}

interface NodePingStats {
  latencyDisplay: string;
  lossDisplay: string;
  latencyBars: PingBar[];
  lossBars: PingBar[];
}

interface CacheEntry {
  at: number;
  data?: PingSource;
  promise?: Promise<PingSource>;
}

const BAR_COUNT = 20;
const MAX_POINTS = 6000;
const CACHE_TTL = 60_000;
const REFRESH_INTERVAL = 60_000;
const cache = new Map<string, CacheEntry>();

async function fetchPingSource(
  uuid: string,
  hours: number
): Promise<PingSource> {
  const [statsResult, metricsResult] = await Promise.allSettled([
    fetchPingMetricStats(uuid, hours, MAX_POINTS),
    fetchPingMetricSeries(uuid, hours, MAX_POINTS),
  ]);

  if (
    statsResult.status === "fulfilled" &&
    metricsResult.status === "fulfilled"
  ) {
    const metricSource = buildMetricPingSource(
      uuid,
      statsResult.value,
      metricsResult.value
    );
    if (metricSource) return metricSource;
  }

  const response = await fetchPingHistory(uuid, hours);
  return { kind: "records", records: response.records };
}

async function loadPingSource(
  uuid: string,
  hours: number,
  force = false
): Promise<PingSource> {
  const key = `${uuid}:${hours}`;
  const hit = cache.get(key);
  if (hit?.promise) return hit.promise;
  if (!force && hit?.data && Date.now() - hit.at < CACHE_TTL) {
    return hit.data;
  }

  const promise = fetchPingSource(uuid, hours)
    .then((data) => {
      cache.set(key, { at: Date.now(), data });
      return data;
    })
    .catch((error) => {
      if (hit?.data) {
        cache.set(key, { at: hit.at, data: hit.data });
        return hit.data;
      }
      cache.delete(key);
      throw error;
    });

  cache.set(key, { at: hit?.at ?? 0, data: hit?.data, promise });
  return promise;
}

function latencyClass(ms: number): string {
  if (ms <= 60) return "bg-signal-1";
  if (ms <= 100) return "bg-signal-2";
  if (ms <= 160) return "bg-signal-3";
  if (ms <= 200) return "bg-signal-4";
  return "bg-signal-5";
}

function lossClass(percent: number): string {
  if (percent <= 1) return "bg-signal-1";
  if (percent <= 3) return "bg-signal-2";
  if (percent <= 6) return "bg-signal-3";
  if (percent <= 9) return "bg-signal-4";
  return "bg-signal-5";
}

function emptyBars(label: string): PingBar[] {
  return Array.from({ length: BAR_COUNT }, (_, index) => ({
    key: `empty-${index}`,
    className: "bg-muted-foreground/10",
    tooltip: label,
  }));
}

export function useNodePingStats(
  uuid: string,
  enabled = true,
  hours = 1
): NodePingStats {
  const [source, setSource] = useState<PingSource | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !uuid) {
      setSource(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setSource(null);
    setLoading(true);

    const loadInitial = async () => {
      try {
        const data = await loadPingSource(uuid, hours);
        if (!cancelled) setSource(data);
      } catch {
        if (!cancelled) setSource(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const refresh = async () => {
      try {
        const data = await loadPingSource(uuid, hours, true);
        if (!cancelled) setSource(data);
      } catch {
        // Keep the last successful sample visible during transient failures.
      }
    };

    void loadInitial();
    const timer = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [uuid, enabled, hours]);

  return useMemo(() => {
    const stats = source
      ? summarizePingSource(source)
      : { avgLatency: 0, avgLoss: 0, history: [], hasData: false };
    const latencyBars: PingBar[] = stats.history.length
      ? stats.history.map((point, index) => ({
          key: `latency-${point.time}-${index}`,
          className:
            point.latency === null
              ? "bg-muted-foreground/15"
              : latencyClass(point.latency),
          tooltip:
            point.latency === null
              ? `${new Date(point.time).toLocaleTimeString()}\n无采样数据`
              : `${new Date(point.time).toLocaleTimeString()}\n${Math.round(point.latency)} ms`,
        }))
      : emptyBars(loading ? "加载中" : "无采样数据");
    const lossBars: PingBar[] = stats.history.length
      ? stats.history.map((point, index) => ({
          key: `loss-${point.time}-${index}`,
          className:
            point.loss === null
              ? "bg-muted-foreground/15"
              : lossClass(point.loss),
          tooltip:
            point.loss === null
              ? `${new Date(point.time).toLocaleTimeString()}\n无采样数据`
              : `${new Date(point.time).toLocaleTimeString()}\n${point.loss.toFixed(1)}%`,
        }))
      : emptyBars(loading ? "加载中" : "无采样数据");

    return {
      latencyDisplay: stats.hasData
        ? `${Math.round(stats.avgLatency)} ms`
        : loading
          ? "加载中"
          : "-",
      lossDisplay: stats.hasData
        ? `${stats.avgLoss.toFixed(1)}%`
        : loading
          ? "加载中"
          : "-",
      latencyBars,
      lossBars,
    };
  }, [source, loading]);
}
