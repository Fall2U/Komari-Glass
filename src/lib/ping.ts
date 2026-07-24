import type {
  MetricQueryResponse,
  MetricSeries,
  PingMetricStatsResponse,
  PingMetricTaskStats,
  PingRecord,
} from "./types";

interface PingHistoryPoint {
  time: string;
  latency: number | null;
  loss: number | null;
}

interface TimedValue {
  time: string;
  value: number;
}

interface WeightedLoss extends TimedValue {
  count: number;
}

export type PingSource =
  | {
      kind: "metrics";
      stats: PingMetricTaskStats[];
      latencyPoints: TimedValue[];
      lossPoints: WeightedLoss[];
    }
  | {
      kind: "records";
      records: PingRecord[];
    };

interface PingSummary {
  avgLatency: number;
  avgLoss: number;
  history: PingHistoryPoint[];
  hasData: boolean;
}

const HISTORY_BUCKET_COUNT = 20;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedAverage(
  values: Array<{ value: number; weight: number }>
): number {
  const weighted = values.filter((item) => item.weight > 0);
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return 0;
  return (
    weighted.reduce(
      (sum, item) => sum + item.value * item.weight,
      0
    ) / totalWeight
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function metricTags(value: {
  tag?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  labels?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    ...(isRecord(value.tags) ? value.tags : {}),
    ...(isRecord(value.tag) ? value.tag : {}),
    ...(isRecord(value.labels) ? value.labels : {}),
  };
}

function metricTaskId(
  series: MetricSeries,
  point?: MetricSeries["points"][number]
): string {
  const tags = {
    ...metricTags(series),
    ...(point ? metricTags(point) : {}),
  };
  const value =
    series.task_id ?? tags.task_id ?? tags.task ?? tags.id ?? "";
  return String(value);
}

export function buildMetricPingSource(
  uuid: string,
  statsResponse: PingMetricStatsResponse,
  metricsResponse: MetricQueryResponse
): PingSource | null {
  const stats = (statsResponse.stats ?? []).filter(
    (item) =>
      item.entity_id === uuid && item.total > 0 && item.valid > 0
  );
  const includedTaskIds = new Set(
    stats.map((item) => String(item.task_id))
  );
  const latencyPoints: TimedValue[] = [];
  const lossPoints: WeightedLoss[] = [];
  const lossTaskIds = new Set<string>();

  for (const series of metricsResponse.series ?? []) {
    if (series.entity_id !== uuid) continue;

    if (series.metric_key === "ping.loss") {
      for (const point of series.points) {
        const taskId = metricTaskId(series, point);
        if (!includedTaskIds.has(taskId)) continue;
        if (!isFiniteNumber(point.value)) continue;
        lossPoints.push({
          time: point.time,
          value: point.value,
          count:
            isFiniteNumber(point.count) && point.count > 0 ? point.count : 1,
        });
        lossTaskIds.add(taskId);
      }
      continue;
    }

    if (series.metric_key !== "ping.latency_ms") continue;
    for (const point of series.points) {
      if (!includedTaskIds.has(metricTaskId(series, point))) continue;
      if (!isFiniteNumber(point.value)) continue;
      latencyPoints.push({ time: point.time, value: point.value });
    }
  }

  if (!latencyPoints.length) {
    const time = new Date().toISOString();
    for (const item of stats) {
      if (isFiniteNumber(item.latest)) {
        latencyPoints.push({ time, value: item.latest });
      }
    }
  }

  const exactLossTaskIds = new Set(
    stats
      .filter(
        (item) =>
          !item.loss_approximate &&
          isFiniteNumber(item.loss)
      )
      .map((item) => String(item.task_id))
  );
  const hasCompleteLossSeries =
    exactLossTaskIds.size > 0 &&
    [...exactLossTaskIds].every((taskId) => lossTaskIds.has(taskId));

  if (!hasCompleteLossSeries) return null;
  return { kind: "metrics", stats, latencyPoints, lossPoints };
}

function buildHistory(
  latencySamples: TimedValue[],
  lossSamples: WeightedLoss[]
): PingHistoryPoint[] {
  const latencies = latencySamples
    .map((sample) => ({
      ...sample,
      timestamp: new Date(sample.time).getTime(),
    }))
    .filter((sample) => Number.isFinite(sample.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);
  const losses = lossSamples
    .map((sample) => ({
      ...sample,
      timestamp: new Date(sample.time).getTime(),
    }))
    .filter(
      (sample) =>
        Number.isFinite(sample.timestamp) &&
        Number.isFinite(sample.value) &&
        sample.count > 0
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  if (!latencies.length && !losses.length) return [];

  const first = Math.min(
    latencies[0]?.timestamp ?? Number.POSITIVE_INFINITY,
    losses[0]?.timestamp ?? Number.POSITIVE_INFINITY
  );
  const last = Math.max(
    latencies.at(-1)?.timestamp ?? Number.NEGATIVE_INFINITY,
    losses.at(-1)?.timestamp ?? Number.NEGATIVE_INFINITY
  );
  const count = Math.min(
    HISTORY_BUCKET_COUNT,
    Math.max(latencies.length, losses.length)
  );
  const bucketSize = Math.max(1, (last - first) / count);
  const history: PingHistoryPoint[] = [];
  let latencyIndex = 0;
  let lossIndex = 0;

  for (let index = 0; index < count; index++) {
    const start = first + bucketSize * index;
    const end = index === count - 1 ? last + 1 : start + bucketSize;
    let latencySum = 0;
    let latencyCount = 0;
    let lossSum = 0;
    let lossCount = 0;

    while (latencyIndex < latencies.length) {
      const sample = latencies[latencyIndex];
      if (sample.timestamp >= end) break;
      if (sample.timestamp >= start) {
        latencySum += sample.value;
        latencyCount += 1;
      }
      latencyIndex += 1;
    }

    while (lossIndex < losses.length) {
      const sample = losses[lossIndex];
      if (sample.timestamp >= end) break;
      if (sample.timestamp >= start) {
        lossSum += sample.value * sample.count;
        lossCount += sample.count;
      }
      lossIndex += 1;
    }

    history.push({
      time: new Date(start).toISOString(),
      latency: latencyCount ? latencySum / latencyCount : null,
      loss: lossCount ? (lossSum / lossCount) * 100 : null,
    });
  }

  return history;
}

function summarizeMetricSource(
  source: Extract<PingSource, { kind: "metrics" }>
): PingSummary {
  const stats = source.stats.filter(
    (item) => item.total > 0 && item.valid > 0
  );
  const latencyValues = stats.flatMap((item) =>
    item.valid > 0 && isFiniteNumber(item.avg)
      ? [{ value: item.avg, weight: item.valid }]
      : []
  );
  const latestValues = stats
    .map((item) => item.latest)
    .filter(isFiniteNumber);
  const lossValues = stats
    .filter(
      (item) => !item.loss_approximate && isFiniteNumber(item.loss)
    )
    .map((item) => ({ value: item.loss, weight: item.total }));

  return {
    avgLatency: latencyValues.length
      ? weightedAverage(latencyValues)
      : average(latestValues),
    avgLoss: weightedAverage(lossValues),
    history: buildHistory(source.latencyPoints, source.lossPoints),
    hasData: stats.length > 0,
  };
}

function summarizeRecordSource(
  source: Extract<PingSource, { kind: "records" }>
): PingSummary {
  const taskRecords = new Map<number, PingRecord[]>();
  for (const record of source.records) {
    const records = taskRecords.get(record.task_id) ?? [];
    records.push(record);
    taskRecords.set(record.task_id, records);
  }

  const includedTaskRecords = [...taskRecords.values()].filter((records) =>
    records.some((record) => record.value >= 0)
  );
  const taskLatencies: number[] = [];
  const taskLosses: number[] = [];
  for (const records of includedTaskRecords) {
    const valid = records
      .map((record) => record.value)
      .filter((value) => value >= 0);
    taskLosses.push(
      ((records.length - valid.length) / records.length) * 100
    );
    if (valid.length) taskLatencies.push(average(valid));
  }

  const includedRecords = includedTaskRecords.flat();
  const latencyPoints = includedRecords
    .filter((record) => record.value >= 0)
    .map((record) => ({ time: record.time, value: record.value }));
  const lossPoints = includedRecords.map((record) => ({
    time: record.time,
    value: record.value < 0 ? 1 : 0,
    count: 1,
  }));

  return {
    avgLatency: average(taskLatencies),
    avgLoss: average(taskLosses),
    history: buildHistory(latencyPoints, lossPoints),
    hasData: includedTaskRecords.length > 0,
  };
}

export function summarizePingSource(source: PingSource): PingSummary {
  return source.kind === "metrics"
    ? summarizeMetricSource(source)
    : summarizeRecordSource(source);
}
