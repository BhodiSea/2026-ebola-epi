import { expect, test } from "@playwright/test";

test("cold load /today completes in under 10 seconds", async ({ page }) => {
  const start = Date.now();
  await page.goto("/today");
  await page.locator("[data-stat-card]").first().waitFor({ timeout: 10_000 });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(10_000);
});

test("hover confirmed stat card surfaces source-quote-card", async ({ page }) => {
  await page.goto("/today");
  await page.locator('[data-stat-card="confirmed"]').waitFor({ timeout: 10_000 });

  const figure = page.locator('[data-stat-card="confirmed"] [data-figure]').first();
  await figure.hover();

  await expect(page.locator("[data-source-quote-card]")).toBeVisible({ timeout: 5000 });
});
