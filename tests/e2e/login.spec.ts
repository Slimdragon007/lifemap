import { test, expect } from "@playwright/test";

// Real-auth server (root .env.local loaded) -> the low-stim AuthScreen.
// Verifies the production login renders and that NO demo "Login as Alex Kim"
// escape hatch leaks into a Supabase-configured build.
test.describe("real-auth login screen", () => {
  test("shows the low-stim email/password sign-in, not the demo login", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Welcome back." }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    // The demo escape hatch must not exist in a real-auth build.
    await expect(
      page.getByRole("button", { name: "Login as Alex Kim" }),
    ).toHaveCount(0);
  });
});
