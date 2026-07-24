import { convertNodeStatsToLiveStatus } from "./converters";
import type {
  ApiResponse,
  HistoryRecord,
  LiveStatus,
  Me,
  NodeData,
  NodeStats,
  PingHistoryResponse,
  PublicInfo,
} from "./types";

async function getJson<T>(endpoint: string): Promise<T> {
  const res = await fetch(endpoint, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`请求失败 (${res.status})`);
  }
  const payload = (await res.json()) as ApiResponse<T>;
  if (payload.status !== "success") {
    throw new Error(payload.message || "接口返回错误");
  }
  return payload.data;
}

export async function fetchPublicInfo(): Promise<PublicInfo | null> {
  return getJson<PublicInfo>("/api/public");
}

export async function fetchNodes(): Promise<NodeData[]> {
  const data = await getJson<NodeData[]>("/api/nodes");
  return Array.isArray(data) ? data : [];
}

export async function fetchMe(): Promise<Me | null> {
  try {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    if (!res.ok) return null;
    return (await res.json()) as Me;
  } catch {
    return null;
  }
}

export async function fetchVersion(): Promise<{
  version: string;
  hash: string;
}> {
  try {
    return await getJson<{ version: string; hash: string }>("/api/version");
  } catch {
    return { version: "unknown", hash: "unknown" };
  }
}

export async function fetchRecentStats(uuid: string): Promise<LiveStatus[]> {
  const data = await getJson<NodeStats[]>(`/api/recent/${uuid}`);
  if (!Array.isArray(data)) return [];
  return data.map((s) => convertNodeStatsToLiveStatus(s, uuid, true));
}

export async function fetchLoadHistory(
  uuid: string,
  hours = 24
): Promise<{ count: number; records: HistoryRecord[] } | null> {
  return getJson<{ count: number; records: HistoryRecord[] }>(
    `/api/records/load?uuid=${encodeURIComponent(uuid)}&hours=${hours}`
  );
}

export async function fetchPingHistory(
  uuid: string,
  hours = 24
): Promise<PingHistoryResponse | null> {
  return getJson<PingHistoryResponse>(
    `/api/records/ping?uuid=${encodeURIComponent(uuid)}&hours=${hours}`
  );
}
