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

test("getInitialTheme defaults to dark even when the OS prefers light", () => {
  // Default is unconditionally dark (high-contrast); OS preference is ignored.
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches: true,
  } as MediaQueryList);
  expect(getInitialTheme()).toBe("dark");
});

test("getInitialTheme defaults to dark when nothing is stored", () => {
  expect(getInitialTheme()).toBe("dark");
});

test("getInitialTheme honors a stored dark choice", () => {
  localStorage.setItem("lm-theme", "dark");
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
