import type { NextConfig } from "next";

/**
 * Static export for Komari theme packages.
 * For local API proxy during `next dev`, run a reverse proxy (Caddy/nginx)
 * or point the browser at a same-origin Komari instance.
 */
const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
