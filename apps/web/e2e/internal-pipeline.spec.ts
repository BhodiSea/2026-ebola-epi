import { expect, test } from "@playwright/test";

const NO_API_KEY_RE = /No runs found|Verify INNGEST_API_KEY/i;

test("pipeline page renders when INNGEST_API_KEY is absent", async ({ page }) => {
  // The pipeline page fetches Inngest server-side; without INNGEST_API_KEY it
  // renders the placeholder rather than crashing.
  await page.goto("/internal/pipeline");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
});

test("pipeline page shows empty-state message when no API key is configured", async ({ page }) => {
  await page.goto("/internal/pipeline");
  // Server renders "No runs found. Verify INNGEST_API_KEY is set." when the key
  // is absent — confirmed in apps/web/app/internal/pipeline/page.tsx:26.
  await expect(page.getByText(NO_API_KEY_RE)).toBeVisible({
    timeout: 10_000,
  });
});
