import { convertNodeStatsToLiveStatus } from "./converters";
import type {
  HistoryRecord,
  LiveStatus,
  MetricDefinition,
  MetricQueryResponse,
  NodeData,
  NodeStats,
  PingHistoryResponse,
  PingMetricStatsResponse,
  PublicInfo,
} from "./types";

interface RpcResponse<T> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

let requestId = 0;

async function callRpc<T>(
  method: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const id = ++requestId;
  const res = await fetch("/api/rpc2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`请求失败 (${res.status})`);
  }
  const payload = (await res.json()) as RpcResponse<T>;
  if (payload.error) {
    throw new Error(payload.error.message || `RPC 错误 (${payload.error.code})`);
  }
  if (!("result" in payload)) {
    throw new Error("RPC 返回缺少结果");
  }
  return payload.result as T;
}

export async function fetchPublicInfo(): Promise<PublicInfo> {
  return callRpc<PublicInfo>("public:getPublicSettings");
}

export async function fetchNodes(): Promise<NodeData[]> {
  const data = await callRpc<NodeData[]>("public:getNodesInformation");
  return Array.isArray(data) ? data : [];
}

export async function fetchMetricDefinitions(): Promise<MetricDefinition[]> {
  const data = await callRpc<MetricDefinition[]>("public:listMetricDefinitions");
  return Array.isArray(data) ? data : [];
}

export async function fetchRecentStats(uuid: string): Promise<LiveStatus[]> {
  const data = await callRpc<NodeStats[]>("public:getClientRecentRecords", {
    uuid,
  });
  if (!Array.isArray(data)) return [];
  return data.map((stats) => convertNodeStatsToLiveStatus(stats, true));
}

export async function fetchLoadHistory(
  uuid: string,
  hours = 24
): Promise<{ records: HistoryRecord[] }> {
  return callRpc("public:getRecordsByUUID", {
    uuid,
    hours: String(hours),
  });
}

export async function fetchPingHistory(
  uuid: string,
  hours = 24
): Promise<PingHistoryResponse> {
  return callRpc("public:getPingRecords", {
    uuid,
    hours: String(hours),
  });
}

export async function fetchPingMetricStats(
  uuid: string,
  hours = 1,
  maxPoints = 6000
): Promise<PingMetricStatsResponse> {
  return callRpc("public:getPingMetricStats", {
    entity_id: uuid,
    hours,
    max_points: maxPoints,
  });
}

export async function fetchPingMetricSeries(
  uuid: string,
  hours = 1,
  maxPoints = 6000
): Promise<MetricQueryResponse> {
  return callRpc("public:queryMetrics", {
    metric_keys: ["ping.latency_ms", "ping.loss"],
    entity_id: uuid,
    hours,
    downsample: true,
    fill_empty: true,
    max_points: maxPoints,
    aggregation: "avg",
  });
}
