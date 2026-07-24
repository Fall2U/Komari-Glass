import type { LiveStatus, NodeStats } from "./types";

export function convertNodeStatsToLiveStatus(
  stats: NodeStats,
  isOnline: boolean
): LiveStatus {
  return {
    time: stats.updated_at,
    cpu: stats.cpu.usage,
    ram: stats.ram.used,
    load: stats.load.load1,
    load5: stats.load.load5,
    load15: stats.load.load15,
    disk: stats.disk.used,
    net_in: stats.network.down,
    net_out: stats.network.up,
    net_total_up: stats.network.totalUp,
    net_total_down: stats.network.totalDown,
    process: stats.process,
    connections: stats.connections.tcp,
    connections_udp: stats.connections.udp,
    online: isOnline,
    uptime: stats.uptime,
    message: stats.message,
  };
}
