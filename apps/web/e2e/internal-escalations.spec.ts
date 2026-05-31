import { expect, test } from "@playwright/test";

// Stable seed UUID from supabase/seed.sql WP7 additions.
const INCIDENT_ID = "11111111-1111-1111-1111-111111111111";

test("escalations page renders the seeded open incident card", async ({ page }) => {
  await page.goto("/internal/escalations");
  const card = page.locator(`[data-testid="card-${INCIDENT_ID}"]`);
  await expect(card).toBeVisible({ timeout: 10_000 });
});

test("escalations page shows Ack button on incident card", async ({ page }) => {
  await page.goto("/internal/escalations");
  const card = page.locator(`[data-testid="card-${INCIDENT_ID}"]`);
  await expect(card).toBeVisible({ timeout: 10_000 });
  const ackBtn = card.getByRole("button", { name: "Acknowledge incident" });
  await expect(ackBtn).toBeVisible();
  await expect(ackBtn).toBeEnabled();
});
