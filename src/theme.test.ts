import { afterEach, beforeEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});
import { getInitialTheme, setTheme, toggleTheme, applyTheme } from "./theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

test("getInitialTheme prefers stored value", () => {
  localStorage.setItem("lm-theme", "light");
  expect(getInitialTheme()).toBe("light");
});

test("getInitialTheme falls back to prefers-color-scheme", () => {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches: true,
  } as MediaQueryList);
  expect(getInitialTheme()).toBe("light"); // matchMedia('(prefers-color-scheme: light)') === true
});

test("getInitialTheme defaults to dark when nothing set", () => {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches: false,
  } as MediaQueryList);
  expect(getInitialTheme()).toBe("dark");
});

test("applyTheme sets data-theme on <html>", () => {
  applyTheme("dark");
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
});

test("setTheme persists and applies", () => {
  setTheme("light");
  expect(localStorage.getItem("lm-theme")).toBe("light");
  expect(document.documentElement.getAttribute("data-theme")).toBe("light");
});

test("toggleTheme flips and returns the new theme", () => {
  setTheme("dark");
  expect(toggleTheme()).toBe("light");
  expect(document.documentElement.getAttribute("data-theme")).toBe("light");
});
