import { expect, test } from "@playwright/test";

const NO_DOCS_RE = /no.*document|nothing to backfill/i;
const ENQUEUE_BTN_RE = /Enqueue back-fill/i;
const ENQUEUED_TOAST_RE = /Enqueued \d+ document/i;

test("backfill page renders document list", async ({ page }) => {
  await page.goto("/internal/backfill");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
});

test("selecting a document and submitting enqueues a backfill", async ({ page }) => {
  await page.goto("/internal/backfill");

  // Check the first available checkbox (un-extracted document).
  const checkboxes = page.getByRole("checkbox");
  const count = await checkboxes.count();

  if (count === 0) {
    // No un-extracted documents in this seed run — page renders "no documents" state.
    await expect(page.getByText(NO_DOCS_RE)).toBeVisible({ timeout: 5000 });
    return;
  }

  await checkboxes.first().check();

  const submitBtn = page.getByRole("button", { name: ENQUEUE_BTN_RE });
  await expect(submitBtn).toBeEnabled();
  await submitBtn.click();

  // Success toast rendered by BackfillEnqueueForm.
  await expect(page.getByText(ENQUEUED_TOAST_RE)).toBeVisible({ timeout: 10_000 });
});
