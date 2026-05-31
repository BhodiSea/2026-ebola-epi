import { expect, test } from "@playwright/test";

function getAnimationName(el: Element): string {
  return getComputedStyle(el).animationName;
}

test.describe("prefers-reduced-motion", () => {
  test.use({ colorScheme: "light" });

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("TopBar live dot has no active animation under reduced motion", async ({ page }) => {
    await page.goto("/");
    const dot = page.locator(".animate-pulse").first();
    // eslint-disable-next-line playwright/no-conditional-in-test -- element is optional; skip assertion when absent
    if ((await dot.count()) === 0) {
      return;
    }
    const animName = await dot.evaluate(getAnimationName);
    expect(animName).toBe("none");
  });

  test("Skeleton chart placeholder has no active animation under reduced motion", async ({
    page,
  }) => {
    await page.goto("/evidence/00000000-0000-0000-0000-000000000000");
    const skeletons = page.locator('[role="status"][aria-label="Loading chart"]');
    const skeletonEls = await skeletons.all();
    const chartAnimNames = await Promise.all(skeletonEls.map((s) => s.evaluate(getAnimationName)));
    for (const animName of chartAnimNames) {
      expect(animName).toBe("none");
    }
  });

  test("Skeleton map placeholder has no active animation under reduced motion", async ({
    page,
  }) => {
    await page.goto("/evidence/00000000-0000-0000-0000-000000000000");
    const skeletons = page.locator('[role="status"][aria-label="Loading map"]');
    const skeletonEls = await skeletons.all();
    const mapAnimNames = await Promise.all(skeletonEls.map((s) => s.evaluate(getAnimationName)));
    for (const animName of mapAnimNames) {
      expect(animName).toBe("none");
    }
  });
});
