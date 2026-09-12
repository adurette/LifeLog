// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AddMetricModal, MetricCard } from "./lifelog-app";
import type { Entry, Metric } from "@/lib/types";

afterEach(cleanup);
const metric: Metric = { id: "test", name: "Test", type: "boolean", loggingMode: "daily", schedule: "daily", color: "sage" };

it("highlights No immediately and autosaves both boolean answers", () => {
  const onSave = vi.fn();
  render(<MetricCard metric={metric} slot={{ key: "daily" }} onSave={onSave} />);
  expect(onSave).not.toHaveBeenCalled();
  const no = screen.getByRole("button", { name: "No" });
  expect(no.getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(no);
  expect(no.className).toBe("selected");
  expect(onSave).toHaveBeenLastCalledWith(metric, false, undefined, "", "daily");
  fireEvent.click(screen.getByRole("button", { name: "Yes" }));
  expect(onSave).toHaveBeenLastCalledWith(metric, true, undefined, "", "daily");
  expect(screen.queryByRole("button", { name: /save|update/i })).toBeNull();
});

it("allows clearing a saved number, refuses empty saves, and accepts decimals and zero", () => {
  const onSave = vi.fn();
  const numeric = { ...metric, type: "number" as const };
  const entry = { id: "old", value: 8 } as Entry;
  const view = render(<MetricCard metric={numeric} entry={entry} slot={{ key: "daily" }} onSave={onSave} />);
  const input = screen.getByRole("spinbutton") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "" } });
  expect(input.value).toBe("");
  fireEvent.blur(input);
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "7.25" } });
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.blur(input);
  expect(onSave).toHaveBeenLastCalledWith(numeric, 7.25, undefined, "", "daily");
  view.rerender(<MetricCard metric={numeric} entry={{ ...entry, value: 7.25 }} slot={{ key: "daily" }} onSave={onSave} />);
  expect(screen.getByRole("status").textContent).toBe("Saved automatically");
  expect(screen.getByRole("spinbutton")).toBe(input);
  fireEvent.change(input, { target: { value: "0" } });
  fireEvent.blur(input);
  expect(onSave).toHaveBeenLastCalledWith(numeric, 0, undefined, "", "daily");
});

it("allows typing 12 check-ins without clamping intermediate input and validates limits", () => {
  const onAdd = vi.fn();
  render(<AddMetricModal initial={{ ...metric, frequency: "times", timesPerDay: 3 }} onAdd={onAdd} onClose={vi.fn()} />);
  const input = screen.getByRole("spinbutton", { name: /Number of check-ins/ }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "" } });
  expect(input.value).toBe("");
  expect(input.checkValidity()).toBe(false);
  fireEvent.change(input, { target: { value: "1" } });
  expect(input.value).toBe("1");
  fireEvent.change(input, { target: { value: "12" } });
  expect(input.checkValidity()).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ timesPerDay: 12 }));
  for (const value of ["13", "2.5", "0"]) {
    fireEvent.change(input, { target: { value } });
    expect(input.checkValidity()).toBe(false);
  }
});
