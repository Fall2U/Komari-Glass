"use client";

import { useApp } from "@/contexts/AppProvider";

export function Footer() {
  const { publicInfo } = useApp();

  return (
    <footer className="mx-auto w-full max-w-[1440px] px-4 py-8 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
      {publicInfo?.description ? (
        <p className="mb-2 opacity-80">{publicInfo.description}</p>
      ) : null}
      <p>
        {"Powered by "}
        <a
          href="https://github.com/komari-monitor/komari"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-foreground/20 underline-offset-2 transition hover:text-foreground"
        >
          Komari Monitor
        </a>
        {"."}
      </p>
    </footer>
  );
}
