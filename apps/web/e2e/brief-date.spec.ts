import { expect, test } from "@playwright/test";

// Date seeded in 20260531140000_daily_briefs.sql with review_status='published'.
const SEEDED_DATE = "2026-05-28";

test("brief page renders published brief headline", async ({ page }) => {
  await page.goto(`/brief/${SEEDED_DATE}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
  const h1 = page.getByRole("heading", { level: 1 });
  const text = await h1.textContent();
  expect(text?.trim().length).toBeGreaterThan(0);
});

test("brief page includes JSON-LD structured data", async ({ page }) => {
  await page.goto(`/brief/${SEEDED_DATE}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
  const scripts = page.locator('script[type="application/ld+json"]');
  expect(await scripts.count()).toBeGreaterThanOrEqual(1);
});

test("brief page returns 404 for an unpublished date", async ({ page }) => {
  const response = await page.goto("/brief/1999-01-01");
  expect(response?.status()).toBe(404);
});
