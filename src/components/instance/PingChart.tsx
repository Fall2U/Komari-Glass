"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loading } from "@/components/Loading";
import { fetchPingHistory, fetchPingMetricStats } from "@/lib/api";
import {
  formatChartTooltipLabel,
  formatChartTimeTick,
  getChartGapLimit,
  getChartTimeRange,
  insertTimelineGaps,
} from "@/lib/chart-gaps";
import { cn } from "@/lib/cn";
import {
  getExactPingLossByTask,
  summarizePingRecordsByTask,
} from "@/lib/ping";
import type {
  PingHistoryResponse,
  PingMetricTaskStats,
  PingRecord,
  PingTask,
} from "@/lib/types";

const PALETTE = [
  "#2563b9",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#f43f5e",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

interface PingSeriesPoint {
  time: number;
  label: string;
  value: number | null;
}

interface PingTaskDisplay {
  id: number;
  name: string;
  latency: number;
  loss: number;
  color: string;
}

export function PingChart({
  uuid,
  hours,
}: {
  uuid: string;
  hours: number;
}) {
  const [data, setData] = useState<PingHistoryResponse | null>(null);
  const [metricStats, setMetricStats] = useState<PingMetricTaskStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hiddenTaskIds, setHiddenTaskIds] = useState<Set<number>>(
    () => new Set()
  );

  useEffect(() => {
    setHiddenTaskIds(new Set());
  }, [uuid]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [history, stats] = await Promise.all([
          fetchPingHistory(uuid, hours),
          fetchPingMetricStats(uuid, hours).catch(() => null),
        ]);
        if (!cancelled) {
          setData(history);
          setMetricStats(stats?.stats ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "加载失败");
          setMetricStats([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [uuid, hours]);

  const { chartData, tasks, seriesByTask } = useMemo(() => {
    const tasks: PingTask[] = data?.tasks || [];
    const records: PingRecord[] = data?.records || [];
    if (!records.length) {
      return {
        chartData: [],
        tasks,
        seriesByTask: new Map<number, PingSeriesPoint[]>(),
      };
    }

    const byTime = new Map<number, string>();
    const pointsByTask = new Map<number, PingSeriesPoint[]>();
    for (const r of records) {
      const t = new Date(r.time).getTime();
      if (!Number.isFinite(t)) continue;
      byTime.set(t, new Date(r.time).toLocaleString());
      const taskPoints = pointsByTask.get(r.task_id) || [];
      taskPoints.push({
        time: t,
        label: new Date(r.time).toLocaleString(),
        value: r.value >= 0 ? r.value : null,
      });
      pointsByTask.set(r.task_id, taskPoints);
    }

    const chartData = Array.from(byTime.entries())
      .sort(([left], [right]) => left - right)
      .map(([time, label]) => ({ time, label }));
    const seriesByTask = new Map<number, PingSeriesPoint[]>();
    for (const [taskId, points] of pointsByTask) {
      points.sort((left, right) => left.time - right.time);
      seriesByTask.set(
        taskId,
        insertTimelineGaps(
          points,
          (time) => ({ time, label: "", value: null }),
          getChartGapLimit(hours)
        )
      );
    }
    return { chartData, tasks, seriesByTask };
  }, [data, hours]);
  const timeRange = useMemo(
    () => getChartTimeRange(hours),
    [data, hours]
  );
  const taskDisplays = useMemo<PingTaskDisplay[]>(() => {
    const recordStats = new Map(
      summarizePingRecordsByTask(data?.records ?? []).map((item) => [
        item.taskId,
        item,
      ])
    );
    const exactLoss = getExactPingLossByTask(uuid, metricStats);

    return tasks.flatMap((task, index) => {
      const fallback = recordStats.get(task.id);
      // Keep the headline latency tied to the records that draw this task's
      // line. Metric stats can briefly lag or disagree after a task is added.
      if (!fallback) return [];
      const latency = fallback.latestLatency;
      const loss = exactLoss.get(task.id) ?? fallback.loss;
      if (!Number.isFinite(latency) || !Number.isFinite(loss)) return [];

      return [{
        id: task.id,
        name: task.name,
        latency: Number(latency),
        loss: Number(loss),
        color: PALETTE[index % PALETTE.length],
      }];
    });
  }, [data, metricStats, tasks, uuid]);
  const visibleTaskDisplays = taskDisplays.filter(
    (task) => !hiddenTaskIds.has(task.id)
  );

  const toggleTask = (taskId: number) => {
    setHiddenTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  if (loading) return <Loading text="加载延迟图表…" className="min-h-[20vh]" />;
  if (error) {
    return (
      <div className="glass-panel rounded-lg p-6 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!chartData.length || !tasks.length) {
    return (
      <div className="glass-panel rounded-lg p-6 text-center text-sm text-muted-foreground">
        暂无延迟数据
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="mb-3 flex flex-col gap-2 border-b border-border/60 pb-3">
        <h3 className="text-sm font-semibold">延迟监测</h3>
        {taskDisplays.length ? (
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {taskDisplays.map((task) => {
              const visible = !hiddenTaskIds.has(task.id);
              return (
                <button
                  key={task.id}
                  type="button"
                  aria-pressed={visible}
                  aria-label={`${visible ? "隐藏" : "显示"}${task.name}延迟曲线`}
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-sm px-1 py-0.5 text-left text-xs",
                    "transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    visible ? "opacity-100" : "opacity-35 hover:opacity-65"
                  )}
                  title={`${visible ? "点击隐藏" : "点击显示"} ${task.name}\n延迟 ${task.latency.toFixed(1)} ms\n丢包 ${task.loss.toFixed(1)}%`}
                  onClick={() => toggleTask(task.id)}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: task.color }}
                  />
                  <span className="min-w-0 max-w-40 truncate font-medium">
                    {task.name}
                  </span>
                  <span className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">
                    {task.latency.toFixed(1)} ms
                  </span>
                  <span className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">
                    丢包 {task.loss.toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="relative h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="time"
              type="number"
              domain={timeRange.domain}
              ticks={timeRange.ticks}
              allowDataOverflow
              interval="preserveStartEnd"
              tick={{ fontSize: 10 }}
              minTickGap={40}
              tickFormatter={(v) =>
                formatChartTimeTick(v as number, hours)
              }
            />
            <YAxis
              tick={{ fontSize: 10 }}
              width={40}
              unit="ms"
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              labelFormatter={formatChartTooltipLabel as never}
              formatter={((v: number, name: string) => [
                `${Number(v).toFixed(1)} ms`,
                name,
              ]) as never}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card-solid)",
                fontSize: 12,
              }}
            />
            {visibleTaskDisplays.map((task) => (
              <Line
                key={task.id}
                type="monotone"
                data={seriesByTask.get(task.id) || []}
                dataKey="value"
                name={task.name}
                stroke={task.color}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {taskDisplays.length > 0 && visibleTaskDisplays.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            已隐藏全部延迟任务
          </div>
        ) : null}
      </div>
    </div>
  );
}
