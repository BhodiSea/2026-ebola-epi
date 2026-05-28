import { expect, test } from "@playwright/test";

const DATA_SOURCES_HEADING_RE = /Data sources/i;

test.describe("/about/data-sources", () => {
  test("renders at least one source posture section", async ({ page }) => {
    await page.goto("/about/data-sources");
    const postures = page.locator("[data-source-posture]");
    await expect(postures.first()).toBeVisible({ timeout: 10_000 });
  });

  test("page heading is visible", async ({ page }) => {
    await page.goto("/about/data-sources");
    await expect(page.getByRole("heading", { name: DATA_SOURCES_HEADING_RE })).toBeVisible();
  });
});
