"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchLoadHistory, fetchRecentStats } from "@/lib/api";
import {
  formatChartTimeTick,
  getChartGapLimit,
  getChartTimeRange,
  insertTimelineGaps,
} from "@/lib/chart-gaps";
import { formatBytes, formatBytesPerSecond } from "@/lib/format";
import type { DisplayNode, HistoryRecord } from "@/lib/types";
import { Loading } from "@/components/Loading";

interface LoadPoint {
  time: number;
  label: string;
  cpu: number;
  ram: number;
  disk: number;
  net_in: number;
  net_out: number;
}

interface LoadGapPoint {
  time: number;
  label: string;
  cpu: null;
  ram: null;
  disk: null;
  net_in: null;
  net_out: null;
}

type ChartPoint = LoadPoint | LoadGapPoint;

function toPoints(records: HistoryRecord[]): LoadPoint[] {
  return records
    .map((r) => {
      const t = new Date(r.time).getTime();
      return {
        time: t,
        label: new Date(r.time).toLocaleString(),
        cpu: r.cpu,
        ram: r.ram,
        disk: r.disk,
        net_in: r.net_in,
        net_out: r.net_out,
      };
    })
    .filter((point) => Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);
}

function resourceTicks(total: number): number[] {
  return Array.from({ length: 5 }, (_, index) => (total * index) / 4);
}

function ChartCard({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs tabular-nums text-muted-foreground">{value}</span>
      </div>
      <div className="h-48 w-full sm:h-52">{children}</div>
    </div>
  );
}

export function LoadCharts({
  node,
  hours,
}: {
  node: DisplayNode;
  hours: number;
}) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (hours === 0) {
          const recent = await fetchRecentStats(node.uuid);
          if (cancelled) return;
          setRecords(
            recent.map((s) => ({
              time: s.time,
              cpu: s.cpu,
              ram: s.ram,
              disk: s.disk,
              net_in: s.net_in,
              net_out: s.net_out,
            }))
          );
        } else {
          const data = await fetchLoadHistory(node.uuid, hours);
          if (cancelled) return;
          setRecords(data.records);
        }
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
  }, [node.uuid, hours]);

  const samples = useMemo(() => toPoints(records), [records]);
  const timeRange = useMemo(
    () => getChartTimeRange(hours),
    [hours, records]
  );
  const data = useMemo(
    () =>
      insertTimelineGaps(
        samples,
        (time): LoadGapPoint => ({
          time,
          label: "",
          cpu: null,
          ram: null,
          disk: null,
          net_in: null,
          net_out: null,
        }),
        getChartGapLimit(hours)
      ),
    [hours, samples]
  );

  if (loading) return <Loading text="加载负载图表…" className="min-h-[20vh]" />;
  if (error) {
    return (
      <div className="glass-panel rounded-lg p-6 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (samples.length === 0) {
    return (
      <div className="glass-panel rounded-lg p-6 text-center text-sm text-muted-foreground">
        暂无负载数据
      </div>
    );
  }

  const last = samples[samples.length - 1];
  const memoryTotal = node.mem_total;
  const diskTotal = node.disk_total;
  const colors = {
    cpu: "#f43f5e",
    ram: "#0ea5a5",
    disk: "#f59e0b",
    netOut: "#10b981",
    netIn: "#3b82f6",
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <ChartCard title="CPU" value={`${last.cpu.toFixed(2)}%`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="time"
              type="number"
              domain={timeRange.domain}
              ticks={timeRange.ticks}
              allowDataOverflow={hours > 0}
              interval="preserveStartEnd"
              tickFormatter={(v) =>
                formatChartTimeTick(v as number, hours || 1)
              }
              tick={{ fontSize: 10 }}
              minTickGap={30}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={36} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={((_l: any, payload: any) =>
                (payload?.[0]?.payload as ChartPoint | undefined)?.label ||
                "") as never}
              formatter={((v: number) => [
                `${Number(v).toFixed(2)}%`,
                "CPU",
              ]) as never}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card-solid)",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="cpu"
              stroke={colors.cpu}
              fill={colors.cpu}
              fillOpacity={0.15}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="内存"
        value={`${formatBytes(last.ram)} / ${formatBytes(memoryTotal)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="time"
              type="number"
              domain={timeRange.domain}
              ticks={timeRange.ticks}
              allowDataOverflow={hours > 0}
              interval="preserveStartEnd"
              tickFormatter={(v) =>
                formatChartTimeTick(v as number, hours || 1)
              }
              tick={{ fontSize: 10 }}
              minTickGap={30}
            />
            <YAxis
              domain={[0, memoryTotal]}
              ticks={resourceTicks(memoryTotal)}
              allowDataOverflow
              tick={{ fontSize: 10 }}
              width={56}
              tickFormatter={(v) => formatBytes(v as number, 0)}
            />
            <Tooltip
              labelFormatter={((_l: any, payload: any) =>
                (payload?.[0]?.payload as ChartPoint | undefined)?.label ||
                "") as never}
              formatter={((v: number) => [
                formatBytes(Number(v)),
                "内存",
              ]) as never}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card-solid)",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="ram"
              stroke={colors.ram}
              fill={colors.ram}
              fillOpacity={0.15}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="硬盘"
        value={`${formatBytes(last.disk)} / ${formatBytes(diskTotal)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="time"
              type="number"
              domain={timeRange.domain}
              ticks={timeRange.ticks}
              allowDataOverflow={hours > 0}
              interval="preserveStartEnd"
              tickFormatter={(v) =>
                formatChartTimeTick(v as number, hours || 1)
              }
              tick={{ fontSize: 10 }}
              minTickGap={30}
            />
            <YAxis
              domain={[0, diskTotal]}
              ticks={resourceTicks(diskTotal)}
              allowDataOverflow
              tick={{ fontSize: 10 }}
              width={56}
              tickFormatter={(v) => formatBytes(v as number, 0)}
            />
            <Tooltip
              labelFormatter={((_l: any, payload: any) =>
                (payload?.[0]?.payload as ChartPoint | undefined)?.label ||
                "") as never}
              formatter={((v: number) => [
                formatBytes(Number(v)),
                "硬盘",
              ]) as never}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card-solid)",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="disk"
              stroke={colors.disk}
              fill={colors.disk}
              fillOpacity={0.15}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="网络"
        value={`↑ ${formatBytesPerSecond(last.net_out)}  ↓ ${formatBytesPerSecond(last.net_in)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="time"
              type="number"
              domain={timeRange.domain}
              ticks={timeRange.ticks}
              allowDataOverflow={hours > 0}
              interval="preserveStartEnd"
              tickFormatter={(v) =>
                formatChartTimeTick(v as number, hours || 1)
              }
              tick={{ fontSize: 10 }}
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              width={48}
              tickFormatter={(v) => formatBytes(v as number, 0)}
            />
            <Tooltip
              labelFormatter={((_l: any, payload: any) =>
                (payload?.[0]?.payload as ChartPoint | undefined)?.label ||
                "") as never}
              formatter={((v: number, name: string) => [
                formatBytesPerSecond(Number(v)),
                name === "net_out" ? "上行" : "下行",
              ]) as never}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card-solid)",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="net_out"
              stroke={colors.netOut}
              fill={colors.netOut}
              fillOpacity={0.12}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="net_in"
              stroke={colors.netIn}
              fill={colors.netIn}
              fillOpacity={0.1}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
