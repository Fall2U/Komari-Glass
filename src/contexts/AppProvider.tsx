"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchNodes, fetchPublicInfo } from "@/lib/api";
import { calcOverview, mergeNodes } from "@/lib/metrics";
import { navigate, parsePath, toPath } from "@/lib/router";
import {
  APPEARANCE_KEY,
  mergeThemeSettings,
  resolveBackground,
} from "@/lib/theme-settings";
import { getLiveWebSocket } from "@/lib/websocket";
import type {
  Appearance,
  DisplayNode,
  LiveStatusMap,
  NodeData,
  PublicInfo,
  Route,
} from "@/lib/types";

interface AppContextValue {
  loading: boolean;
  error: string | null;
  publicInfo: PublicInfo | null;
  nodes: DisplayNode[];
  rawNodes: NodeData[];
  liveMap: LiveStatusMap | null;
  overview: ReturnType<typeof calcOverview>;
  settings: ReturnType<typeof mergeThemeSettings>;
  appearance: Appearance;
  resolvedTheme: "light" | "dark";
  setAppearance: (a: Appearance) => void;
  route: Route;
  goHome: () => void;
  goInstance: (uuid: string) => void;
  refresh: () => Promise<void>;
  sitename: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

function getSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredAppearance(fallback: Appearance): Appearance {
  if (typeof window === "undefined") return fallback;
  const stored = localStorage.getItem(APPEARANCE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return fallback;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicInfo, setPublicInfo] = useState<PublicInfo | null>(null);
  const [rawNodes, setRawNodes] = useState<NodeData[]>([]);
  const [liveMap, setLiveMap] = useState<LiveStatusMap | null>(null);
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [appearance, setAppearanceState] = useState<Appearance>("system");
  const [systemDark, setSystemDark] = useState(false);

  const settings = useMemo(
    () => mergeThemeSettings(publicInfo?.theme_settings),
    [publicInfo]
  );

  const resolvedTheme: "light" | "dark" =
    appearance === "system" ? (systemDark ? "dark" : "light") : appearance;

  const setAppearance = useCallback((a: Appearance) => {
    setAppearanceState(a);
    try {
      localStorage.setItem(APPEARANCE_KEY, a);
    } catch {
      /* ignore */
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [pub, nodes] = await Promise.all([
        fetchPublicInfo(),
        fetchNodes(),
      ]);
      setPublicInfo(pub);
      setRawNodes(nodes);

      // init appearance from localStorage or theme default
      const defaults = mergeThemeSettings(pub?.theme_settings);
      setAppearanceState(readStoredAppearance(defaults.defaultAppearance));
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // bootstrap
  useEffect(() => {
    setSystemDark(getSystemDark());
    setRoute(parsePath(window.location.pathname));
    void refresh();

    const onPop = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener("popstate", onPop);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener("change", onScheme);

    return () => {
      window.removeEventListener("popstate", onPop);
      mql.removeEventListener("change", onScheme);
    };
  }, [refresh]);

  // live websocket
  useEffect(() => {
    if (loading) return;
    const ws = getLiveWebSocket();
    const unsub = ws.subscribe(setLiveMap);
    ws.connect();
    return () => {
      unsub();
      ws.disconnect();
    };
  }, [loading]);

  // apply dark class + background
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;

    const bg = resolveBackground(settings.backgroundImage, resolvedTheme === "dark");
    const el = document.getElementById("theme-background");
    if (el) {
      if (bg) {
        el.style.backgroundImage = `url(${bg})`;
        el.style.opacity = "1";
      } else {
        el.style.backgroundImage = "";
        el.style.opacity = "0";
      }
    }

    root.dataset.blur = settings.enableBlur ? "on" : "off";
  }, [resolvedTheme, settings.backgroundImage, settings.enableBlur]);

  // Komari's admin node list stores its drag-and-drop order in `weight`.
  const nodes = useMemo(
    () =>
      mergeNodes(rawNodes, liveMap).sort(
        (a, b) => (a.weight ?? 0) - (b.weight ?? 0)
      ),
    [rawNodes, liveMap]
  );

  const overview = useMemo(
    () => calcOverview(nodes, settings.assetCurrency),
    [nodes, settings.assetCurrency]
  );

  const goHome = useCallback(() => {
    navigate({ name: "home" });
  }, []);

  const goInstance = useCallback((uuid: string) => {
    navigate({ name: "instance", uuid });
  }, []);

  // keep document title in sync
  useEffect(() => {
    if (publicInfo?.sitename) {
      // Komari already injects title; keep soft sync for SPA navigations
      if (route.name === "instance") {
        const node = nodes.find((n) => n.uuid === route.uuid);
        if (node) {
          document.title = `${node.name} · ${publicInfo.sitename}`;
          return;
        }
      }
      document.title = publicInfo.sitename;
    }
  }, [publicInfo, route, nodes]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [route]);

  // ensure path canonical
  useEffect(() => {
    if (typeof window === "undefined") return;
    const expected = toPath(route);
    if (window.location.pathname !== expected && route.name !== "not-found") {
      // don't force-replace when path is already fine with trailing slash variants
      const current = window.location.pathname.replace(/\/+$/, "") || "/";
      const want = expected.replace(/\/+$/, "") || "/";
      if (current !== want) {
        window.history.replaceState({ route }, "", expected);
      }
    }
  }, [route]);

  const value: AppContextValue = {
    loading,
    error,
    publicInfo,
    nodes,
    rawNodes,
    liveMap,
    overview,
    settings,
    appearance,
    resolvedTheme,
    setAppearance,
    route,
    goHome,
    goInstance,
    refresh,
    sitename: publicInfo?.sitename || "Komari Monitor",
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
