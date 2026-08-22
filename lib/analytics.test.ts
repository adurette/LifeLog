import { describe, expect, it } from "vitest";
import { dailySeries, spearman } from "./analytics";
import type { Entry, Metric } from "./types";

describe("analytics", () => {
  it("calculates rank correlation", () => {
    expect(spearman([1, 2, 3], [2, 4, 6])).toBe(1);
    expect(spearman([1, 2, 3], [6, 4, 2])).toBe(-1);
  });

  it("sums repeatable events by local day", () => {
    const metric = { id: "coffee", name: "Coffee", type: "number", loggingMode: "event", schedule: "flexible", color: "amber", aggregation: "sum" } as Metric;
    const entries = [1, 2].map((value, i) => ({ id: `${i}`, metricId: "coffee", value, occurredAt: "2026-01-01T12:00:00Z", localDate: "2026-01-01", timezone: "UTC" })) as Entry[];
    expect(dailySeries(metric, entries)).toEqual([{ date: "2026-01-01", value: 3 }]);
  });
});
