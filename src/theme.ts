export type Theme = "light" | "dark";
const KEY = "lm-theme";

export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* ignore */
  }
  // Default to the light Mac-assistant direction. A saved choice always wins.
  return "light";
}

export function applyTheme(t: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = t;
}

export function setTheme(t: Theme): void {
  applyTheme(t);
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
}

export function toggleTheme(): Theme {
  const next: Theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
