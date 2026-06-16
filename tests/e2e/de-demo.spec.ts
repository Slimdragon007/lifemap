import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

// ⭐ Regression guard for the de-demo bug: a REAL authenticated session must NOT
// render the hardcoded "Alex Kim" demo identity (App.tsx demo seed, the
// TodayView avatar, the VaultView contact line). Requires a DEDICATED Supabase
// test user — set E2E_EMAIL / E2E_PASSWORD in tests/e2e/.env.e2e (gitignored;
// see .env.e2e.example). Skips when absent.
//
// Against the current bug this test FAILS (proving the bug exists). Once the
// de-demo fix lands — real accounts render their own empty/onboarding state —
// it turns green and locks the fix in place.
test.describe("de-demo: real session shows the user's own identity", () => {
  test.skip(
    !email || !password,
    "Set E2E_EMAIL/E2E_PASSWORD in tests/e2e/.env.e2e to run this guard",
  );

  test("no 'Alex Kim' demo data leaks into a real authenticated session", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Wait until we're past the AuthScreen and inside the app.
    await expect(
      page.getByRole("navigation", { name: "Household sections" }),
    ).toBeVisible({ timeout: 15_000 });

    // The bug: the demo identity is rendered for every authenticated user.
    await expect(page.getByText("Alex Kim")).toHaveCount(0);
  });
});
