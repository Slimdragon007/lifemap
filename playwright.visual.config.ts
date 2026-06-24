import { defineConfig, devices } from "@playwright/test";

// Visual-regression config, kept SEPARATE from the e2e `playwright.config.ts`
// so the two suites don't cross-pollinate:
//   - e2e (playwright.config.ts):     tests/e2e/**, dev servers, behaviour
//   - visual (this file):             tests/visual/**, a built demo preview,
//                                     pixel-diff baselines
// Run via `npm run test:visual` (which passes `--config` to this file).
//
// The web server BUILDS in demo mode (no Supabase env) and serves the static
// `dist/` with `vite preview`. We build with the demo Vite config so the bundle
// reads env from tests/e2e/env-demo (no VITE_SUPABASE_*), guaranteeing the
// "Login as Alex Kim" one-click demo login regardless of any root .env*.
const PORT = 4317;
const URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/visual",
  testMatch: "**/*.visual.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  // Determinism for pixel diffs: tight tolerance, animations frozen (the latter
  // is the default for toHaveScreenshot, restated here for intent).
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    },
  },
  use: {
    baseURL: URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: `npx vite build --config tests/e2e/vite.demo.config.ts && npx vite preview --config tests/e2e/vite.demo.config.ts --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
