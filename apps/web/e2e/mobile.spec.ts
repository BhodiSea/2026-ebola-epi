import { expect, test } from "@playwright/test";

test("mobile /map shows vaul bottom sheet at peek snap", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/map");
  await expect(page.locator("[data-vaul-drawer]")).toBeVisible();
  const box = await page.locator("[data-vaul-drawer]").boundingBox();
  expect(box?.height).toBeLessThan(120);
});

test("mobile bottom-tab navigation is visible on /today", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/today");
  await expect(page.locator("[data-bottom-tab-nav]")).toBeVisible();
});

test("mobile bottom-tab navigation is hidden on desktop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/today");
  // The bottom-tab nav is hidden via md:hidden CSS — it exists but is not visible
  await expect(page.locator("[data-bottom-tab-nav]")).toBeHidden();
});

test("desktop /map does not show vaul bottom sheet", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/map");
  await expect(page.locator("[data-vaul-drawer]")).toBeHidden();
});
