export type MetricType = "number" | "rating" | "boolean" | "choice" | "text";
export type LoggingMode = "daily" | "event";
export type ScheduleType = "daily" | "weekdays" | "flexible";
export type MetricColor = "sage" | "amber" | "blue" | "rose" | "violet";

export interface Metric {
  id: string;
  name: string;
  description?: string;
  type: MetricType;
  unit?: string;
  loggingMode: LoggingMode;
  schedule: ScheduleType;
  weekdays?: number[];
  color: MetricColor;
  ratingMin?: number;
  ratingMax?: number;
  options?: string[];
  aggregation?: "sum" | "count" | "average";
  notesEnabled?: boolean;
  archived?: boolean;
}

export type EntryValue = number | boolean | string;

export interface Entry {
  id: string;
  metricId: string;
  value: EntryValue;
  occurredAt: string;
  localDate: string;
  timezone: string;
  note?: string;
  synced?: boolean;
}

export interface LifeLogData {
  metrics: Metric[];
  entries: Entry[];
}
