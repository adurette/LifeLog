import type { Entry, Metric } from "./types";

export interface SeriesPoint { date: string; value: number }

export function dailySeries(metric: Metric, entries: Entry[]): SeriesPoint[] {
  const grouped = new Map<string, number[]>();
  entries.filter((entry) => entry.metricId === metric.id).forEach((entry) => {
    const numeric = typeof entry.value === "boolean" ? Number(entry.value) : Number(entry.value);
    if (!Number.isFinite(numeric)) return;
    grouped.set(entry.localDate, [...(grouped.get(entry.localDate) ?? []), numeric]);
  });
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => {
    if (metric.loggingMode === "daily") return { date, value: values.at(-1) ?? 0 };
    if (metric.aggregation === "count") return { date, value: values.length };
    if (metric.aggregation === "average") return { date, value: values.reduce((a, b) => a + b, 0) / values.length };
    return { date, value: values.reduce((a, b) => a + b, 0) };
  });
}

const ranks = (values: number[]) => values.map((value) => {
  const sorted = [...values].sort((a, b) => a - b);
  const first = sorted.indexOf(value);
  const last = sorted.lastIndexOf(value);
  return (first + last) / 2 + 1;
});

export function spearman(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const rx = ranks(xs); const ry = ranks(ys);
  const meanX = rx.reduce((a, b) => a + b, 0) / rx.length;
  const meanY = ry.reduce((a, b) => a + b, 0) / ry.length;
  const numerator = rx.reduce((sum, x, i) => sum + (x - meanX) * (ry[i] - meanY), 0);
  const denominator = Math.sqrt(rx.reduce((sum, x) => sum + (x - meanX) ** 2, 0) * ry.reduce((sum, y) => sum + (y - meanY) ** 2, 0));
  return denominator === 0 ? null : numerator / denominator;
}

export function comparison(metricA: Metric, metricB: Metric, entries: Entry[]) {
  const a = new Map(dailySeries(metricA, entries).map((point) => [point.date, point.value]));
  const b = new Map(dailySeries(metricB, entries).map((point) => [point.date, point.value]));
  const points = [...a.entries()].filter(([date]) => b.has(date)).map(([date, x]) => ({ date, x, y: b.get(date)! }));
  return { points, correlation: spearman(points.map((p) => p.x), points.map((p) => p.y)) };
}
