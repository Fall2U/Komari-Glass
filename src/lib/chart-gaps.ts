const MIN_GAP_MS = 10_000;

interface TimedPoint {
  time: number;
}

export interface ChartTimeRange {
  domain: [number | "dataMin", number | "dataMax"];
  ticks?: number[];
}

/** Insert a null point when the timeline has a likely outage or missing window. */
export function insertTimelineGaps<T extends TimedPoint, G extends TimedPoint>(
  points: readonly T[],
  createGap: (time: number) => G,
  maximumGapMs = Number.POSITIVE_INFINITY
): Array<T | G> {
  if (points.length < 2) return [...points];

  const intervals = points
    .slice(1)
    .map((point, index) => point.time - points[index].time)
    .filter((interval) => interval > 0 && Number.isFinite(interval))
    .sort((left, right) => left - right);
  if (!intervals.length) return [...points];

  // A lower quartile keeps repeated outages from inflating the normal cadence.
  const typicalInterval = intervals[Math.floor((intervals.length - 1) / 4)];
  const threshold = Math.min(
    Math.max(MIN_GAP_MS, typicalInterval * 1.5),
    maximumGapMs
  );
  const result: Array<T | G> = [points[0]];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (current.time - previous.time > threshold) {
      result.push(createGap(previous.time + typicalInterval));
    }
    result.push(current);
  }
  return result;
}

export function getChartGapLimit(hours: number): number {
  if (hours <= 0) return 30_000;
  return Math.max(5 * 60_000, (hours * 60 * 60_000) / 36);
}

export function getChartTimeRange(
  hours: number,
  now = Date.now()
): ChartTimeRange {
  if (hours <= 0) {
    return { domain: ["dataMin", "dataMax"] };
  }

  const start = now - hours * 60 * 60_000;
  return {
    domain: [start, now],
    ticks: Array.from(
      { length: 5 },
      (_, index) => start + ((now - start) * index) / 4
    ),
  };
}

export function formatChartTimeTick(timestamp: number, hours: number): string {
  const date = new Date(timestamp);
  if (hours <= 1) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  if (hours <= 4) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (hours <= 24) {
    return date.toLocaleString([], {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString([], { month: "2-digit", day: "2-digit" });
}
