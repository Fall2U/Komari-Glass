"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPingHistory, fetchPingMetricStats } from "@/lib/api";
import {
  getExactPingLossByTask,
  summarizePingRecordsByTask,
} from "@/lib/ping";
import type { PingHistoryResponse, PingMetricTaskStats } from "@/lib/types";

interface PingBar {
  key: string;
  className: string;
  tooltip: string;
}

export interface PingTaskSelection {
  telecom: string;
  mobile: string;
  unicom: string;
}

export interface NodePingTaskRow {
  id: number;
  label: string;
  name: string;
  color: string;
  latencyDisplay: string;
  lossDisplay: string;
  latencyBars: PingBar[];
  lossBars: PingBar[];
}

interface NodePingStats {
  tasks: NodePingTaskRow[];
  loading: boolean;
}

interface PingData {
  history: PingHistoryResponse;
  metricStats: PingMetricTaskStats[];
}

interface CacheEntry {
  at: number;
  data?: PingData;
  promise?: Promise<PingData>;
}

const MAX_POINTS = 6000;
const CACHE_TTL = 60_000;
const REFRESH_INTERVAL = 60_000;
const cache = new Map<string, CacheEntry>();

const PING_SLOTS = [
  { key: "telecom", label: "电信", color: "#fb7185" },
  { key: "mobile", label: "移动", color: "#34d399" },
  { key: "unicom", label: "联通", color: "#60a5fa" },
] as const;

async function fetchPingData(uuid: string, hours: number): Promise<PingData> {
  const [history, stats] = await Promise.all([
    fetchPingHistory(uuid, hours),
    fetchPingMetricStats(uuid, hours, MAX_POINTS).catch(() => null),
  ]);
  return {
    history,
    metricStats: stats?.stats ?? [],
  };
}

async function loadPingData(
  uuid: string,
  hours: number,
  force = false
): Promise<PingData> {
  const key = `${uuid}:${hours}`;
  const hit = cache.get(key);
  if (hit?.promise) return hit.promise;
  if (!force && hit?.data && Date.now() - hit.at < CACHE_TTL) {
    return hit.data;
  }

  const promise = fetchPingData(uuid, hours)
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

function formatTime(time: string): string {
  return new Date(time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseTaskId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function useNodePingStats(
  uuid: string,
  enabled = true,
  hours = 1,
  selection: PingTaskSelection = { telecom: "", mobile: "", unicom: "" }
): NodePingStats {
  const [data, setData] = useState<PingData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !uuid) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setData(null);
    setLoading(true);

    const loadInitial = async () => {
      try {
        const result = await loadPingData(uuid, hours);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const refresh = async () => {
      try {
        const result = await loadPingData(uuid, hours, true);
        if (!cancelled) setData(result);
      } catch {
        // Preserve the most recent successful result during transient failures.
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

  const tasks = useMemo(() => {
    if (!data) return [];

    const summaries = new Map(
      summarizePingRecordsByTask(data.history.records).map((summary) => [
        summary.taskId,
        summary,
      ])
    );
    const taskMap = new Map(
      data.history.tasks.map((task) => [task.id, task])
    );
    const exactLoss = getExactPingLossByTask(uuid, data.metricStats);
    const configured = PING_SLOTS.map((slot) => ({
      ...slot,
      id: parseTaskId(selection[slot.key]),
    }));
    const configuredMode = configured.some((slot) => slot.id !== null);
    const usedTaskIds = new Set<number>();

    const selected = configuredMode
      ? configured.flatMap((slot) => {
          if (slot.id === null || usedTaskIds.has(slot.id)) return [];
          const summary = summaries.get(slot.id);
          if (!summary) return [];
          usedTaskIds.add(slot.id);
          return [{
            task: taskMap.get(slot.id) ?? {
              id: slot.id,
              name: `任务 ${slot.id}`,
            },
            summary,
            label: slot.label,
            color: slot.color,
          }];
        })
      : data.history.tasks
          .flatMap((task) => {
            const summary = summaries.get(task.id);
            return summary ? [{ task, summary }] : [];
          })
          .slice(0, PING_SLOTS.length)
          .map(({ task, summary }, index) => ({
            task,
            summary,
            label: PING_SLOTS[index].label,
            color: PING_SLOTS[index].color,
          }));

    return selected.map<NodePingTaskRow>(({ task, summary, label, color }) => ({
      id: task.id,
      label,
      name: task.name,
      color,
      latencyDisplay: `${Math.round(summary.latestLatency)} ms`,
      lossDisplay: `${(exactLoss.get(task.id) ?? summary.loss).toFixed(1)}%`,
      latencyBars: summary.history.map((point, index) => ({
        key: `latency-${task.id}-${point.time}-${index}`,
        className:
          point.latency === null
            ? "bg-muted-foreground/15"
            : latencyClass(point.latency),
        tooltip:
          point.latency === null
            ? `${formatTime(point.time)}\n无采样数据`
            : `${formatTime(point.time)}\n${Math.round(point.latency)} ms`,
      })),
      lossBars: summary.history.map((point, index) => ({
        key: `loss-${task.id}-${point.time}-${index}`,
        className:
          point.loss === null
            ? "bg-muted-foreground/15"
            : lossClass(point.loss),
        tooltip:
          point.loss === null
            ? `${formatTime(point.time)}\n无采样数据`
            : `${formatTime(point.time)}\n${point.loss.toFixed(1)}%`,
      })),
    }));
  }, [data, selection.telecom, selection.mobile, selection.unicom, uuid]);

  return { tasks, loading };
}
