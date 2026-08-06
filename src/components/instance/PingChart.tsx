"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loading } from "@/components/Loading";
import { fetchPingHistory } from "@/lib/api";
import {
  formatChartTimeTick,
  getChartGapLimit,
  getChartTimeRange,
  insertTimelineGaps,
} from "@/lib/chart-gaps";
import type { PingHistoryResponse, PingRecord, PingTask } from "@/lib/types";

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

export function PingChart({
  uuid,
  hours,
}: {
  uuid: string;
  hours: number;
}) {
  const [data, setData] = useState<PingHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchPingHistory(uuid, hours);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "加载失败");
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
      <h3 className="mb-3 text-sm font-semibold">延迟监测</h3>
      <div className="h-72 w-full">
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
              labelFormatter={((_l: any, payload: any) =>
                (payload?.[0]?.payload as { label?: string } | undefined)
                  ?.label || "") as never}
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
            <Legend />
            {tasks.map((task, i) => (
              <Line
                key={task.id}
                type="monotone"
                data={seriesByTask.get(task.id) || []}
                dataKey="value"
                name={task.name}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
