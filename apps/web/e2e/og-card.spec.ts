// covers OG image routes: 200 + image/png + body >= 5KB (real satori output, not empty fallback)
import type { APIResponse } from "@playwright/test";
import { expect, test } from "@playwright/test";

/* eslint-disable playwright/expect-expect -- assertions are inside the assertOgImage helper */
async function assertOgImage(response: APIResponse) {
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  // Real OG images must contain actual content — the empty fallback is < 2 KB.
  // Use body() rather than content-length header; dev server uses chunked encoding.
  const body = await response.body();
  expect(body.length).toBeGreaterThanOrEqual(5000);
}

test("/today/opengraph-image — returns 200 image/png", async ({ request }) => {
  await assertOgImage(await request.get("/today/opengraph-image"));
});

test("/outbreaks/.../opengraph-image — returns 200 image/png", async ({ request }) => {
  await assertOgImage(await request.get("/outbreaks/bundibugyo/cod/2026-04-20/opengraph-image"));
});

test("/brief/.../opengraph-image — returns 200 image/png", async ({ request }) => {
  await assertOgImage(await request.get("/brief/2026-05-28/opengraph-image"));
});

test("/zone/.../opengraph-image — returns 200 image/png", async ({ request }) => {
  await assertOgImage(await request.get("/zone/CD-IT-001/opengraph-image"));
});

// Evidence OG rendered with a real seeded quote — asserts non-empty content.
test("/evidence/.../opengraph-image — returns 200 image/png", async ({ request }) => {
  const quoteId = process.env.PHASE3_DEMO_QUOTE_ID ?? "a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";
  await assertOgImage(await request.get(`/evidence/${quoteId}/opengraph-image`));
});
