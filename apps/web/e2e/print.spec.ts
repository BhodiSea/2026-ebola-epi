import { expect, test } from "@playwright/test";

test("/today — print media hides nav elements", async ({ page }) => {
  await page.emulateMedia({ media: "print" });
  await page.goto("/today");
  await page.waitForLoadState("load");

  const navRail = page.locator("[data-nav-rail]");
  const topBar = page.locator("[data-top-bar]");
  const bottomTabNav = page.locator("[data-bottom-tab-nav]");

  await expect(navRail).toBeHidden();
  await expect(topBar).toBeHidden();
  await expect(bottomTabNav).toBeHidden();
});

test("/outbreaks — print media hides nav elements", async ({ page }) => {
  await page.emulateMedia({ media: "print" });
  await page.goto("/outbreaks");
  await page.waitForLoadState("load");

  const navRail = page.locator("[data-nav-rail]");
  await expect(navRail).toBeHidden();
});

test("/methods — print media hides nav and page is readable", async ({ page }) => {
  await page.emulateMedia({ media: "print" });
  await page.goto("/methods");
  await page.waitForLoadState("load");

  const navRail = page.locator("[data-nav-rail]");
  await expect(navRail).toBeHidden();

  const main = page.locator("main");
  await expect(main).toBeVisible();
});
