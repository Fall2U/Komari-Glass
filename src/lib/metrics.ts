import { calcAssetTotals } from "./billing";
import type { ExchangeRates } from "./exchange-rates";
import type {
  AssetCurrency,
  DisplayNode,
  LiveStatus,
  LiveStatusMap,
  NodeData,
  TrafficLimitType,
} from "./types";
import { clampPercent, safeDiv } from "./format";

export function getTrafficUsed(
  up: number,
  down: number,
  limitType: TrafficLimitType | string = "max"
): number {
  switch (limitType) {
    case "sum":
      return up + down;
    case "min":
      return Math.min(up, down);
    case "up":
      return up;
    case "down":
      return down;
    case "max":
    default:
      return Math.max(up, down);
  }
}

export function getTrafficUsedPercentage(node: DisplayNode): number {
  if (!node.traffic_limit || node.traffic_limit <= 0) return 0;
  const used = getTrafficUsed(
    node.net_total_up,
    node.net_total_down,
    node.traffic_limit_type
  );
  return clampPercent(safeDiv(used, node.traffic_limit));
}

export function hasTrafficLimit(node: Pick<NodeData, "traffic_limit">): boolean {
  return (node.traffic_limit || 0) > 0;
}

function mergeNode(
  node: NodeData,
  live?: LiveStatus
): DisplayNode {
  return {
    ...node,
    online: live?.online ?? false,
    cpu: live?.cpu ?? 0,
    ram: live?.ram ?? 0,
    disk: live?.disk ?? 0,
    load: live?.load ?? 0,
    load5: live?.load5 ?? 0,
    load15: live?.load15 ?? 0,
    net_in: live?.net_in ?? 0,
    net_out: live?.net_out ?? 0,
    net_total_up: live?.net_total_up ?? 0,
    net_total_down: live?.net_total_down ?? 0,
    uptime: live?.uptime ?? 0,
    process: live?.process ?? 0,
    connections: live?.connections ?? 0,
    connections_udp: live?.connections_udp ?? 0,
    message: live?.message,
    updated_at_live: live?.time,
  };
}

export function mergeNodes(
  nodes: NodeData[],
  liveMap: LiveStatusMap | null
): DisplayNode[] {
  return nodes.map((n) => mergeNode(n, liveMap?.[n.uuid]));
}

export function calcOverview(
  nodes: DisplayNode[],
  assetCurrency: AssetCurrency = "CNY",
  exchangeRates?: ExchangeRates
) {
  let online = 0;
  let trafficUp = 0;
  let trafficDown = 0;
  let speedUp = 0;
  let speedDown = 0;

  for (const n of nodes) {
    trafficUp += n.net_total_up || 0;
    trafficDown += n.net_total_down || 0;
    if (n.online) {
      online += 1;
      speedUp += n.net_out || 0;
      speedDown += n.net_in || 0;
    }
  }

  const assets = calcAssetTotals(nodes, assetCurrency, exchangeRates);

  return {
    online,
    total: nodes.length,
    offline: nodes.length - online,
    trafficUp,
    trafficDown,
    trafficTotal: trafficUp + trafficDown,
    speedUp,
    speedDown,
    /** 总价值（付费节点 price 合计，主币种） */
    totalValue: assets.totalValue,
    /** 剩余价值 */
    remainingValue: assets.remainingValue,
    currency: assets.currency,
    paidCount: assets.paidCount,
  };
}

export type MetricStatus = "success" | "info" | "warning" | "error";

export function getStatus(percent: number): MetricStatus {
  if (percent >= 80) return "error";
  if (percent >= 60) return "warning";
  return "success";
}

export function getTrafficStatus(percent: number): MetricStatus {
  if (percent >= 95) return "error";
  if (percent >= 80) return "warning";
  if (percent >= 60) return "info";
  return "success";
}
