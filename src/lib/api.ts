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

async function getJson<T>(endpoint: string): Promise<ApiResponse<T> | null> {
  try {
    const res = await fetch(endpoint, { credentials: "same-origin" });
    if (!res.ok) return null;
    return (await res.json()) as ApiResponse<T>;
  } catch (error) {
    console.error(`[api] GET ${endpoint} failed:`, error);
    return null;
  }
}

export async function fetchPublicInfo(): Promise<PublicInfo | null> {
  const res = await getJson<PublicInfo>("/api/public");
  return res?.status === "success" ? res.data : null;
}

export async function fetchNodes(): Promise<NodeData[]> {
  const res = await getJson<NodeData[]>("/api/nodes");
  return res?.status === "success" && Array.isArray(res.data) ? res.data : [];
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
  const res = await getJson<{ version: string; hash: string }>("/api/version");
  return res?.status === "success"
    ? res.data
    : { version: "unknown", hash: "unknown" };
}

export async function fetchRecentStats(uuid: string): Promise<LiveStatus[]> {
  const res = await getJson<NodeStats[]>(`/api/recent/${uuid}`);
  if (res?.status !== "success" || !Array.isArray(res.data)) return [];
  return res.data.map((s) => convertNodeStatsToLiveStatus(s, uuid, true));
}

export async function fetchLoadHistory(
  uuid: string,
  hours = 24
): Promise<{ count: number; records: HistoryRecord[] } | null> {
  const res = await getJson<{ count: number; records: HistoryRecord[] }>(
    `/api/records/load?uuid=${encodeURIComponent(uuid)}&hours=${hours}`
  );
  return res?.status === "success" ? res.data : null;
}

export async function fetchPingHistory(
  uuid: string,
  hours = 24
): Promise<PingHistoryResponse | null> {
  const res = await getJson<PingHistoryResponse>(
    `/api/records/ping?uuid=${encodeURIComponent(uuid)}&hours=${hours}`
  );
  return res?.status === "success" ? res.data : null;
}
