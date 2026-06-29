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
      nav.getByRole("button", { name: "Home", exact: true }),
    ).toHaveClass(/active/);

    // Switch through the current primary destinations; each tab activates in turn.
    for (const tab of ["Cabinet", "Family", "Settings", "Home"] as const) {
      await nav.getByRole("button", { name: tab, exact: true }).click();
      await expect(
        nav.getByRole("button", { name: tab, exact: true }),
      ).toHaveClass(/active/);
    }
  });

  // UI/UX + functionality for the notebook-rebuilt Review screen: the calm
  // structure renders and the approval toggle actually flips state.
  test("Review: approval rows render and the toggle flips state", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Login as Alex Kim" }).click();

    const nav = page.getByRole("navigation", { name: "Household sections" });
    await page.getByRole("button", { name: /Needs your OK/i }).click();

    // Calm notebook structure is present.
    await expect(
      page.getByRole("heading", { name: "Review", level: 1 }),
    ).toBeVisible();
    const queue = page.getByRole("region", { name: "Approval queue" });
    await expect(queue).toBeVisible();
    await expect(
      nav.getByRole("button", { name: "Home", exact: true }),
    ).toHaveClass(/active/);

    // Functionality: an inline toggle flips aria-checked on click.
    const firstToggle = queue.getByRole("switch").first();
    await expect(firstToggle).toBeChecked();
    await firstToggle.click();
    await expect(firstToggle).not.toBeChecked();
    await firstToggle.click();
    await expect(firstToggle).toBeChecked();

    // The single coral CTA reflects the selection count.
    await expect(
      queue.getByRole("button", { name: /Approve \d+/ }),
    ).toBeVisible();
  });

  // UI/UX + functionality for the notebook-rebuilt Capture screen: the flat
  // paste box accepts input and a category row prefills an example.
  test("Capture: paste box accepts text and a category row prefills", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Login as Alex Kim" }).click();

    await page
      .getByRole("button", { name: "Drop a thought or file" })
      .click();

    const capture = page.getByRole("region", { name: "Brain dump" });
    await expect(
      capture.getByRole("heading", { name: "Paste anything" }),
    ).toBeVisible();

    // Functionality: the paste box is editable.
    const box = capture.getByRole("textbox", {
      name: "Paste email, screenshot notes, forms, travel plans, or family admin",
    });
    await box.fill("Field trip permission slip due Friday.");
    await expect(box).toHaveValue(/Field trip permission slip/);

    // The Analyze CTA is present and enabled once there is content.
    await expect(
      capture.getByRole("button", { name: "Analyze intake" }),
    ).toBeEnabled();

    // A quiet category row prefills a worked example into the box.
    await capture.getByRole("button", { name: "Use travel template" }).click();
    await expect(box).toHaveValue(/TSA|PreCheck|packing/i);
  });
});
