"use client";

import {
  Box,
  Cpu,
  Network,
  Radio,
  ServerCog,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatUptime } from "@/lib/format";
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
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <InfoGroup title="硬件信息" icon={<Cpu />}>
        <div className="grid grid-cols-2 gap-x-4">
          <InfoItem
            label="处理器"
            icon={<Cpu />}
            value={`${node.cpu_name || "--"} (x${node.cpu_cores || 0})`}
          />
          <InfoItem
            label="架构"
            icon={<Box />}
            value={node.arch || "--"}
          />
          <InfoItem
            label="图形设备"
            icon={<Cpu />}
            value={
              !node.gpu_name || node.gpu_name === "None"
                ? "未检测到"
                : node.gpu_name
            }
            className="border-t border-border"
          />
          <InfoItem
            label="虚拟化"
            icon={<ServerCog />}
            value={node.virtualization || "--"}
            className="border-t border-border"
          />
        </div>
      </InfoGroup>

      <InfoGroup title="系统信息" icon={<ServerCog />}>
        <div className="grid grid-cols-2 gap-x-4">
          <InfoItem
            label="操作系统"
            icon={<ServerCog />}
            value={node.os || "--"}
          />
          <InfoItem
            label="运行时间"
            icon={<Radio />}
            value={node.online ? formatUptime(node.uptime) : "--"}
          />
          <InfoItem
            label="内核版本"
            icon={<Cpu />}
            value={node.kernel_version || "--"}
            className="border-t border-border"
          />
          <InfoItem
            label="进程 / 连接"
            icon={<Network />}
            value={
              node.online
                ? `${node.process} / ${node.connections + node.connections_udp}`
                : "--"
            }
            className="border-t border-border"
          />
        </div>
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
