import { convertNodeStatsToLiveStatus } from "./converters";
import type { LiveStatusMap, NodeStats } from "./types";

type Listener = (data: LiveStatusMap) => void;

type LivePayload =
  | {
      status: "success";
      data: {
        online: string[];
        data: Record<string, NodeStats>;
      };
    }
  | {
      status: "error";
      error: string;
    };

/**
 * Komari live metrics via WebSocket `/api/clients`.
 * This remains the public live-status endpoint in Komari 1.3.0+.
 */
class LiveWebSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 12;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private statusTimer: ReturnType<typeof setInterval> | null = null;
  private intentionalClose = false;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  connect() {
    if (
      typeof window === "undefined" ||
      (this.ws && this.ws.readyState < WebSocket.CLOSING)
    ) {
      return;
    }

    this.intentionalClose = false;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/api/clients`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.requestUpdate();
        this.startStatusUpdates();
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as LivePayload;

          if (payload.status === "success") {
            const online = new Set(payload.data.online);
            const map: LiveStatusMap = {};
            for (const [uuid, stats] of Object.entries(payload.data.data)) {
              map[uuid] = convertNodeStatsToLiveStatus(stats, online.has(uuid));
            }
            this.listeners.forEach((l) => l(map));
          }
        } catch (error) {
          console.error("[ws] parse error:", error);
        }
      };

      this.ws.onclose = () => {
        this.stopStatusUpdates();
        if (!this.intentionalClose) this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // onclose will fire after error
      };
    } catch (error) {
      console.error("[ws] connect failed:", error);
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.intentionalClose = true;
    this.stopStatusUpdates();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private requestUpdate() {
    // Komari 1.3.0+ public live protocol uses the plain-text "get" request.
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send("get");
    }
  }

  private startStatusUpdates() {
    this.stopStatusUpdates();
    // periodic refresh request as a soft heartbeat
    this.statusTimer = setInterval(() => this.requestUpdate(), 2000);
  }

  private stopStatusUpdates() {
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 15000);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}

let singleton: LiveWebSocket | null = null;

export function getLiveWebSocket(): LiveWebSocket {
  if (!singleton) singleton = new LiveWebSocket();
  return singleton;
}
