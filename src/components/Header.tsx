"use client";

import {
  ArrowLeft,
  LayoutDashboard,
  Moon,
  Monitor,
  Server,
  Sun,
} from "lucide-react";
import { useApp } from "@/contexts/AppProvider";
import { cn } from "@/lib/cn";
import type { Appearance } from "@/lib/types";

const themeCycle: Appearance[] = ["light", "dark", "system"];

const themeIcon: Record<Appearance, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const themeLabel: Record<Appearance, string> = {
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
};

export function Header() {
  const {
    sitename,
    settings,
    appearance,
    setAppearance,
    route,
    goHome,
    isLoggedIn,
  } = useApp();

  const isInstance = route.name === "instance";
  const ThemeIcon = themeIcon[appearance];
  const showAdmin = isLoggedIn || !settings.hideAdminWhenLoggedOut;

  const cycleTheme = () => {
    const idx = themeCycle.indexOf(appearance);
    setAppearance(themeCycle[(idx + 1) % themeCycle.length]);
  };

  return (
    <header className="site-header sticky top-0 z-40 w-full">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand — no glass frame (Glassmorphism style) */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {isInstance ? (
            <button
              type="button"
              onClick={goHome}
              className="icon-btn shrink-0"
              aria-label="返回首页"
              title="返回首页"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={goHome}
            className="flex min-w-0 items-center gap-2.5 text-left"
          >
            {settings.siteLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.siteLogo}
                alt=""
                className="size-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-foreground">
                <Server className="size-4" />
              </span>
            )}
            <span className="truncate text-lg font-semibold tracking-tight">
              {sitename}
            </span>
          </button>
        </div>

        {/* Actions — ghost icon buttons, no outer box */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={cycleTheme}
            className="icon-btn"
            aria-label={`切换主题（当前：${themeLabel[appearance]}）`}
            title={`主题：${themeLabel[appearance]}`}
          >
            <ThemeIcon className="size-[18px]" />
          </button>

          {showAdmin ? (
            <a
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              className={cn("icon-btn", isLoggedIn && "text-selection")}
              aria-label="进入后台"
              title="进入后台"
            >
              <LayoutDashboard className="size-[18px]" />
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}
