"use client";

import {
  Activity,
  ArrowDown,
  ArrowUp,
  Coins,
  HardDrive,
  Server,
} from "lucide-react";
import { useApp } from "@/contexts/AppProvider";
import { formatCurrencyValue } from "@/lib/billing";
import { cn } from "@/lib/cn";
import {
  formatBytes,
  formatBytesPerSecond,
  formatBytesSplit,
} from "@/lib/format";

function StatCard({
  icon,
  label,
  children,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass-panel rounded-2xl p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function StatsBar() {
  const { overview, settings, loading } = useApp();

  if (!settings.showStatsBar) return null;

  const cards: React.ReactNode[] = [];

  if (settings.showOnline) {
    cards.push(
      <StatCard key="online" icon={<Server className="size-4" />} label="在线">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tabular-nums tracking-tight text-success">
            {loading ? "—" : overview.online}
          </span>
          <span className="mb-1 text-sm text-muted-foreground">
            / {loading ? "—" : overview.total} 台
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          离线 {loading ? "—" : overview.offline} 台
        </div>
      </StatCard>
    );
  }

  if (settings.showAssets) {
    cards.push(
      <StatCard key="assets" icon={<Coins className="size-4" />} label="资产">
        <div className="flex items-end gap-1.5">
          <span className="text-3xl font-bold tabular-nums tracking-tight">
            {loading
              ? "—"
              : formatCurrencyValue(overview.totalValue, overview.currency)}
          </span>
        </div>
        <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span>总价值</span>
            <span className="font-medium tabular-nums text-foreground">
              {loading
                ? "—"
                : formatCurrencyValue(overview.totalValue, overview.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>剩余价值</span>
            <span className="font-medium tabular-nums text-success">
              {loading
                ? "—"
                : formatCurrencyValue(
                    overview.remainingValue,
                    overview.currency
                  )}
            </span>
          </div>
          {!loading && overview.paidCount === 0 ? (
            <div className="pt-0.5 text-[11px] opacity-70">暂无付费节点</div>
          ) : null}
        </div>
      </StatCard>
    );
  }

  if (settings.showTraffic) {
    const total = formatBytesSplit(overview.trafficTotal);
    cards.push(
      <StatCard
        key="traffic"
        icon={<HardDrive className="size-4" />}
        label="累计流量"
      >
        <div className="flex items-end gap-1.5">
          <span className="text-3xl font-bold tabular-nums tracking-tight">
            {loading ? "—" : total.value}
          </span>
          <span className="mb-1 text-sm font-medium text-muted-foreground">
            {total.unit}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ArrowUp className="size-3 text-success" />
            {loading ? "—" : formatBytes(overview.trafficUp)}
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowDown className="size-3 text-info" />
            {loading ? "—" : formatBytes(overview.trafficDown)}
          </span>
        </div>
      </StatCard>
    );
  }

  if (settings.showSpeed) {
    cards.push(
      <StatCard
        key="speed"
        icon={<Activity className="size-4" />}
        label="实时网速"
      >
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUp className="size-3 text-success" />
              上行
            </span>
            <span className="text-base font-semibold tabular-nums text-success sm:text-lg">
              {loading ? "—" : formatBytesPerSecond(overview.speedUp)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowDown className="size-3 text-info" />
              下行
            </span>
            <span className="text-base font-semibold tabular-nums text-info sm:text-lg">
              {loading ? "—" : formatBytesPerSecond(overview.speedDown)}
            </span>
          </div>
        </div>
      </StatCard>
    );
  }

  if (cards.length === 0) return null;

  return (
    <section
      className={cn(
        "grid gap-3 sm:gap-4",
        cards.length === 1 && "grid-cols-1",
        cards.length === 2 && "grid-cols-1 sm:grid-cols-2",
        cards.length === 3 && "grid-cols-1 sm:grid-cols-3",
        cards.length >= 4 && "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
      )}
    >
      {cards}
    </section>
  );
}
