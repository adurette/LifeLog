import { describe, expect, it } from "vitest";
import { toCsv } from "./export";
import type { LifeLogData } from "./types";

describe("exports", () => {
  it("escapes values and includes metric context", () => {
    const data: LifeLogData = {
      metrics: [{ id: "m", name: "Mood, overall", type: "text", loggingMode: "daily", schedule: "daily", color: "sage" }],
      entries: [{ id: "e", metricId: "m", value: "Good", occurredAt: "2026-01-01T12:00:00Z", localDate: "2026-01-01", timezone: "UTC" }],
    };
    expect(toCsv(data)).toContain('"Mood, overall"');
  });
});
