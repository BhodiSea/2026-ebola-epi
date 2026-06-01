import { expect, test } from "@playwright/test";

const NO_RUNS_RE = /No runs found/i;

test("pipeline page renders without error", async ({ page }) => {
  await page.goto("/internal/pipeline");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
});

test("pipeline page shows empty-state message when no runs exist", async ({ page }) => {
  await page.goto("/internal/pipeline");
  await expect(page.getByText(NO_RUNS_RE)).toBeVisible({
    timeout: 10_000,
  });
});
