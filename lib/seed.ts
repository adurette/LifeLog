import type { Entry, LifeLogData, Metric } from "./types";

const metrics: Metric[] = [
  { id: "sleep", name: "Sleep quality", description: "How restorative did last night feel?", type: "rating", loggingMode: "daily", schedule: "daily", color: "violet", ratingMin: 1, ratingMax: 10 },
  { id: "coffee", name: "Coffee", description: "Log each cup as you have it", type: "number", unit: "cups", loggingMode: "event", schedule: "flexible", color: "amber", aggregation: "sum" },
  { id: "mood", name: "Mood", type: "rating", loggingMode: "daily", schedule: "daily", color: "sage", ratingMin: 1, ratingMax: 10 },
  { id: "meditation", name: "Meditated", type: "boolean", loggingMode: "daily", schedule: "daily", color: "blue" },
];

const values = [
  [6, 4, 6, false], [7, 3, 7, true], [5, 5, 5, false], [8, 2, 8, true],
  [7, 2, 7, true], [6, 4, 6, false], [9, 1, 9, true], [8, 2, 8, true],
  [6, 3, 6, false], [7, 3, 7, true], [8, 2, 8, true], [9, 1, 9, true],
  [7, 2, 8, true], [5, 4, 5, false],
];

const dates = Array.from({ length: 14 }, (_, index) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - (13 - index));
  return date.toISOString().slice(0, 10);
});

const entries: Entry[] = values.flatMap((row, day) => metrics.map((metric, index) => ({
  id: `${metric.id}-${dates[day]}`,
  metricId: metric.id,
  value: row[index] as number | boolean,
  occurredAt: `${dates[day]}T12:00:00.000Z`,
  localDate: dates[day],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  synced: true,
})));

export const seedData: LifeLogData = { metrics, entries };
