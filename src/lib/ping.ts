import type { PingMetricTaskStats, PingRecord } from "./types";

interface PingTaskHistoryPoint {
  time: string;
  latency: number | null;
  loss: number | null;
}

interface PingRecordTaskSummary {
  taskId: number;
  avgLatency: number;
  latestLatency: number;
  loss: number;
  history: PingTaskHistoryPoint[];
}

interface PingRecordSummary {
  avgLatency: number;
  avgLoss: number;
  history: PingTaskHistoryPoint[];
  hasData: boolean;
  tasks: PingRecordTaskSummary[];
}

const HISTORY_BUCKET_COUNT = 20;

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildTaskHistory(records: PingRecord[]): PingTaskHistoryPoint[] {
  const samples = records
    .map((record) => ({
      ...record,
      timestamp: new Date(record.time).getTime(),
    }))
    .filter((record) => Number.isFinite(record.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp);
  if (!samples.length) return [];

  const first = samples[0].timestamp;
  const last = samples.at(-1)?.timestamp ?? first;
  const count = Math.min(HISTORY_BUCKET_COUNT, samples.length);
  const bucketSize = Math.max(1, (last - first) / count);
  const history: PingTaskHistoryPoint[] = [];
  let sampleIndex = 0;

  for (let index = 0; index < count; index += 1) {
    const start = first + bucketSize * index;
    const end = index === count - 1 ? last + 1 : start + bucketSize;
    const bucket: PingRecord[] = [];

    while (sampleIndex < samples.length) {
      const sample = samples[sampleIndex];
      if (sample.timestamp >= end) break;
      if (sample.timestamp >= start) bucket.push(sample);
      sampleIndex += 1;
    }

    const valid = bucket.filter((record) => record.value >= 0);
    history.push({
      time: new Date(start).toISOString(),
      latency: valid.length
        ? average(valid.map((record) => record.value))
        : null,
      loss: bucket.length
        ? ((bucket.length - valid.length) / bucket.length) * 100
        : null,
    });
  }

  return history;
}

export function summarizePingRecordsByTask(
  records: PingRecord[],
  includeHistory = false
): PingRecordTaskSummary[] {
  const taskRecords = new Map<number, PingRecord[]>();
  for (const record of records) {
    const values = taskRecords.get(record.task_id) ?? [];
    values.push(record);
    taskRecords.set(record.task_id, values);
  }

  return [...taskRecords.entries()].flatMap(([taskId, taskValues]) => {
    const valid = taskValues.filter((record) => record.value >= 0);
    if (!valid.length) return [];

    const latest = valid.reduce((current, record) =>
      new Date(record.time).getTime() > new Date(current.time).getTime()
        ? record
        : current
    );
    return [{
      taskId,
      avgLatency: average(valid.map((record) => record.value)),
      latestLatency: latest.value,
      loss:
        ((taskValues.length - valid.length) / taskValues.length) * 100,
      history: includeHistory ? buildTaskHistory(taskValues) : [],
    }];
  });
}

export function summarizePingRecords(
  records: PingRecord[],
  includeTaskHistory = false
): PingRecordSummary {
  const tasks = summarizePingRecordsByTask(records, includeTaskHistory);
  const includedTaskIds = new Set(tasks.map((task) => task.taskId));
  const includedRecords = records.filter((record) =>
    includedTaskIds.has(record.task_id)
  );

  return {
    avgLatency: average(tasks.map((task) => task.avgLatency)),
    avgLoss: average(tasks.map((task) => task.loss)),
    history: buildTaskHistory(includedRecords),
    hasData: tasks.length > 0,
    tasks,
  };
}

export function getExactPingLossByTask(
  uuid: string,
  stats: PingMetricTaskStats[]
): Map<number, number> {
  return new Map(
    stats
      .filter(
        (item) =>
          item.entity_id === uuid &&
          item.total > 0 &&
          item.valid > 0 &&
          !item.loss_approximate &&
          Number.isFinite(item.loss)
      )
      .map((item) => [Number(item.task_id), item.loss])
  );
}
