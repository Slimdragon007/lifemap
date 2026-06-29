import { expect, test, type Page } from "@playwright/test";

async function enterDemoApp(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Login as Alex Kim" }).click();
  await expect(
    page.getByRole("navigation", { name: "Household sections" }),
  ).toBeVisible();
}

test.describe("mobile shell", () => {
  test("Today heading clears the iPhone top safe area and dock stays fixed", async ({
    page,
  }) => {
    await enterDemoApp(page);

    const heading = page.getByRole("heading", { name: "Today", level: 1 });
    await expect(heading).toBeVisible();

    const box = await heading.boundingBox();
    expect(box?.y).toBeGreaterThanOrEqual(18);

    const dock = page.locator(".bottom-nav");
    const dockStyles = await dock.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        position: styles.position,
        columns: styles.gridTemplateColumns.split(" ").length,
      };
    });
    expect(dockStyles).toEqual({ position: "fixed", columns: 4 });
  });

  test("member profile content scrolls above the fixed dock", async ({
    page,
  }) => {
    await enterDemoApp(page);

    const nav = page.getByRole("navigation", { name: "Household sections" });
    await nav.getByRole("button", { name: "Family", exact: true }).click();
    await page
      .getByRole("button", { name: "Open Casey Kim's profile" })
      .click();

    const dock = page.locator(".bottom-nav");
    const lastSection = page.locator(".member-profile .calm-section").last();
    await expect(lastSection).toBeVisible();

    await lastSection.scrollIntoViewIfNeeded();

    const [sectionBox, dockBox] = await Promise.all([
      lastSection.boundingBox(),
      dock.boundingBox(),
    ]);

    expect(sectionBox).not.toBeNull();
    expect(dockBox).not.toBeNull();
    expect(sectionBox!.y + sectionBox!.height).toBeLessThanOrEqual(dockBox!.y);
  });

  test("family-first path reaches profile customization, Cabinet, and Review", async ({
    page,
  }) => {
    await enterDemoApp(page);

    await expect(
      page.getByRole("heading", { name: "Drop anything here." }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Household sections" })
      .getByRole("button", { name: "Family", exact: true })
      .click();

    await expect(
      page.getByRole("heading", { name: "Family dashboard" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Open Casey Kim's profile" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Casey Kim" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Add section" }).click();
    await page.getByLabel("Section name").fill("Sports");
    await page.getByRole("button", { name: "Save section" }).click();

    await expect(page.getByRole("status")).toContainText(
      "Sports was added to Casey Kim.",
    );
    await expect(page.getByRole("region", { name: "Sports" })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Household sections" });
    await nav.getByRole("button", { name: "Cabinet", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Cabinet" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Casey" })).toBeVisible();
    await expect(page.getByText("Casey passport")).toBeVisible();

    await nav.getByRole("button", { name: "Home", exact: true }).click();
    await page.getByRole("button", { name: /Needs your OK/i }).click();
    await expect(
      page.getByRole("heading", { name: "Review", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Approve before LifeMap acts" }),
    ).toBeVisible();
  });
});
