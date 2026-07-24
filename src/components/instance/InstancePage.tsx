"use client";

import { useMemo, useState } from "react";
import { InstanceInfo } from "@/components/instance/InstanceInfo";
import { LoadCharts } from "@/components/instance/LoadCharts";
import { PingChart } from "@/components/instance/PingChart";
import { Loading } from "@/components/Loading";
import { useApp } from "@/contexts/AppProvider";
import { cn } from "@/lib/cn";
import { Flag } from "@/components/Flag";
import { getOSImage, getOSName } from "@/lib/os";
import { getRegionDisplayName } from "@/lib/region";

const LOAD_RANGES = [
  { label: "实时", hours: 0 },
  { label: "1 小时", hours: 1 },
  { label: "4 小时", hours: 4 },
  { label: "1 天", hours: 24 },
  { label: "7 天", hours: 168 },
  { label: "30 天", hours: 720 },
];

export function InstancePage({ uuid }: { uuid: string }) {
  const { nodes, loading, publicInfo, goHome } = useApp();
  const node = useMemo(
    () => nodes.find((n) => n.uuid === uuid) || null,
    [nodes, uuid]
  );

  const [chartType, setChartType] = useState<"load" | "ping">("load");
  const [loadHours, setLoadHours] = useState(0);
  const [pingHours, setPingHours] = useState(1);

  const maxLoad = publicInfo?.record_preserve_time ?? 720;
  const maxPing = publicInfo?.ping_record_preserve_time ?? 24;
  const recordEnabled = publicInfo?.record_enabled ?? true;

  const loadRanges = LOAD_RANGES.filter((r) => r.hours <= maxLoad);
  const pingRanges = LOAD_RANGES.filter(
    (r) => r.hours > 0 && r.hours <= maxPing
  );

  if (loading && !node) {
    return <Loading text="加载节点…" />;
  }

  if (!node) {
    return (
      <div className="glass-panel mx-auto max-w-md rounded-2xl p-8 text-center">
        <p className="mb-2 text-lg font-semibold">节点不存在</p>
        <p className="mb-4 text-sm text-muted-foreground">
          该节点可能已被删除或对当前访客隐藏
        </p>
        <button type="button" className="btn-primary" onClick={goHome}>
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* title bar */}
      <section className="glass-panel rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative size-2.5 shrink-0">
            <span
              className={cn(
                "block size-2.5 rounded-full",
                node.online ? "bg-success" : "bg-destructive"
              )}
            />
            {node.online ? (
              <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-50" />
            ) : null}
          </div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {node.name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getOSImage(node.os)}
              alt={getOSName(node.os)}
              className="size-5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <Flag region={node.region} size={20} />
            <span>{getRegionDisplayName(node.region) || node.region}</span>
            {node.group ? (
              <>
                <span>·</span>
                <span>{node.group}</span>
              </>
            ) : null}
          </div>
          <span
            className={cn(
              "ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium",
              node.online
                ? "bg-success/15 text-success"
                : "bg-destructive/15 text-destructive"
            )}
          >
            {node.online ? "在线" : "离线"}
          </span>
        </div>
      </section>

      <InstanceInfo node={node} />

      {recordEnabled ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="glass-panel flex rounded-xl p-1">
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition",
                  chartType === "load"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setChartType("load")}
              >
                负载
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition",
                  chartType === "ping"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setChartType("ping")}
              >
                延迟
              </button>
            </div>

            <div className="glass-panel flex flex-wrap gap-1 rounded-xl p-1">
              {(chartType === "load" ? loadRanges : pingRanges).map((r) => {
                const active =
                  chartType === "load"
                    ? loadHours === r.hours
                    : pingHours === r.hours;
                return (
                  <button
                    key={r.hours}
                    type="button"
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs transition sm:text-sm",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() =>
                      chartType === "load"
                        ? setLoadHours(r.hours)
                        : setPingHours(r.hours)
                    }
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {chartType === "load" ? (
            <LoadCharts node={node} hours={loadHours} />
          ) : (
            <PingChart uuid={node.uuid} hours={pingHours} />
          )}
        </section>
      ) : (
        <div className="glass-panel rounded-2xl p-6 text-center text-sm text-muted-foreground">
          历史记录功能未启用
        </div>
      )}
    </div>
  );
}
