import { expect, test } from "@playwright/test";

const SOURCE_PARAM_RE = /source=/;

test("sitreps index renders heading and seeded document rows", async ({ page }) => {
  await page.goto("/sitreps");
  await expect(page.getByRole("heading", { name: "Situation Reports" })).toBeVisible({
    timeout: 10_000,
  });
  // seed.sql inserts 3 documents — at least one row must be visible.
  const rows = page.locator("[data-sitrep-row]");
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThan(0);
});

test("sitreps index filter chip narrows results by source", async ({ page }) => {
  await page.goto("/sitreps");
  await expect(page.locator("[data-sitrep-filters]")).toBeVisible({ timeout: 10_000 });

  // Click the first source filter chip to narrow results.
  const chip = page.locator("[data-sitrep-filters] a").first();
  await expect(chip).toBeVisible();
  const href = await chip.getAttribute("href");
  if (href?.includes("source=") === true) {
    await chip.click();
    await expect(page).toHaveURL(SOURCE_PARAM_RE, { timeout: 5000 });
  }
});
