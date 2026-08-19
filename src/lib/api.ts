import { convertNodeStatsToLiveStatus } from "./converters";
import type {
  HistoryRecord,
  LiveStatus,
  MetricDefinition,
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
  const data = await callRpc<{ records?: HistoryRecord[] } | null>(
    "public:getRecordsByUUID",
    {
      uuid,
      hours: String(hours),
    }
  );
  return {
    records: Array.isArray(data?.records) ? data.records : [],
  };
}

export async function fetchPingHistory(
  uuid: string,
  hours = 24
): Promise<PingHistoryResponse> {
  const data = await callRpc<Partial<PingHistoryResponse> | null>(
    "public:getPingRecords",
    {
      uuid,
      hours: String(hours),
    }
  );
  return {
    records: Array.isArray(data?.records) ? data.records : [],
    tasks: Array.isArray(data?.tasks) ? data.tasks : [],
  };
}

export async function fetchPingMetricStats(
  uuid: string,
  hours = 1,
  maxPoints = 6000
): Promise<PingMetricStatsResponse> {
  const data = await callRpc<Partial<PingMetricStatsResponse> | null>(
    "public:getPingMetricStats",
    {
      entity_id: uuid,
      hours,
      max_points: maxPoints,
    }
  );
  return {
    stats: Array.isArray(data?.stats) ? data.stats : [],
  };
}
