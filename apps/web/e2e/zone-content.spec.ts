import { expect, test } from "@playwright/test";

// Health zone seeded in supabase/seed.sql (geo.admin2 + case_counts).
const ZONE_CODE = "COD-IT-IR";

test("zone page renders heading with zone code", async ({ page }) => {
  await page.goto(`/zone/${ZONE_CODE}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(ZONE_CODE);
});

test("zone page shows Confirmed, Deaths, and CFR stat labels", async ({ page }) => {
  await page.goto(`/zone/${ZONE_CODE}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Confirmed")).toBeVisible();
  await expect(page.getByText("Deaths")).toBeVisible();
  await expect(page.getByText("CFR")).toBeVisible();
});
