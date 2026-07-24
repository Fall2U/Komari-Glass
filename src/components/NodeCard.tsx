"use client";

import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  ChevronRight,
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
import { getTagToneClass, parseNodeTags } from "@/lib/tags";
import type { DisplayNode } from "@/lib/types";

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
  const paid = isPaidPrice(node.price);
  const expireStatus = getExpireStatus(node.expired_at);
  const remainingDays = getDaysUntilExpired(node.expired_at);
  const remainingValue = paid
    ? getRemainingValue(node.price, node.billing_cycle, node.expired_at)
    : 0;
  const tags = parseNodeTags(node.tags).slice(0, 4);
  const ping = useNodePingStats(node.uuid, node.online, 1);

  const priceText = paid
    ? formatPriceWithCycle(node.price, node.billing_cycle, node.currency || "¥")
    : node.price === -1
      ? "免费"
      : "";

  const remainingText = paid
    ? expireStatus === "expired"
      ? "已过期"
      : expireStatus === "long_term"
        ? "长期"
        : expireStatus === "unknown"
          ? "未设置"
          : `${remainingDays} 天`
    : "--";

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={`查看 ${node.name} 详情`}
      className={cn(
        "node-card glass-panel group flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        !node.online && "node-card-offline"
      )}
    >
      <header className="node-card-header flex h-12 shrink-0 items-center gap-2 border-b border-border/60 px-3.5">
        <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
          <span
            className={cn(
              "absolute inset-0 rounded-full",
              node.online ? "bg-success" : "bg-destructive"
            )}
          />
          {node.online ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-45" />
          ) : null}
        </span>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {node.name}
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getOSImage(node.os)}
            alt={getOSName(node.os)}
            title={getOSName(node.os)}
            className="size-4 object-contain"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <Flag region={node.region} size={19} />
          <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex h-5 items-center gap-1.5 overflow-hidden">
          <span
            className={cn(
              "chip-pill shrink-0",
              node.online ? "chip-online" : "chip-offline"
            )}
          >
            {node.online ? `在线 ${getUptimeDays(node.uptime)} 天` : "离线"}
          </span>
          {priceText ? (
            <span className="chip-pill min-w-0 truncate" title={priceText}>
              {priceText}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <Metric
            label="CPU"
            value={`${node.cpu.toFixed(1)}%`}
            percent={node.cpu}
            sub={`${node.load.toFixed(2)}, ${node.load5.toFixed(2)}, ${node.load15.toFixed(2)}`}
            muted={!node.online}
          />
          <Metric
            label="内存"
            value={`${memPct.toFixed(1)}%`}
            percent={memPct}
            sub={`${formatBytes(node.ram)} / ${formatBytes(node.mem_total)}`}
            muted={!node.online}
          />
          <Metric
            label="硬盘"
            value={`${diskPct.toFixed(1)}%`}
            percent={diskPct}
            sub={`${formatBytes(node.disk)} / ${formatBytes(node.disk_total)}`}
            muted={!node.online}
          />
          <Metric
            label="流量"
            value={limited ? `${trafficPct.toFixed(1)}%` : "∞"}
            percent={limited ? trafficPct : 0}
            sub={`${formatBytes(trafficUsed)} / ${limited ? formatBytes(node.traffic_limit) : "∞"}`}
            forceStatus={limited ? undefined : "success"}
            muted={!node.online}
          />
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <MetricBox label="实时速率">
            <CompactLine icon={<ChevronUp />} className="text-success">
              {formatBytesPerSecond(node.net_out)}
            </CompactLine>
            <CompactLine icon={<ChevronDown />} className="text-info">
              {formatBytesPerSecond(node.net_in)}
            </CompactLine>
          </MetricBox>

          <MetricBox label="累计流量">
            <CompactLine icon={<ArrowUp />}>
              {formatBytes(node.net_total_up)}
            </CompactLine>
            <CompactLine icon={<ArrowDown />}>
              {formatBytes(node.net_total_down)}
            </CompactLine>
          </MetricBox>

          <MetricBox label="剩余周期">
            <CompactLine icon={<CalendarDays />}>{remainingText}</CompactLine>
            <CompactLine icon={<Coins />}>
              {paid
                ? formatCurrencyValue(remainingValue, node.currency || "¥")
                : "--"}
            </CompactLine>
          </MetricBox>
        </div>

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

        {tags.length > 0 ? (
          <div className="flex h-5 items-center gap-1 overflow-hidden">
            {tags.map((tag, index) => (
              <span
                key={`${tag.text}-${index}`}
                className={cn("node-tag min-w-0 truncate", getTagToneClass(tag.tone))}
                title={tag.text}
              >
                {tag.text}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  percent,
  sub,
  forceStatus,
  muted,
}: {
  label: string;
  value: string;
  percent: number;
  sub: string;
  forceStatus?: ReturnType<typeof getStatus>;
  muted?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", muted && "opacity-55")}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <ProgressBar
        percentage={percent}
        status={forceStatus ?? getStatus(percent)}
        height={3}
      />
      <span className="truncate text-[10px] tabular-nums text-muted-foreground">
        {sub}
      </span>
    </div>
  );
}

function MetricBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="metric-box" title={label}>
      <span className="truncate text-[9px] text-muted-foreground/80">{label}</span>
      {children}
    </div>
  );
}

function CompactLine({
  icon,
  children,
  className,
}: {
  icon: React.ReactElement<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-0.5 text-[10px] text-muted-foreground", className)}>
      <span className="flex size-2.5 shrink-0 items-center justify-center [&>svg]:size-2.5">
        {icon}
      </span>
      <span className="truncate tabular-nums">{children}</span>
    </span>
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
    <div className={cn("metric-box h-11 gap-1.5 p-2", dimmed && "opacity-45")}>
      <div className="flex items-center justify-between gap-2 text-[10px] leading-none">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div
        className="grid min-h-0 flex-1 items-end gap-px opacity-85"
        style={{
          gridTemplateColumns: `repeat(${Math.max(bars.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {bars.map((bar) => (
          <span
            key={bar.key}
            title={bar.tooltip}
            className={cn("block h-full min-h-[3px] rounded-[1px]", bar.className)}
          />
        ))}
      </div>
    </div>
  );
}
