import { expect, test } from "@playwright/test";

const DEMO_QUOTE_ID: string | undefined = process.env.PHASE3_DEMO_QUOTE_ID;

test.describe("methods provenance", () => {
  test("Figure on /methods opens SourceQuoteCard on hover", async ({ page }) => {
    await page.goto("/methods");

    const figure = page.locator("[data-figure]").first();
    await expect(figure).toBeVisible();

    await figure.hover();
    await expect(page.locator("[data-source-quote-card]")).toBeVisible({ timeout: 500 });
  });

  test("click Figure opens SourceQuoteDrawer with chain of custody", async ({ page }) => {
    await page.goto("/methods");

    const figure = page.locator("[data-figure]").first();
    await figure.click();

    const drawer = page.locator("[data-source-quote-drawer]");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Chain of custody");
  });

  test("/evidence/[quote-id] renders verbatim quote", async ({ page }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(DEMO_QUOTE_ID === undefined, "PHASE3_DEMO_QUOTE_ID not set");

    await page.goto(`/evidence/${DEMO_QUOTE_ID ?? ""}`);
    await expect(page.locator("blockquote")).toBeVisible();
    await expect(page.locator("[data-source-quote-card]")).toBeHidden();
  });
});
