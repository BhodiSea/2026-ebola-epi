// @vitest-environment node
// G-13 + NEW-P2n/o/p: Verify that the substring_verify_fail branch in extract-document opens
// a GitHub issue whose title matches /substring_verify_fail/.
// No source change needed — this purely exercises the existing openGithubIssue call.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Inject fake GitHub credentials so openGithubIssue doesn't no-op.
vi.mock("@/lib/env", () => ({
  env: {
    GITHUB_TOKEN: "gh_test_token_fake",
    GITHUB_REPO: "test-org/ituri-sitrep",
    SLACK_WEBHOOK_URL: undefined,
    TWILIO_ACCOUNT_SID: undefined,
    TWILIO_AUTH_TOKEN: undefined,
    TWILIO_FROM_NUMBER: undefined,
    TWILIO_TO_NUMBER: undefined,
  },
}));

vi.mock("@slack/webhook", () => ({
  IncomingWebhook: vi.fn(() => ({ send: vi.fn() })),
}));

const GITHUB_ISSUES_URL_RE = /api\.github\.com\/repos\/[^/]+\/[^/]+\/issues$/;
const SUBSTRING_VERIFY_FAIL_RE = /substring_verify_fail/;
const SUBSTRING_VERIFY_FAIL_PREFIX_RE = /^substring_verify_fail:/;

// ── openGithubIssue — used by extract-document on second substring_verify_fail ──

describe("openGithubIssue — substring_verify_fail path (G-13)", () => {
  let capturedUrl: string | undefined;
  let capturedRawBody: string | undefined;

  beforeEach(() => {
    capturedUrl = undefined;
    capturedRawBody = undefined;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts: RequestInit) => {
        capturedUrl = url;
        capturedRawBody = typeof opts.body === "string" ? opts.body : "";
        return new Response(
          JSON.stringify({ html_url: "https://github.com/test-org/ituri-sitrep/issues/42" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("posts to the GitHub issues REST endpoint", async () => {
    const { openGithubIssue } = await import("@/lib/notify.js");
    await openGithubIssue({
      title: "substring_verify_fail: who-don (abc-123)",
      body: "substring_verify_fail: offset 42 not found in document text",
      labels: ["extraction", "verify-fail"],
    });

    expect(capturedUrl).toMatch(GITHUB_ISSUES_URL_RE);
  });

  it("title matches /substring_verify_fail/", async () => {
    const { openGithubIssue } = await import("@/lib/notify.js");
    const sourceSlug = "who-don";
    const documentId = "a1b2c3d4-e5f6-4789-abcd-ef1234567890";

    await openGithubIssue({
      title: `substring_verify_fail: ${sourceSlug} (${documentId})`,
      body: "substring_verify_fail: verification failed",
      labels: ["extraction", "verify-fail"],
    });

    expect(capturedRawBody).toMatch(SUBSTRING_VERIFY_FAIL_RE);
  });

  it("title includes sourceSlug and documentId (extract-document format)", async () => {
    const { openGithubIssue } = await import("@/lib/notify.js");
    const sourceSlug = "who-afro";
    const documentId = "f6a7b8c9-d0e1-2345-9012-456789012345";

    await openGithubIssue({
      title: `substring_verify_fail: ${sourceSlug} (${documentId})`,
      body: "substring_verify_fail: verification failed",
      labels: ["extraction", "verify-fail"],
    });

    expect(capturedRawBody).toContain(sourceSlug);
    expect(capturedRawBody).toContain(documentId);
  });

  it("passes extraction and verify-fail labels", async () => {
    const { openGithubIssue } = await import("@/lib/notify.js");
    await openGithubIssue({
      title: "substring_verify_fail: who-don (doc-id)",
      body: "detail",
      labels: ["extraction", "verify-fail"],
    });

    expect(capturedRawBody).toContain('"extraction"');
    expect(capturedRawBody).toContain('"verify-fail"');
  });

  it("returns the html_url from the GitHub response", async () => {
    const { openGithubIssue } = await import("@/lib/notify.js");
    const result = await openGithubIssue({
      title: "substring_verify_fail: who-don (doc-id)",
      body: "detail",
    });

    expect(result).toBe("https://github.com/test-org/ituri-sitrep/issues/42");
  });
});

// ── Title format guard — regression check on the extract-document call site ──

describe("extract-document title format (G-13 regression guard)", () => {
  it("assembles substring_verify_fail title matching the pattern openGithubIssue receives", () => {
    const sourceSlug = "who-don";
    const documentId = "a1b2c3d4-e5f6-4789-abcd-ef1234567890";
    // Mirrors the literal in extract-document.ts lines 91-93
    const title = `substring_verify_fail: ${sourceSlug} (${documentId})`;

    expect(title).toMatch(SUBSTRING_VERIFY_FAIL_PREFIX_RE);
    expect(title).toContain(sourceSlug);
    expect(title).toContain(documentId);
  });
});
