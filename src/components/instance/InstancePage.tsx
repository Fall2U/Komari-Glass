"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  RadioTower,
} from "lucide-react";
import { Flag } from "@/components/Flag";
import { InstanceInfo } from "@/components/instance/InstanceInfo";
import { LoadCharts } from "@/components/instance/LoadCharts";
import { PingChart } from "@/components/instance/PingChart";
import { Loading } from "@/components/Loading";
import { useApp } from "@/contexts/AppProvider";
import { cn } from "@/lib/cn";
import { getOSImage, getOSName } from "@/lib/os";
import { getRegionDisplayName } from "@/lib/region";
import { getTagToneClass, parseNodeTags } from "@/lib/tags";

const LOAD_RANGES = [
  { label: "实时", hours: 0 },
  { label: "1 小时", hours: 1 },
  { label: "4 小时", hours: 4 },
  { label: "1 天", hours: 24 },
  { label: "7 天", hours: 168 },
  { label: "30 天", hours: 720 },
];

export function InstancePage({ uuid }: { uuid: string }) {
  const { nodes, loading, metricRetention, goHome } = useApp();
  const node = useMemo(
    () => nodes.find((item) => item.uuid === uuid) || null,
    [nodes, uuid]
  );
  const [chartType, setChartType] = useState<"load" | "ping">("load");
  const [loadHours, setLoadHours] = useState(0);
  const [pingHours, setPingHours] = useState(1);

  const maxLoad = metricRetention.loadHours;
  const maxPing = metricRetention.pingHours;
  const pingEnabled = maxPing >= 1;
  const loadRanges = LOAD_RANGES.filter(
    (range) => range.hours === 0 || range.hours <= maxLoad
  );
  const pingRanges = LOAD_RANGES.filter(
    (range) => range.hours > 0 && range.hours <= maxPing
  );

  useEffect(() => {
    if (!pingEnabled && chartType === "ping") setChartType("load");
  }, [chartType, pingEnabled]);

  if (loading && !node) return <Loading text="加载节点..." />;

  if (!node) {
    return (
      <div className="glass-panel mx-auto max-w-md rounded-lg p-8 text-center">
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

  const tags = parseNodeTags(node.tags);

  return (
    <div className="space-y-3.5">
      <section className="glass-panel rounded-lg px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={goHome}
            className="icon-btn -ml-1 shrink-0"
            aria-label="返回首页"
            title="返回首页"
          >
            <ArrowLeft className="size-[18px]" />
          </button>
          <Flag region={node.region} size={24} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-lg font-semibold sm:text-xl">{node.name}</h1>
              <span
                className={cn(
                  "chip-pill shrink-0",
                  node.online ? "chip-online" : "chip-offline"
                )}
              >
                {node.online ? "在线" : "离线"}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getOSImage(node.os)}
                alt={getOSName(node.os)}
                className="size-3.5 shrink-0 object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <span className="truncate">
                {getRegionDisplayName(node.region) || node.region || "未知地区"}
                {node.group ? ` · ${node.group}` : ""}
              </span>
            </div>
          </div>
          {tags.length > 0 ? (
            <div className="hidden max-w-[38%] items-center gap-1 overflow-hidden md:flex">
              {tags.slice(0, 4).map((tag, index) => (
                <span
                  key={`${tag.text}-${index}`}
                  className={cn("node-tag shrink-0", getTagToneClass(tag.tone))}
                >
                  {tag.text}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <InstanceInfo node={node} />

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="segmented-control w-fit" aria-label="图表类型">
            <button
              type="button"
              className={cn("segment-btn", chartType === "load" && "segment-btn-active")}
              onClick={() => setChartType("load")}
              aria-pressed={chartType === "load"}
            >
              <Activity className="size-3.5" />
              负载
            </button>
            {pingEnabled ? (
              <button
                type="button"
                className={cn("segment-btn", chartType === "ping" && "segment-btn-active")}
                onClick={() => setChartType("ping")}
                aria-pressed={chartType === "ping"}
              >
                <RadioTower className="size-3.5" />
                延迟
              </button>
            ) : null}
          </div>

          <div className="segmented-control max-w-full overflow-x-auto" aria-label="时间范围">
            {(chartType === "load" ? loadRanges : pingRanges).map((range) => {
              const active =
                chartType === "load"
                  ? loadHours === range.hours
                  : pingHours === range.hours;
              return (
                <button
                  key={range.hours}
                  type="button"
                  className={cn("segment-btn", active && "segment-btn-active")}
                  onClick={() =>
                    chartType === "load"
                      ? setLoadHours(range.hours)
                      : setPingHours(range.hours)
                  }
                  aria-pressed={active}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {chartType === "load" ? (
            <LoadCharts node={node} hours={loadHours} />
          ) : (
            <PingChart uuid={node.uuid} hours={pingHours} />
          )}
        </div>
      </section>
    </div>
  );
}
