import { test, expect, type Page } from "@playwright/test";

// Visual-regression baselines for the key demo-mode surfaces, light + dark.
//
// Determinism (so pixel diffs only fire on real layout regressions):
//   - clock:      frozen to 2026-06-23T15:00:00 BEFORE goto, so the
//                 time-of-day greeting ("Good afternoon") is stable.
//   - theme:      forced via localStorage['lm-theme'] in an init script BEFORE
//                 load, so first paint is already the target theme.
//   - animations: disabled by toHaveScreenshot (see playwright.visual.config).
//   - data:       demo mode (no Supabase env) => deterministic Alex Kim sample
//                 data, no network.
//
// Real-auth surfaces (the low-stim AuthScreen) need Supabase env and are
// intentionally OUT of scope here — covered by the e2e suite instead.

const FROZEN = new Date("2026-06-23T15:00:00");

async function prepare(page: Page, theme: "dark" | "light") {
  // Seed the theme before any app code runs.
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem("lm-theme", t);
    } catch {
      /* ignore */
    }
  }, theme);
  // Freeze time before navigation so the greeting is stable.
  await page.clock.install({ time: FROZEN });
}

async function enterApp(page: Page) {
  await page.goto("/");
  const login = page.getByRole("button", { name: "Login as Alex Kim" });
  if (await login.isVisible().catch(() => false)) {
    await login.click();
  }
  // Confirm we're inside the app shell before screenshotting.
  await expect(
    page.getByRole("navigation", { name: "Household sections" }),
  ).toBeVisible();
}

async function shoot(page: Page, name: string) {
  // Let any one-shot load spinners settle, then snapshot the full page.
  await page.waitForTimeout(700);
  await expect(page).toHaveScreenshot(name, { fullPage: true });
}

for (const theme of ["dark", "light"] as const) {
  test.describe(`${theme} theme`, () => {
    test("Today", async ({ page }) => {
      await prepare(page, theme);
      await enterApp(page);
      await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
      await shoot(page, `today-${theme}.png`);
    });

    test("Settings", async ({ page }) => {
      await prepare(page, theme);
      await enterApp(page);
      await page.getByRole("button", { name: "Settings" }).click();
      await expect(
        page.getByRole("heading", { name: "Settings" }),
      ).toBeVisible();
      await shoot(page, `settings-${theme}.png`);
    });

    test("Vault", async ({ page }) => {
      await prepare(page, theme);
      await enterApp(page);
      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "Open vault" }).click();
      await expect(page.getByRole("heading", { name: "Vault" })).toBeVisible();
      await shoot(page, `vault-${theme}.png`);
    });

    test("Important dates", async ({ page }) => {
      await prepare(page, theme);
      await enterApp(page);
      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "Open important dates" }).click();
      await expect(
        page.getByRole("heading", { name: "Important dates" }),
      ).toBeVisible();
      await shoot(page, `dates-${theme}.png`);
    });

    test("Capture", async ({ page }) => {
      await prepare(page, theme);
      await enterApp(page);
      await page.getByRole("button", { name: "Add", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Brain dump" }),
      ).toBeVisible();
      await shoot(page, `capture-${theme}.png`);
    });
  });
}
