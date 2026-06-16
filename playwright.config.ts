import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load real-auth test credentials (gitignored) if present, so de-demo.spec.ts
// can sign in as a dedicated Supabase test user. Without them, de-demo.spec.ts
// skips itself — the rest of the suite still runs. See tests/e2e/.env.e2e.example.
const credFile = resolve(process.cwd(), "tests/e2e/.env.e2e");
if (existsSync(credFile)) {
  for (const line of readFileSync(credFile, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const DEMO_PORT = 5174;
const REAL_PORT = 5173;
const DEMO_URL = `http://127.0.0.1:${DEMO_PORT}`;
const REAL_URL = `http://127.0.0.1:${REAL_PORT}`;

// Two app surfaces, two servers:
//  - demo:     no Supabase env  -> "Login as Alex Kim" demo login (smoke)
//  - realauth: root .env.local  -> low-stim AuthScreen (login + de-demo)
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["list"]]
    : [["list"]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "demo-desktop",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: DEMO_URL },
    },
    {
      name: "demo-mobile",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Pixel 5"], baseURL: DEMO_URL },
    },
    {
      name: "realauth-desktop",
      testMatch: /(login|de-demo)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: REAL_URL },
    },
    {
      name: "realauth-mobile",
      testMatch: /(login|de-demo)\.spec\.ts/,
      use: { ...devices["Pixel 5"], baseURL: REAL_URL },
    },
  ],
  webServer: [
    {
      command: `npx vite --host 127.0.0.1 --port ${DEMO_PORT} --config tests/e2e/vite.demo.config.ts`,
      url: DEMO_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${REAL_PORT}`,
      url: REAL_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
