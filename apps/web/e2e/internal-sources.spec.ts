import { expect, test } from "@playwright/test";

test("sources page lists the seeded who-don source", async ({ page }) => {
  await page.goto("/internal/sources");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("who-don")).toBeVisible();
});

test("pause button toggles source pause state", async ({ page }) => {
  await page.goto("/internal/sources");
  await expect(page.getByText("who-don")).toBeVisible({ timeout: 10_000 });

  const pauseBtn = page.getByRole("button", { name: "Pause" }).first();
  await expect(pauseBtn).toBeVisible();
  await pauseBtn.click();

  // After toggling, the button label flips to Resume.
  await expect(page.getByRole("button", { name: "Resume" }).first()).toBeVisible({
    timeout: 8000,
  });

  // Restore to original state.
  await page.getByRole("button", { name: "Resume" }).first().click();
  await expect(page.getByRole("button", { name: "Pause" }).first()).toBeVisible({
    timeout: 8000,
  });
});
