import { expect, test } from "@playwright/test";

/* eslint-disable playwright/expect-expect -- assertions are inside the assertOgImage helper */
function assertOgImage(response: { headers(): Record<string, string>; status(): number }) {
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
}

test("/today/opengraph-image — returns 200 image/png", async ({ request }) => {
  assertOgImage(await request.get("/today/opengraph-image"));
});

test("/outbreaks/.../opengraph-image — returns 200 image/png", async ({ request }) => {
  assertOgImage(await request.get("/outbreaks/bundibugyo/cod/2026-04-20/opengraph-image"));
});

test("/brief/.../opengraph-image — returns 200 image/png", async ({ request }) => {
  assertOgImage(await request.get("/brief/2026-05-29/opengraph-image"));
});

test("/zone/.../opengraph-image — returns 200 image/png", async ({ request }) => {
  assertOgImage(await request.get("/zone/CD-IT-001/opengraph-image"));
});

// Evidence OG always renders (gracefully handles missing quote; defaults to empty text).
test("/evidence/.../opengraph-image — returns 200 image/png", async ({ request }) => {
  assertOgImage(
    await request.get("/evidence/00000000-0000-0000-0000-000000000001/opengraph-image"),
  );
});
