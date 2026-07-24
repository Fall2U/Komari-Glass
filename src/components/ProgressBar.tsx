"use client";

import { cn } from "@/lib/cn";
import type { MetricStatus } from "@/lib/metrics";
import { clampPercent } from "@/lib/format";

const statusColor: Record<MetricStatus, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  error: "bg-destructive",
};

export function ProgressBar({
  percentage,
  status = "success",
  className,
  height = 4,
}: {
  percentage: number;
  status?: MetricStatus;
  className?: string;
  height?: number;
}) {
  const pct = clampPercent(percentage);
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-foreground/8",
        className
      )}
      style={{ height }}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          statusColor[status]
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
