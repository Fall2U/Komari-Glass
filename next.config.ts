import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  ...(isDevelopment ? {} : { output: "export" as const }),
  distDir: isDevelopment ? ".next" : "dist",
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: false,
  },
  // `bun run build` runs tsc first; skip Next's duplicate Bun child process.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
