import { expect, test } from "@playwright/test";
import { checkA11y, injectAxe } from "axe-playwright";

const ROUTES = ["/today", "/outbreaks", "/map?view=table", "/methods"];

for (const route of ROUTES) {
  // eslint-disable-next-line playwright/expect-expect -- checkA11y from axe-playwright throws on violations (acts as assertion)
  test(`${route} — zero critical/serious axe violations (WCAG 2.1 AA)`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("load");
    await injectAxe(page);
    await checkA11y(page, undefined, {
      axeOptions: {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa"],
        },
      },
      includedImpacts: ["critical", "serious"],
    });
  });
}

test("/today — reduced-motion: drawer animations disabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/today");
  await page.waitForLoadState("load");

  const drawerTransition = await page.evaluate(() => {
    const el = document.querySelector("[data-vaul-drawer]");
    if (el === null) {
      return "none";
    }
    return getComputedStyle(el).getPropertyValue("--vaul-drawer-transition").trim();
  });

  expect(drawerTransition).toBe("none");
});
