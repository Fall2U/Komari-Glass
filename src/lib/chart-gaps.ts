const MIN_GAP_MS = 10_000;

interface TimedPoint {
  time: number;
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

  // Use the lower middle value so one long outage cannot hide the normal cadence.
  const typicalInterval = intervals[Math.floor((intervals.length - 1) / 2)];
  const threshold = Math.min(
    Math.max(MIN_GAP_MS, typicalInterval * 3),
    maximumGapMs
  );
  const result: Array<T | G> = [points[0]];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (current.time - previous.time > threshold) {
      result.push(createGap(previous.time + (current.time - previous.time) / 2));
    }
    result.push(current);
  }
  return result;
}

export function getChartGapLimit(hours: number): number {
  if (hours <= 0) return 30_000;
  return Math.max(5 * 60_000, (hours * 60 * 60_000) / 36);
}
