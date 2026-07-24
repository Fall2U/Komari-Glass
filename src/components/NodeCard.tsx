"use client";

import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Coins,
  Download,
  Upload,
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
  getTrafficStatus,
  getTrafficUsed,
  getTrafficUsedPercentage,
  hasTrafficLimit,
} from "@/lib/metrics";
import { getOSImage, getOSName } from "@/lib/os";
import { parseNodeTags } from "@/lib/tags";
import type { DisplayNode } from "@/lib/types";

export function NodeCard({
  node,
  pingEnabled,
  onClick,
}: {
  node: DisplayNode;
  pingEnabled: boolean;
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
  const tags = parseNodeTags(node.tags);
  const ping = useNodePingStats(node.uuid, pingEnabled, 1);
  const offlineTime = formatOfflineTime(node.updated_at_live || node.updated_at);
  const trafficValueClassName = limited
    ? trafficPct >= 95
      ? "text-destructive"
      : trafficPct >= 60
        ? "text-warning"
        : "text-success"
    : "text-muted-foreground";

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
        "node-card glass-panel relative flex w-full min-w-0 self-start cursor-pointer flex-col overflow-hidden rounded-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        !node.online && "node-card-offline"
      )}
    >
      <header className="node-card-header flex min-h-11 shrink-0 items-center gap-2 px-4 py-3">
        <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
          <span
            className={cn(
              "absolute inset-0 rounded-full",
              node.online ? "bg-success" : "bg-destructive"
            )}
          />
          {node.online ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-45" />
          ) : (
            <span className="absolute inset-0 animate-ping rounded-full bg-destructive opacity-45" />
          )}
        </span>
        <h2 className="min-w-0 flex-1 truncate text-sm font-bold">
          {node.name}
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          {node.message?.trim() ? (
            <AlertTriangle
              className="size-3.5 fill-warning/20 text-warning"
              aria-label="节点消息"
            >
              <title>{node.message.trim()}</title>
            </AlertTriangle>
          ) : null}
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
        </div>
      </header>

      <div className="node-card-content relative flex flex-1 flex-col gap-3 px-4 pb-4">
        <div className="-mt-1 flex h-[19px] items-center gap-1.5 overflow-hidden">
          <span className="chip-pill shrink-0">
            在线 {getUptimeDays(node.uptime)} 天
          </span>
          {priceText ? (
            <span
              className="chip-pill ml-auto min-w-0 truncate text-right"
              title={priceText}
            >
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
            forceStatus={limited ? getTrafficStatus(trafficPct) : "success"}
            valueClassName={trafficValueClassName}
            subClassName={
              limited && trafficPct >= 95 ? "text-destructive" : undefined
            }
            muted={!node.online}
          />
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <DataPanel label="实时速率">
            <CompactLine icon={<ChevronUp />} className="text-success">
              {formatBytesPerSecond(node.net_out)}
            </CompactLine>
            <CompactLine icon={<ChevronDown />} className="text-info">
              {formatBytesPerSecond(node.net_in)}
            </CompactLine>
          </DataPanel>

          <DataPanel label="累计流量">
            <CompactLine icon={<Upload />}>
              {formatBytes(node.net_total_up)}
            </CompactLine>
            <CompactLine icon={<Download />}>
              {formatBytes(node.net_total_down)}
            </CompactLine>
          </DataPanel>

          <DataPanel label={paid ? "剩余周期" : "系统负载"}>
            {paid ? (
              <>
                <CompactLine icon={<CalendarDays />}>{remainingText}</CompactLine>
                <CompactLine icon={<Coins />}>
                  {formatCurrencyValue(remainingValue, node.currency || "¥")}
                </CompactLine>
              </>
            ) : (
              <>
                <CompactLine>{node.load.toFixed(2)}</CompactLine>
                <CompactLine>
                  {node.load5.toFixed(2)} / {node.load15.toFixed(2)}
                </CompactLine>
              </>
            )}
          </DataPanel>
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
          <div className="flex flex-wrap items-center gap-1">
            {tags.map((tag, index) => (
              <span
                key={`${tag.text}-${index}`}
                className="node-tag max-w-full truncate"
                title={tag.text}
              >
                {tag.text}
              </span>
            ))}
          </div>
        ) : null}

        {!node.online ? (
          <div className="node-offline-overlay absolute inset-0 z-20 flex flex-col items-center justify-center rounded-b-xl">
            <span className="text-sm font-semibold text-destructive">离线</span>
            <span className="mt-1 text-[11px] text-muted-foreground">
              {offlineTime}
            </span>
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
  valueClassName,
  subClassName,
  muted,
}: {
  label: string;
  value: string;
  percent: number;
  sub: string;
  forceStatus?: ReturnType<typeof getStatus>;
  valueClassName?: string;
  subClassName?: string;
  muted?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", muted && "opacity-55")}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium tabular-nums", valueClassName)}>
          {value}
        </span>
      </div>
      <ProgressBar
        percentage={percent}
        status={forceStatus ?? getStatus(percent)}
        height={4}
        duration={300}
      />
      <span
        className={cn(
          "truncate text-[11px] tabular-nums text-muted-foreground",
          subClassName
        )}
      >
        {sub}
      </span>
    </div>
  );
}

function DataPanel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      className="node-data-panel"
      title={label}
      aria-label={label}
    >
      {children}
    </div>
  );
}

function CompactLine({
  icon,
  children,
  className,
}: {
  icon?: React.ReactElement<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground",
        className
      )}
    >
      {icon ? (
        <span className="flex size-2.5 shrink-0 items-center justify-center [&>svg]:size-2.5">
          {icon}
        </span>
      ) : null}
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
    <div
      className={cn(
        "node-data-panel group/ping-panel h-11 gap-1.5 !overflow-visible p-1.5",
        dimmed && "blur-xs opacity-50"
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[11px] leading-none">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div
        className="grid min-h-0 flex-1 items-end gap-px opacity-85 transition-opacity duration-150 group-hover/ping-panel:opacity-100"
        style={{
          gridTemplateColumns: `repeat(${Math.max(bars.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {bars.map((bar, index) => (
          <span
            key={bar.key}
            className="group/ping-bar relative block h-full min-w-0 hover:z-20"
          >
            <span
              className={cn(
                "block h-full min-h-[3px] w-full origin-bottom rounded-[1px]",
                "transition-[transform,opacity] duration-150",
                "group-hover/ping-panel:opacity-60 group-hover/ping-bar:scale-y-[1.6] group-hover/ping-bar:!opacity-100",
                bar.className
              )}
            />
            <span
              role="tooltip"
              className={cn(
                "pointer-events-none absolute bottom-[calc(100%+0.4rem)] z-20 w-max max-w-32",
                "invisible translate-y-0.5 whitespace-pre-line rounded-sm bg-foreground/90 px-1.5 py-1",
                "text-[10px] leading-tight text-background opacity-0 shadow-lg",
                "transition-[opacity,transform,visibility] duration-150",
                "group-hover/ping-bar:visible group-hover/ping-bar:translate-y-0 group-hover/ping-bar:opacity-100",
                bars.length === 1 || (index >= 3 && index < bars.length - 3)
                  ? "left-1/2 -translate-x-1/2"
                  : index < 3
                    ? "left-0"
                    : "right-0"
              )}
            >
              {bar.tooltip}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function formatOfflineTime(value?: string): string {
  if (!value) return "暂无更新时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无更新时间";

  return `最后更新 ${new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)}`;
}
