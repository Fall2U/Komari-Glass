"use client";

import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Coins,
} from "lucide-react";
import { Flag } from "@/components/Flag";
import { ProgressBar } from "@/components/ProgressBar";
import { useNodePingStats } from "@/hooks/useNodePingStats";
import {
  formatCurrencyValue,
  formatPriceWithCycle,
  getDaysUntilExpired,
  getExpireStatus,
  getRemainingValue,
  isPaidPrice,
} from "@/lib/billing";
import { cn } from "@/lib/cn";
import {
  formatBytes,
  formatBytesPerSecond,
  getUptimeDays,
  safeDiv,
} from "@/lib/format";
import {
  getStatus,
  getTrafficUsed,
  getTrafficUsedPercentage,
  hasTrafficLimit,
} from "@/lib/metrics";
import { getOSImage, getOSName } from "@/lib/os";
import type { DisplayNode } from "@/lib/types";

/**
 * Layout carefully mirrors komari-theme-Glassmorphism NodeCard:
 * header (dot + name | os + flag)
 * content gap-3: chips (-mt-1) → 2x2 metrics → 3 col chips → ping panels
 */
export function NodeCard({
  node,
  onClick,
}: {
  node: DisplayNode;
  onClick: () => void;
}) {
  const memPct = safeDiv(node.ram, node.mem_total);
  const diskPct = safeDiv(node.disk, node.disk_total);
  const trafficPct = getTrafficUsedPercentage(node);
  const trafficUsed = getTrafficUsed(
    node.net_total_up,
    node.net_total_down,
    node.traffic_limit_type
  );
  const limited = hasTrafficLimit(node);
  const uptimeDays = getUptimeDays(node.uptime);

  const paid = isPaidPrice(node.price);
  const priceText = paid
    ? formatPriceWithCycle(node.price, node.billing_cycle, node.currency || "¥")
    : node.price === -1 || node.price === 0
      ? "免费"
      : "";

  const expireStatus = getExpireStatus(node.expired_at);
  const remainingDays = getDaysUntilExpired(node.expired_at);
  const remainingValue = paid
    ? getRemainingValue(node.price, node.billing_cycle, node.expired_at)
    : 0;

  const remainingLines = paid
    ? [
        expireStatus === "expired"
          ? { icon: "calendar" as const, text: "已过期" }
          : expireStatus === "long_term"
            ? { icon: "calendar" as const, text: "长期" }
            : expireStatus === "unknown"
              ? null
              : {
                  icon: "calendar" as const,
                  prefix: "剩余",
                  value: String(remainingDays),
                  unit: "天",
                },
        {
          icon: "coins" as const,
          text: formatCurrencyValue(remainingValue, node.currency || "¥"),
        },
      ].filter(Boolean)
    : null;

  const ping = useNodePingStats(node.uuid, node.online, 1);

  const trafficValueClass =
    !limited
      ? "text-muted-foreground"
      : trafficPct >= 95
        ? "text-destructive"
        : trafficPct >= 60
          ? "text-warning"
          : "text-success";

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={`查看节点 ${node.name} 详情`}
      className={cn(
        "node-card glass-panel group flex w-full cursor-pointer flex-col rounded-xl",
        "shadow-[0_0_0_3px] shadow-transparent transition-all duration-200",
        "hover:shadow-primary/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        !node.online && "!shadow-destructive/30 opacity-90"
      )}
    >
      {/* Header: online + name | OS + flag
          Avoid leading-none / overflow clipping — name tops were cut off. */}
      <div className="node-card-header flex min-h-12 shrink-0 items-center gap-2 border-b border-border/50 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative size-2.5 shrink-0">
            <span
              className={cn(
                "block size-2.5 rounded-full",
                node.online ? "bg-success" : "bg-destructive"
              )}
            />
            {node.online ? (
              <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-success opacity-60" />
            ) : null}
          </div>
          <h3 className="node-card-title min-w-0 flex-1 truncate text-sm font-bold leading-5">
            {node.name}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 self-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getOSImage(node.os)}
            alt={getOSName(node.os)}
            className="size-4"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <Flag region={node.region} size={20} />
        </div>
      </div>

      {/* Body: tight under header without negative margin (which overlapped the name) */}
      <div className="relative flex flex-col gap-3 px-4 pb-4 pt-2.5">
        {/* 在线天数 + 价格 */}
        <div className="relative flex h-5 items-center gap-1.5 overflow-hidden">
          <span className="chip-pill shrink-0">
            {node.online ? `在线 ${uptimeDays} 天` : "离线"}
          </span>
          {priceText ? (
            <span className="chip-pill min-w-0 truncate">{priceText}</span>
          ) : null}
        </div>

        {/* CPU / 内存 / 硬盘 / 流量 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <Metric
            label="CPU"
            value={`${(node.cpu ?? 0).toFixed(1)}%`}
            percent={node.cpu}
            sub={`${(node.load ?? 0).toFixed(2)}, ${(node.load5 ?? 0).toFixed(2)}, ${(node.load15 ?? 0).toFixed(2)}`}
          />
          <Metric
            label="内存"
            value={`${memPct.toFixed(1)}%`}
            percent={memPct}
            sub={`${formatBytes(node.ram)} / ${formatBytes(node.mem_total)}`}
          />
          <Metric
            label="硬盘"
            value={`${diskPct.toFixed(1)}%`}
            percent={diskPct}
            sub={`${formatBytes(node.disk)} / ${formatBytes(node.disk_total)}`}
          />
          <Metric
            label="流量"
            value={limited ? `${trafficPct.toFixed(1)}%` : "∞"}
            percent={limited ? trafficPct : 0}
            valueClass={trafficValueClass}
            sub={
              limited
                ? `${formatBytes(trafficUsed)} / ${formatBytes(node.traffic_limit)}`
                : `${formatBytes(trafficUsed)} / ∞`
            }
            subClass={
              trafficPct >= 95 && limited
                ? "text-destructive"
                : "text-muted-foreground"
            }
            forceStatus={limited ? undefined : "success"}
          />
        </div>

        {/* 三列：网速 / 总流量 / 剩余 — Glass: rounded-lg bg-slate-500/5 px-1.5 py-1.5 */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="metric-box">
            <div className="flex items-center gap-1 text-[11px] text-success">
              <ChevronUp className="size-[11px] shrink-0" strokeWidth={2.5} />
              <span className="min-w-0 truncate tabular-nums">
                {formatBytesPerSecond(node.net_out)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
              <ChevronDown className="size-[11px] shrink-0" strokeWidth={2.5} />
              <span className="min-w-0 truncate tabular-nums">
                {formatBytesPerSecond(node.net_in)}
              </span>
            </div>
          </div>

          <div className="metric-box">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ArrowUp className="size-[11px] shrink-0" strokeWidth={2.5} />
              <span className="min-w-0 truncate tabular-nums">
                {formatBytes(node.net_total_up)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ArrowDown className="size-[11px] shrink-0" strokeWidth={2.5} />
              <span className="min-w-0 truncate tabular-nums">
                {formatBytes(node.net_total_down)}
              </span>
            </div>
          </div>

          <div className="metric-box">
            {remainingLines && remainingLines.length > 0 ? (
              remainingLines.map((item, i) =>
                item ? (
                  <div
                    key={i}
                    className="flex items-center gap-0.5 text-[11px] text-muted-foreground"
                  >
                    {item.icon === "calendar" ? (
                      <CalendarDays
                        className="size-[11px] shrink-0"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Coins
                        className="size-[11px] shrink-0"
                        strokeWidth={2.5}
                      />
                    )}
                    {"text" in item && item.text ? (
                      <span className="min-w-0 truncate">{item.text}</span>
                    ) : (
                      <>
                        {"prefix" in item && item.prefix ? (
                          <span className="shrink-0">{item.prefix}</span>
                        ) : null}
                        {"value" in item && item.value ? (
                          <span className="shrink-0 tabular-nums">
                            {item.value}
                          </span>
                        ) : null}
                        {"unit" in item && item.unit ? (
                          <span className="shrink-0">{item.unit}</span>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null
              )
            ) : (
              <>
                <div className="truncate text-[11px] text-muted-foreground">
                  {(node.load ?? 0).toFixed(2)}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {(node.load5 ?? 0).toFixed(2)} /{" "}
                  {(node.load15 ?? 0).toFixed(2)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 延迟 + 丢包 — Glass: h-11, gap-1.5 p-2, rounded-lg bg-slate-500/5 */}
        <div className="grid grid-cols-2 gap-1.5">
          <PingPanel
            label="延迟"
            value={ping.latencyDisplay}
            bars={ping.latencyBars}
            dimmed={!node.online}
          />
          <PingPanel
            label="丢包"
            value={ping.lossDisplay}
            bars={ping.lossBars}
            dimmed={!node.online}
          />
        </div>
      </div>
    </article>
  );
}

function PingPanel({
  label,
  value,
  bars,
  dimmed,
}: {
  label: string;
  value: string;
  bars: Array<{ key: string; className: string; tooltip: string }>;
  dimmed?: boolean;
}) {
  return (
    <div
      className={cn(
        "metric-box metric-box-ping relative flex h-11 flex-col gap-1.5 p-2",
        dimmed && "opacity-50 blur-[0.5px]"
      )}
      title={`${label} ${value}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between text-[11px] leading-none">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div
        className="grid h-full min-h-0 flex-1 items-end gap-px opacity-80"
        style={{
          gridTemplateColumns: `repeat(${Math.max(bars.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {bars.map((bar) => (
          <span
            key={bar.key}
            title={bar.tooltip}
            className={cn(
              "block h-full min-h-[3px] w-full rounded-[1px]",
              bar.className
            )}
          />
        ))}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  percent,
  sub,
  valueClass,
  subClass,
  forceStatus,
}: {
  label: string;
  value: string;
  percent: number;
  sub: string;
  valueClass?: string;
  subClass?: string;
  forceStatus?: ReturnType<typeof getStatus>;
}) {
  const status = forceStatus ?? getStatus(percent);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium tabular-nums", valueClass)}>
          {value}
        </span>
      </div>
      <ProgressBar percentage={percent} status={status} height={4} />
      <div
        className={cn(
          "truncate text-[11px]",
          subClass || "text-muted-foreground"
        )}
      >
        {sub}
      </div>
    </div>
  );
}
