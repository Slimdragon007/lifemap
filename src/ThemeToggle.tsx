import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { getInitialTheme, toggleTheme, type Theme } from "./theme";

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme());
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      onClick={() => setThemeState(toggleTheme())}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
