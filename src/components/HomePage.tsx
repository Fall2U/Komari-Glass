"use client";

import { NodeGrid } from "@/components/NodeGrid";
import { StatsBar } from "@/components/StatsBar";

export function HomePage() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <StatsBar />
      <NodeGrid />
    </div>
  );
}
