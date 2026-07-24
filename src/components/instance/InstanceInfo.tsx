"use client";

import {
  formatBytes,
  formatBytesPerSecond,
  formatUptime,
} from "@/lib/format";
import {
  getTrafficUsedPercentage,
  hasTrafficLimit,
} from "@/lib/metrics";
import type { DisplayNode } from "@/lib/types";

function Item({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-0.5 text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium break-all">{value}</div>
    </div>
  );
}

export function InstanceInfo({ node }: { node: DisplayNode }) {
  const trafficPct = getTrafficUsedPercentage(node);
  const limited = hasTrafficLimit(node);

  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-5">
      <h2 className="mb-4 text-base font-semibold">实例信息</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <Item
          className="col-span-2"
          label="CPU"
          value={`${node.cpu_name || "—"} (x${node.cpu_cores || 0})`}
        />
        <Item label="架构" value={node.arch || "—"} />
        <Item label="虚拟化" value={node.virtualization || "—"} />
        <Item
          label="GPU"
          value={
            !node.gpu_name || node.gpu_name === "None"
              ? "—"
              : node.gpu_name
          }
        />
        <Item label="系统" value={node.os || "—"} />
        <Item
          label="内存"
          value={
            node.online
              ? `${formatBytes(node.ram)} / ${formatBytes(node.mem_total)}`
              : `— / ${formatBytes(node.mem_total)}`
          }
        />
        <Item
          label="Swap"
          value={
            node.swap_total === 0
              ? "未启用"
              : node.online
                ? `${formatBytes(node.swap)} / ${formatBytes(node.swap_total)}`
                : `— / ${formatBytes(node.swap_total)}`
          }
        />
        <Item
          label="硬盘"
          value={
            node.online
              ? `${formatBytes(node.disk)} / ${formatBytes(node.disk_total)}`
              : `— / ${formatBytes(node.disk_total)}`
          }
        />
        <Item
          label="实时网络"
          value={
            node.online
              ? `↑ ${formatBytesPerSecond(node.net_out)}  ↓ ${formatBytesPerSecond(node.net_in)}`
              : "—"
          }
        />
        <Item
          label="累计流量"
          value={
            <div>
              <p>
                {node.online
                  ? `↑ ${formatBytes(node.net_total_up)}  ↓ ${formatBytes(node.net_total_down)}`
                  : "—"}
              </p>
              <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                {limited
                  ? `限额 ${formatBytes(node.traffic_limit)}（${trafficPct.toFixed(1)}%）`
                  : "无限额"}
              </p>
            </div>
          }
        />
        <Item
          label="负载"
          value={
            node.online
              ? `${node.load.toFixed(2)} | ${node.load5.toFixed(2)} | ${node.load15.toFixed(2)}`
              : "—"
          }
        />
        <Item
          label="运行时间"
          value={node.online ? formatUptime(node.uptime) : "—"}
        />
        <Item
          label="进程 / 连接"
          value={
            node.online
              ? `${node.process} / TCP ${node.connections} · UDP ${node.connections_udp}`
              : "—"
          }
        />
        <Item
          label="更新时间"
          value={
            node.updated_at_live
              ? new Date(node.updated_at_live).toLocaleString()
              : "—"
          }
        />
        {node.public_remark ? (
          <Item
            className="col-span-2 md:col-span-3 lg:col-span-4"
            label="备注"
            value={node.public_remark}
          />
        ) : null}
      </div>
    </section>
  );
}
