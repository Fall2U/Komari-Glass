import type { LiveStatus, NodeStats } from "./types";

export function convertNodeStatsToLiveStatus(
  stats: NodeStats,
  clientUuid: string,
  isOnline: boolean
): LiveStatus {
  return {
    client: clientUuid,
    time: stats.updated_at,
    cpu: stats.cpu?.usage ?? 0,
    gpu: stats.gpu?.average_usage ?? 0,
    ram: stats.ram?.used ?? 0,
    ram_total: stats.ram?.total ?? 0,
    swap: stats.swap?.used ?? 0,
    swap_total: stats.swap?.total ?? 0,
    load: stats.load?.load1 ?? 0,
    load5: stats.load?.load5 ?? 0,
    load15: stats.load?.load15 ?? 0,
    temp: 0,
    disk: stats.disk?.used ?? 0,
    disk_total: stats.disk?.total ?? 0,
    net_in: stats.network?.down ?? 0,
    net_out: stats.network?.up ?? 0,
    net_total_up: stats.network?.totalUp ?? 0,
    net_total_down: stats.network?.totalDown ?? 0,
    process: stats.process ?? 0,
    connections: stats.connections?.tcp ?? 0,
    connections_udp: stats.connections?.udp ?? 0,
    online: isOnline,
    uptime: stats.uptime ?? 0,
    message: stats.message,
  };
}
