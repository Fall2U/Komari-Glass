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
import type { PingHistoryResponse, PingRecord, PingTask } from "@/lib/types";

const PALETTE = [
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#f43f5e",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

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

  const { chartData, tasks } = useMemo(() => {
    const tasks: PingTask[] = data?.tasks || [];
    const records: PingRecord[] = data?.records || [];
    if (!records.length) return { chartData: [], tasks };

    // group by timestamp
    const byTime = new Map<number, Record<string, number | string>>();
    for (const r of records) {
      const t = new Date(r.time).getTime();
      const row = byTime.get(t) || {
        time: t,
        label: new Date(r.time).toLocaleString(),
      };
      row[`t_${r.task_id}`] = r.value;
      byTime.set(t, row);
    }

    const chartData = Array.from(byTime.values()).sort(
      (a, b) => (a.time as number) - (b.time as number)
    );
    return { chartData, tasks };
  }, [data]);

  if (loading) return <Loading text="加载延迟图表…" className="min-h-[20vh]" />;
  if (error) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!chartData.length || !tasks.length) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center text-sm text-muted-foreground">
        暂无延迟数据
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-4">
      <h3 className="mb-3 text-sm font-semibold">延迟监测</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{ fontSize: 10 }}
              minTickGap={40}
              tickFormatter={(v) =>
                new Date(v as number).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
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
              formatter={((v: number, name: string) => {
                const task = tasks.find((t) => `t_${t.id}` === name);
                return [`${Number(v).toFixed(1)} ms`, task?.name || name];
              }) as never}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                fontSize: 12,
              }}
            />
            <Legend
              formatter={(value) => {
                const task = tasks.find((t) => `t_${t.id}` === value);
                return task?.name || String(value);
              }}
            />
            {tasks.map((task, i) => (
              <Line
                key={task.id}
                type="monotone"
                dataKey={`t_${task.id}`}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
