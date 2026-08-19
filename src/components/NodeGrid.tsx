"use client";

import { NodeCard } from "@/components/NodeCard";
import { useApp } from "@/contexts/AppProvider";

export function NodeGrid() {
  const { nodes, metricRetention, settings, goInstance, error, refresh } = useApp();

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
          className="btn-primary"
        >
          进入后台
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
      {nodes.map((node) => (
        <NodeCard
          key={node.uuid}
          node={node}
          pingEnabled={metricRetention.pingHours >= 1}
          showCarrierPing={settings.showCarrierPing}
          pingTaskSelection={{
            telecom: settings.telecomPingTaskName,
            mobile: settings.mobilePingTaskName,
            unicom: settings.unicomPingTaskName,
          }}
          onClick={() => goInstance(node.uuid)}
        />
      ))}
    </div>
  );
}
