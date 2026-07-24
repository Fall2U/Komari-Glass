"use client";

import { LayoutDashboard, Moon, Server, Sun } from "lucide-react";
import { useApp } from "@/contexts/AppProvider";

export function Header() {
  const {
    sitename,
    settings,
    resolvedTheme,
    setAppearance,
    goHome,
    isLoggedIn,
  } = useApp();

  const showAdmin = isLoggedIn || !settings.hideAdminWhenLoggedOut;
  const isDark = resolvedTheme === "dark";

  return (
    <header className="site-header sticky top-0 z-40 w-full">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={goHome}
          className="brand-link flex min-w-0 items-center gap-2.5 text-left"
          aria-label={`${sitename} 首页`}
        >
          {settings.siteLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.siteLogo}
              alt=""
              className="size-9 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span className="brand-mark" aria-hidden="true">
              <Server className="size-[18px]" strokeWidth={2.2} />
            </span>
          )}
          <span className="truncate text-[17px] font-semibold tracking-normal sm:text-lg">
            {sitename}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setAppearance(isDark ? "light" : "dark")}
            className="icon-btn"
            aria-label={isDark ? "切换到浅色主题" : "切换到深色主题"}
            title={isDark ? "浅色主题" : "深色主题"}
          >
            {isDark ? (
              <Sun className="size-[18px]" />
            ) : (
              <Moon className="size-[18px]" />
            )}
          </button>

          {showAdmin ? (
            <a
              href="/admin"
              className="icon-btn"
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
