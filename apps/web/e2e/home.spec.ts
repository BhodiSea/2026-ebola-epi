import { expect, test } from "@playwright/test";

// / redirects to /today, which sets an absolute title (bypassing the layout template).
// Pattern matches app/today/page.tsx metadata.title.absolute.
const TITLE_PATTERN = /Bundibugyo Virus Outbreak 2026/;

test("home page has correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(TITLE_PATTERN);
});
