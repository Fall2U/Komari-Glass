"use client";

import {
  Box,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Network,
  Radio,
  ServerCog,
} from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import { cn } from "@/lib/cn";
import { formatBytes, formatBytesPerSecond, formatUptime } from "@/lib/format";
import {
  getStatus,
  getTrafficUsed,
  getTrafficUsedPercentage,
  hasTrafficLimit,
} from "@/lib/metrics";
import type { DisplayNode } from "@/lib/types";

function InfoItem({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("detail-info-item flex min-w-0 items-start gap-2 py-2.5", className)}>
      {icon ? (
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground/5 text-muted-foreground [&>svg]:size-3.5">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function InfoGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel rounded-lg p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary [&>svg]:size-4">{icon}</span>
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

export function InstanceInfo({ node }: { node: DisplayNode }) {
  const trafficPct = getTrafficUsedPercentage(node);
  const trafficUsed = getTrafficUsed(
    node.net_total_up,
    node.net_total_down,
    node.traffic_limit_type
  );
  const limited = hasTrafficLimit(node);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <InfoGroup title="硬件信息" icon={<Cpu />}>
        <InfoItem
          label="处理器"
          icon={<Cpu />}
          value={`${node.cpu_name || "--"} (x${node.cpu_cores || 0})`}
        />
        <div className="grid grid-cols-2 gap-x-4">
          <InfoItem label="架构" icon={<Box />} value={node.arch || "--"} />
          <InfoItem
            label="虚拟化"
            icon={<ServerCog />}
            value={node.virtualization || "--"}
          />
        </div>
        <InfoItem
          label="图形设备"
          icon={<Cpu />}
          value={!node.gpu_name || node.gpu_name === "None" ? "未检测到" : node.gpu_name}
        />
      </InfoGroup>

      <InfoGroup title="系统信息" icon={<ServerCog />}>
        <InfoItem label="操作系统" icon={<ServerCog />} value={node.os || "--"} />
        <InfoItem label="内核版本" icon={<Cpu />} value={node.kernel_version || "--"} />
        <div className="grid grid-cols-2 gap-x-4">
          <InfoItem
            label="运行时间"
            icon={<Radio />}
            value={node.online ? formatUptime(node.uptime) : "--"}
          />
          <InfoItem
            label="进程 / 连接"
            icon={<Network />}
            value={node.online ? `${node.process} / ${node.connections + node.connections_udp}` : "--"}
          />
        </div>
      </InfoGroup>

      <InfoGroup title="存储信息" icon={<Database />}>
        <ResourceItem
          label="内存"
          icon={<MemoryStick />}
          used={node.ram}
          total={node.mem_total}
          online={node.online}
        />
        <ResourceItem
          label="交换内存"
          icon={<MemoryStick />}
          used={node.swap}
          total={node.swap_total}
          online={node.online}
          disabledText="未启用"
        />
        <ResourceItem
          label="硬盘"
          icon={<HardDrive />}
          used={node.disk}
          total={node.disk_total}
          online={node.online}
        />
      </InfoGroup>

      <InfoGroup title="网络信息" icon={<Network />}>
        <InfoItem
          label="实时速率"
          icon={<Radio />}
          value={
            node.online ? (
              <span className="flex flex-wrap gap-x-3 gap-y-1 tabular-nums">
                <span className="text-success">↑ {formatBytesPerSecond(node.net_out)}</span>
                <span className="text-info">↓ {formatBytesPerSecond(node.net_in)}</span>
              </span>
            ) : (
              "--"
            )
          }
        />
        <InfoItem
          label="累计流量"
          icon={<Network />}
          value={
            node.online
              ? `↑ ${formatBytes(node.net_total_up)}  ↓ ${formatBytes(node.net_total_down)}`
              : "--"
          }
        />
        <InfoItem
          label="流量额度"
          icon={<Database />}
          value={
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 tabular-nums">
                <span>{formatBytes(trafficUsed)}</span>
                <span className="text-xs text-muted-foreground">
                  {limited ? formatBytes(node.traffic_limit) : "无限额"}
                </span>
              </div>
              {limited ? (
                <ProgressBar
                  percentage={trafficPct}
                  status={getStatus(trafficPct)}
                  height={4}
                />
              ) : null}
            </div>
          }
        />
      </InfoGroup>

      {node.public_remark ? (
        <section className="glass-panel rounded-lg p-4 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">公开备注</h2>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
            {node.public_remark}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function ResourceItem({
  label,
  icon,
  used,
  total,
  online,
  disabledText,
}: {
  label: string;
  icon: React.ReactNode;
  used: number;
  total: number;
  online: boolean;
  disabledText?: string;
}) {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const value =
    total <= 0 && disabledText
      ? disabledText
      : online
        ? `${formatBytes(used)} / ${formatBytes(total)}`
        : `-- / ${formatBytes(total)}`;

  return (
    <InfoItem
      label={label}
      icon={icon}
      value={
        <div className="space-y-1.5">
          <span className="tabular-nums">{value}</span>
          {total > 0 ? (
            <ProgressBar
              percentage={online ? percentage : 0}
              status={getStatus(percentage)}
              height={4}
            />
          ) : null}
        </div>
      }
    />
  );
}
