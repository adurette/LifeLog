import { expect, it } from "vitest";
import { checkInIsComplete } from "./route";

const metric = {
  id: "metric-1",
  user_id: "user-1",
  name: "Mood",
  schedule: "daily" as const,
  weekdays: null,
  frequency: "once" as const,
  interval_hours: 1,
  schedule_times: ["18:00"],
};

it("suppresses a once-daily reminder when that metric is already filled", () => {
  expect(checkInIsComplete(metric, "18:00", [{ metric_id: metric.id, slot_key: "daily" }])).toBe(true);
});

it("only suppresses the completed slot for multi-check-in metrics", () => {
  const multiple = { ...metric, frequency: "times" as const, schedule_times: ["08:00", "18:00"] };
  const entries = [{ metric_id: metric.id, slot_key: "08:00" }];
  expect(checkInIsComplete(multiple, "08:00", entries)).toBe(true);
  expect(checkInIsComplete(multiple, "18:00", entries)).toBe(false);
});
