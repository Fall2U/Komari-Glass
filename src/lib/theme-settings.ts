import type { Appearance, AssetCurrency, ThemeSettings } from "./types";

export const DEFAULT_THEME_SETTINGS: Required<
  Pick<
    ThemeSettings,
    | "defaultAppearance"
    | "assetCurrency"
    | "enableBlur"
    | "backgroundImage"
    | "showStatsBar"
    | "showOnline"
    | "showAssets"
    | "showTraffic"
    | "showSpeed"
  >
> = {
  defaultAppearance: "system",
  assetCurrency: "CNY",
  enableBlur: true,
  backgroundImage: "",
  showStatsBar: true,
  showOnline: true,
  showAssets: true,
  // 默认四项：在线 / 资产 / 累计流量 / 实时网速
  showTraffic: true,
  showSpeed: true,
};

export function mergeThemeSettings(
  raw: ThemeSettings | null | undefined
): typeof DEFAULT_THEME_SETTINGS {
  const src = raw ?? {};

  return {
    defaultAppearance: normalizeAppearance(
      src.defaultAppearance,
      DEFAULT_THEME_SETTINGS.defaultAppearance
    ),
    assetCurrency: normalizeAssetCurrency(
      src.assetCurrency,
      DEFAULT_THEME_SETTINGS.assetCurrency
    ),
    enableBlur: bool(src.enableBlur, DEFAULT_THEME_SETTINGS.enableBlur),
    backgroundImage: String(
      src.backgroundImage ?? DEFAULT_THEME_SETTINGS.backgroundImage
    ),
    showStatsBar: bool(src.showStatsBar, DEFAULT_THEME_SETTINGS.showStatsBar),
    showOnline: bool(src.showOnline, DEFAULT_THEME_SETTINGS.showOnline),
    showAssets: bool(src.showAssets, DEFAULT_THEME_SETTINGS.showAssets),
    showTraffic: bool(src.showTraffic, DEFAULT_THEME_SETTINGS.showTraffic),
    showSpeed: bool(src.showSpeed, DEFAULT_THEME_SETTINGS.showSpeed),
  };
}

function normalizeAssetCurrency(
  value: unknown,
  fallback: AssetCurrency
): AssetCurrency {
  return value === "CNY" || value === "USD" || value === "EUR"
    ? value
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function normalizeAppearance(
  value: unknown,
  fallback: Appearance
): Appearance {
  if (value === "light" || value === "dark" || value === "system") return value;
  return fallback;
}

/** Parse "lightUrl|darkUrl" background config */
export function resolveBackground(
  raw: string,
  isDark: boolean
): string | null {
  if (!raw?.trim()) return null;
  const parts = raw.split("|").map((s) => s.trim());
  if (parts.length === 1) return parts[0] || null;
  return (isDark ? parts[1] || parts[0] : parts[0]) || null;
}

export const APPEARANCE_KEY = "appearance";
