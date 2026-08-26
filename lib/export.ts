import type { LifeLogData } from "./types";

const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function toCsv(data: LifeLogData) {
  const metrics = new Map(data.metrics.map((metric) => [metric.id, metric]));
  const rows = data.entries
    .slice()
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((entry) => {
      const metric = metrics.get(entry.metricId);
      return [entry.localDate, entry.occurredAt, metric?.name, metric?.type, entry.value, metric?.unit, entry.note].map(escapeCsv).join(",");
    });
  return ["date,occurred_at,metric,type,value,unit,note", ...rows].join("\n");
}

export function toJson(data: LifeLogData) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2);
}
