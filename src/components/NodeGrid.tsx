"use client";

import { NodeCard } from "@/components/NodeCard";
import { useApp } from "@/contexts/AppProvider";

export function NodeGrid() {
  const { nodes, metricRetention, goInstance, loading, error, refresh } =
    useApp();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="glass-panel h-[328px] animate-pulse rounded-xl bg-foreground/5"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel rounded-lg p-8 text-center">
        <p className="mb-3 text-destructive">{error}</p>
        <button type="button" className="btn-primary" onClick={() => void refresh()}>
          重试
        </button>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="glass-panel rounded-lg p-8 text-center">
        <p className="mb-2 text-lg font-semibold">暂无节点</p>
        <p className="mb-4 text-sm text-muted-foreground">
          请在后台添加服务器节点
        </p>
        <a
          href="/admin"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex"
        >
          进入后台
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {nodes.map((node) => (
        <NodeCard
          key={node.uuid}
          node={node}
          pingEnabled={metricRetention.pingHours >= 1}
          onClick={() => goInstance(node.uuid)}
        />
      ))}
    </div>
  );
}
