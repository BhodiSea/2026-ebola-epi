import { expect, test } from "@playwright/test";

const DETAIL_URL = "/outbreaks/bundibugyo/cod/2026-04-20";

test("outbreak detail page renders all 5 tabs", async ({ page }) => {
  await page.goto(DETAIL_URL);
  await expect(page.locator('[data-tab="brief"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-tab="epi-curve"]')).toBeVisible();
  await expect(page.locator('[data-tab="geography"]')).toBeVisible();
  await expect(page.locator('[data-tab="sources"]')).toBeVisible();
  await expect(page.locator('[data-tab="methods"]')).toBeVisible();
});

test("clicking Geography tab renders choropleth stub", async ({ page }) => {
  await page.goto(DETAIL_URL);
  const geoTab = page.locator('[data-tab="geography"]');
  await geoTab.waitFor({ timeout: 10_000 });
  await geoTab.click();
  await expect(page.locator("[data-outbreak-choropleth]")).toBeVisible({ timeout: 5000 });
});
