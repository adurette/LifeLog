// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AddMetricModal, DailyMetricCard, MetricCard } from "./lifelog-app";
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
  expect(screen.getByRole("alert").textContent).toBe("Enter a number.");
  fireEvent.change(input, { target: { value: "7.25" } });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.blur(input);
  expect(onSave).toHaveBeenLastCalledWith(numeric, 7.25, undefined, "", "daily");
  view.rerender(<MetricCard metric={numeric} entry={{ ...entry, value: 7.25 }} slot={{ key: "daily" }} onSave={onSave} />);
  expect(screen.queryByText(/saved automatically/i)).toBeNull();
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

it("groups recordings under one metric heading and saves each slot independently", () => {
  const onSave = vi.fn();
  const multiple = { ...metric, frequency: "times" as const, timesPerDay: 3, scheduleTimes: ["08:00", "12:00", "18:00"], notesEnabled: true };
  render(<DailyMetricCard metric={multiple} entries={[{ id: "morning", slotKey: "08:00", value: true } as Entry]} onSave={onSave} />);
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getAllByRole("heading", { name: "Test" })).toHaveLength(1);
  expect(screen.getByText("1 of 3 recorded")).toBeTruthy();
  const morning = within(screen.getByRole("region", { name: "08:00" }));
  const noon = within(screen.getByRole("region", { name: "12:00" }));
  fireEvent.click(noon.getByRole("button", { name: "No" }));
  expect(onSave).toHaveBeenLastCalledWith(multiple, false, undefined, "", "12:00");
  expect(morning.getByRole("button", { name: "Yes" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.change(noon.getByRole("textbox"), { target: { value: "Lunch break" } });
  fireEvent.blur(noon.getByRole("textbox"));
  expect(onSave).toHaveBeenLastCalledWith(multiple, false, undefined, "Lunch break", "12:00");
  expect((morning.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
});
