const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    BYTE_UNITS.length - 1
  );
  const value = bytes / k ** i;
  return `${value.toFixed(decimals)} ${BYTE_UNITS[i]}`;
}

export function formatBytesPerSecond(bytes: number, decimals = 2): string {
  return `${formatBytes(bytes, decimals)}/s`;
}

export function formatBytesSplit(
  bytes: number,
  decimals = 2
): { value: string; unit: string } {
  if (!Number.isFinite(bytes) || bytes < 0) return { value: "0", unit: "B" };
  if (bytes === 0) return { value: "0", unit: "B" };
  const k = 1024;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    BYTE_UNITS.length - 1
  );
  return {
    value: (bytes / k ** i).toFixed(decimals),
    unit: BYTE_UNITS[i],
  };
}

export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} 天 ${h} 小时`;
  if (h > 0) return `${h} 小时 ${m} 分钟`;
  return `${m} 分钟`;
}

export function getUptimeDays(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.floor(seconds / 86400);
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function safeDiv(used: number, total: number): number {
  if (!total || total <= 0) return 0;
  return (used / total) * 100;
}
