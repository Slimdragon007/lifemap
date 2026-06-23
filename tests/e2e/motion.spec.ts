import { test, expect, type Page } from "@playwright/test";

// Verifies the locked "Right-sized" low-stim motion spec is actually wired in
// the running app (not just present in source). Runs on the demo server (no
// Supabase env -> one-click "Login as Alex Kim"), since the priority cards and
// assistant orb live behind the login. Selectors are class/role to match the
// existing suite. Spec source of truth: docs/lifemap-design-rationale.md.

async function enterApp(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Login as Alex Kim" }).click();
  await expect(
    page.getByRole("navigation", { name: "Household sections" }),
  ).toBeVisible();
}

test.describe("low-stim motion spec", () => {
  test("stillness at rest: no persistent ambient motion on Today", async ({
    page,
  }) => {
    await enterApp(page);
    // Let any functional load spinners resolve before sampling at-rest state.
    await page.waitForTimeout(600);

    const looping = await page.evaluate(() =>
      Array.from(document.querySelectorAll("*"))
        .filter((el) => {
          const cs = getComputedStyle(el);
          return (
            cs.animationName !== "none" &&
            cs.animationIterationCount.includes("infinite")
          );
        })
        .map(
          (el) =>
            `${(el as HTMLElement).className} :: ${getComputedStyle(el).animationName}`,
        ),
    );

    // The killed assistant-breathe loop would show up here; nothing should.
    expect(looping).toEqual([]);
  });

  test("assistant orb is static (breathing loop removed)", async ({ page }) => {
    await enterApp(page);
    const orb = page.locator(".assistant-orb").first();
    if ((await orb.count()) === 0) {
      test.skip(true, "no assistant orb rendered on this view");
    }
    await expect(orb).toBeVisible();
    const animName = await orb.evaluate(
      (el) => getComputedStyle(el).animationName,
    );
    expect(animName).toBe("none");
  });

  test("content-enter animations stay within the 300ms cap", async ({
    page,
  }) => {
    await enterApp(page);
    const durations = await page.evaluate(() => {
      const out: number[] = [];
      for (const el of Array.from(document.querySelectorAll("*"))) {
        const cs = getComputedStyle(el);
        if (cs.animationName === "none") continue;
        if (cs.animationIterationCount.includes("infinite")) continue; // functional spinners
        for (const d of cs.animationDuration.split(","))
          out.push(parseFloat(d));
      }
      return out;
    });
    // Every one-shot entrance must respect the 300ms cap (small epsilon).
    for (const sec of durations) expect(sec).toBeLessThanOrEqual(0.301);
  });

  test("priority cards settle state changes via the 140ms transition", async ({
    page,
  }) => {
    await enterApp(page);
    const card = page.locator(".atlas-task-card").first();
    await expect(card).toBeVisible();
    const { dur, prop } = await card.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { dur: cs.transitionDuration, prop: cs.transitionProperty };
    });
    expect(prop).toContain("transform");
    expect(prop).toContain("opacity");
    expect(dur).toContain("0.14s"); // --motion-state
  });

  test("press feedback scales a tappable control to 0.98 on pointer down", async ({
    page,
  }) => {
    await enterApp(page);
    const card = page.locator(".atlas-task-card").first();
    await expect(card).toBeVisible();
    // hover() scrolls into view + waits for actionability, so the pointer
    // reliably lands on the card and engages :active on mouse down.
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.mouse.down();
    // Poll so the 100ms press transition has time to reach scale(0.98).
    await expect
      .poll(() => card.evaluate((el) => getComputedStyle(el).transform))
      .toMatch(/^matrix\(0\.98,\s*0,\s*0,\s*0\.98,/);
    await page.mouse.up();
  });

  test("prefers-reduced-motion neutralizes the press transform", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await enterApp(page);
    const card = page.locator(".atlas-task-card").first();
    await expect(card).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.mouse.down();
    const transform = await card.evaluate(
      (el) => getComputedStyle(el).transform,
    );
    await page.mouse.up();
    // No press scale under reduced motion: identity transform (or none).
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
  });
});
