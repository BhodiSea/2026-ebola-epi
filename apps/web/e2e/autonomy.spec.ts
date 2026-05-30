import { expect, test } from "@playwright/test";

test("rows publish without pending_review badge after autonomy flip", async ({ page }) => {
  await page.goto("/today");
  // Wait for any stat card to confirm the page loaded with data.
  await page.locator("[data-stat-card]").first().waitFor({ timeout: 10_000 });
  // After the Phase 7 autonomy flip, case_counts rows default to status='published'.
  // No row should carry a pending-review UI badge.
  await expect(page.locator("[data-pending-review]")).toBeHidden();
});
