import { expect, test } from "@playwright/test";

test("disagreement pill visible when multi-source conflict exists on confirmed stat card", async ({
  page,
}) => {
  await page.goto("/today");
  await page.locator('[data-stat-card="confirmed"]').waitFor({ timeout: 10_000 });

  // seed.sql inserts a divergent Africa CDC confirmed count for 2026-05-24.
  // get_disagreements RPC returns it alongside the WHO DON value, triggering the pill.
  const pill = page.locator("[data-disagreement-pill]").first();
  await expect(pill).toBeVisible({ timeout: 5000 });
});

test("hovering disagreement pill shows source comparison table", async ({ page }) => {
  await page.goto("/today");
  await page.locator('[data-stat-card="confirmed"]').waitFor({ timeout: 10_000 });

  const pill = page.locator("[data-disagreement-pill]").first();
  await expect(pill).toBeVisible({ timeout: 5000 });

  await pill.hover();

  await expect(page.locator("[data-disagreement-table]")).toBeVisible({ timeout: 3000 });
});
