// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppearanceSettings } from "./appearance";

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.fontSize;
});

it("applies and remembers a text size preference", () => {
  render(<AppearanceSettings />);

  const large = screen.getByText("Large").closest("button")!;
  fireEvent.click(large);

  expect(document.documentElement.dataset.fontSize).toBe("large");
  expect(large.getAttribute("aria-pressed")).toBe("true");
});

it("keeps theme and text size controls independent", () => {
  render(<AppearanceSettings />);

  fireEvent.click(screen.getByRole("button", { name: /Ocean/ }));

  expect(document.documentElement.dataset.theme).toBe("ocean");
  expect(screen.getByRole("button", { name: /Standard/ }).getAttribute("aria-pressed")).toBe("true");
});
