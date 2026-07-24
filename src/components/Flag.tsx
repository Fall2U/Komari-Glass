"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  getFlagImage,
  getRegionDisplayName,
  getRegionEmoji,
  hasRegion,
} from "@/lib/region";

/**
 * Region flag: prefer Komari core SVG `/images/flags/{CODE}.svg`,
 * fall back to emoji when the image is missing.
 */
export function Flag({
  region,
  className,
  size = 20,
}: {
  region: string | null | undefined;
  className?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (!hasRegion(region)) return null;

  const src = getFlagImage(region);
  const emoji = getRegionEmoji(region);
  const alt = getRegionDisplayName(region);

  if (!src || failed) {
    if (!emoji) return null;
    return (
      <span
        className={cn("inline-flex shrink-0 leading-none", className)}
        style={{ fontSize: size * 0.9 }}
        title={alt}
        aria-label={alt}
      >
        {emoji}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      title={alt}
      width={size}
      height={size}
      className={cn("inline-block shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
