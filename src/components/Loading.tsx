"use client";

import { cn } from "@/lib/cn";

export function Loading({
  text = "加载中…",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center gap-3",
        className
      )}
    >
      <div className="size-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
