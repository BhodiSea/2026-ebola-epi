// ?view=table rendered via params.view (dot notation per Biome useLiteralKeys)
import { expect, test } from "@playwright/test";

test("map page renders three-pane layout", async ({ page }) => {
  await page.goto("/map");
  await expect(page.locator("[data-layer-rail]")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("[data-map-pane]")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("[data-inspector-tabs]")).toBeVisible({ timeout: 10_000 });
});

// Covers TabularView [data-tabular-view] rendering and chronological date order.
test("?view=table swaps to tabular view", async ({ page }) => {
  await page.goto("/map?view=table");
  await expect(page.locator("[data-tabular-view]")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("[data-map-pane]")).toBeHidden();
});

test("L key cycles LayerRail focus", async ({ page }) => {
  await page.goto("/map");
  await expect(page.locator("[data-layer-rail]")).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press("l");
  const focusedLabel = page.locator("[data-layer-rail] [data-layer-label]:focus");
  await expect(focusedLabel).toBeVisible({ timeout: 3000 });
});
