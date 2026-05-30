import { expect, test } from "@playwright/test";

test("/today/opengraph-image — returns 200 or 404", async ({ request }) => {
  const response = await request.get("/today/opengraph-image");
  expect([200, 404]).toContain(response.status());
});

test("/outbreaks/.../opengraph-image — returns 200 or 404", async ({ request }) => {
  const response = await request.get("/outbreaks/bundibugyo/cod/2026-04-20/opengraph-image");
  expect([200, 404]).toContain(response.status());
});

test("/brief/.../opengraph-image — returns 200 or 404", async ({ request }) => {
  const response = await request.get("/brief/2026-05-29/opengraph-image");
  expect([200, 404]).toContain(response.status());
});

test("/zone/.../opengraph-image — returns 200 or 404", async ({ request }) => {
  const response = await request.get("/zone/CD-IT-001/opengraph-image");
  expect([200, 404]).toContain(response.status());
});
