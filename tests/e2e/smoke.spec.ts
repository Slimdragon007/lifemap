import { test, expect } from "@playwright/test";

// Demo-mode server (no Supabase env) -> the one-click "Login as Alex Kim" demo
// login. This guards the restyled low-stim UI against crashes and broken
// bottom-tab navigation. Selectors are role/text (the app has no data-testid),
// matching the existing Vitest suite.
test.describe("demo smoke", () => {
  test("demo login renders the app and bottom-tab nav switches views", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Login as Alex Kim" }).click();

    // Entered the app: the bottom-section nav is present.
    const nav = page.getByRole("navigation", { name: "Household sections" });
    await expect(nav).toBeVisible();
    await expect(
      nav.getByRole("button", { name: "Today", exact: true }),
    ).toHaveClass(/active/);

    // Switch Today -> Calendar -> Vault -> Today; each tab activates in turn.
    for (const tab of ["Calendar", "Vault", "Today"] as const) {
      await nav.getByRole("button", { name: tab, exact: true }).click();
      await expect(
        nav.getByRole("button", { name: tab, exact: true }),
      ).toHaveClass(/active/);
    }
  });
});
