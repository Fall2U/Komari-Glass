"use client";

import { NodeGrid } from "@/components/NodeGrid";
import { StatsBar } from "@/components/StatsBar";

export function HomePage() {
  return (
    <div className="space-y-3.5 sm:space-y-4">
      <StatsBar />
      <NodeGrid />
    </div>
  );
}
