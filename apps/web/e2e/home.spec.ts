import { expect, test } from "@playwright/test";

const TITLE_PATTERN = /ituri-sitrep/;

test("home page has correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(TITLE_PATTERN);
});
