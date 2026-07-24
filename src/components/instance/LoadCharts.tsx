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
import { formatBytes, formatBytesPerSecond } from "@/lib/format";
import type { DisplayNode, HistoryRecord } from "@/lib/types";
import { Loading } from "@/components/Loading";

interface ChartPoint {
  time: number;
  label: string;
  cpu: number;
  ram: number;
  disk: number;
  net_in: number;
  net_out: number;
  load: number;
}

function toPoints(records: HistoryRecord[]): ChartPoint[] {
  return records
    .map((r) => {
      const t = new Date(r.time).getTime();
      return {
        time: t,
        label: new Date(r.time).toLocaleString(),
        cpu: r.cpu ?? 0,
        ram: r.ram ?? 0,
        disk: r.disk ?? 0,
        net_in: r.net_in ?? 0,
        net_out: r.net_out ?? 0,
        load: r.load ?? 0,
      };
    })
    .sort((a, b) => a.time - b.time);
}

function tickLabel(ts: number, hours: number): string {
  const d = new Date(ts);
  if (hours <= 1) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  if (hours <= 24) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "2-digit", day: "2-digit", hour: "2-digit" });
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
              client: s.client,
              time: s.time,
              cpu: s.cpu,
              ram: s.ram,
              ram_total: s.ram_total || node.mem_total,
              swap: s.swap,
              swap_total: s.swap_total || node.swap_total,
              load: s.load,
              disk: s.disk,
              disk_total: s.disk_total || node.disk_total,
              net_in: s.net_in,
              net_out: s.net_out,
              net_total_up: s.net_total_up,
              net_total_down: s.net_total_down,
              process: s.process,
              connections: s.connections,
              connections_udp: s.connections_udp,
            }))
          );
        } else {
          const data = await fetchLoadHistory(node.uuid, hours);
          if (cancelled) return;
          setRecords(data?.records || []);
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
  }, [node.uuid, node.mem_total, node.swap_total, node.disk_total, hours]);

  const data = useMemo(() => toPoints(records), [records]);

  if (loading) return <Loading text="加载负载图表…" className="min-h-[20vh]" />;
  if (error) {
    return (
      <div className="glass-panel rounded-lg p-6 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="glass-panel rounded-lg p-6 text-center text-sm text-muted-foreground">
        暂无负载数据
      </div>
    );
  }

  const last = data[data.length - 1];
  const memoryTotal =
    node.mem_total > 0
      ? node.mem_total
      : Math.max(...data.map((point) => point.ram), 1);
  const diskTotal =
    node.disk_total > 0
      ? node.disk_total
      : Math.max(...data.map((point) => point.disk), 1);
  const colors = {
    cpu: "#f43f5e",
    ram: "#0ea5a5",
    disk: "#f59e0b",
    net: "#10b981",
    load: "#3b82f6",
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
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => tickLabel(v as number, hours || 1)}
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
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => tickLabel(v as number, hours || 1)}
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
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => tickLabel(v as number, hours || 1)}
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
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => tickLabel(v as number, hours || 1)}
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
              stroke={colors.net}
              fill={colors.net}
              fillOpacity={0.12}
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="net_in"
              stroke={colors.load}
              fill={colors.load}
              fillOpacity={0.1}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
