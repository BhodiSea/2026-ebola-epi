// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

// ── Config assertions ────────────────────────────────────────────────────────
// Importing non-server-only config — no Drizzle/Anthropic pulled in.

import { MAINTENANCE_CRON, MAINTENANCE_FN_CONFIG } from "../maintenance-config.js";

vi.mock("server-only", () => ({}));

describe("MAINTENANCE_FN_CONFIG", () => {
  it("has id 'maintenance'", () => {
    expect(MAINTENANCE_FN_CONFIG.id).toBe("maintenance");
  });

  it("retries is 2", () => {
    expect(MAINTENANCE_FN_CONFIG.retries).toBe(2);
  });
});

describe("MAINTENANCE_CRON", () => {
  it("fires at 03:00 UTC every Sunday (0 3 * * 0)", () => {
    expect(MAINTENANCE_CRON.cron).toBe("0 3 * * 0");
  });
});

// ── openGithubPR smoke test (no-op path) ─────────────────────────────────────
// Verifies the function exists in notify.ts and is a no-op when env vars unset.

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockEnv = vi.hoisted(() => ({
  GITHUB_TOKEN: undefined as string | undefined,
  GITHUB_REPO: undefined as string | undefined,
  SLACK_WEBHOOK_URL: undefined as string | undefined,
}));
vi.mock("@/lib/env", () => ({ env: mockEnv }));

// slack/webhook must be mocked or its import fails in node env
vi.mock("@slack/webhook", () => ({
  IncomingWebhook: vi.fn(() => ({ send: vi.fn() })),
}));

describe("openGithubPR", () => {
  it("is a no-op (returns null) when GITHUB_TOKEN is unset", async () => {
    const { openGithubPR } = await import("@/lib/notify");
    const result = await openGithubPR({
      source: { slug: "who-don", url: "https://www.who.int/", diff: "--- a\n+++ b" },
      fix: "update selector to .DonArticle",
    });
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("creates a branch and PR when GITHUB_TOKEN and GITHUB_REPO are set", async () => {
    mockEnv.GITHUB_TOKEN = "ghp_test";
    mockEnv.GITHUB_REPO = "org/repo";
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ object: { sha: "abc123" } }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ html_url: "https://github.com/org/repo/pull/7" }),
      });

    const { openGithubPR } = await import("@/lib/notify");
    const url = await openGithubPR({
      source: { slug: "who-don", url: "https://www.who.int/", diff: "--- a\n+++ b" },
      fix: "update selector",
    });
    expect(url).toBe("https://github.com/org/repo/pull/7");
    expect(mockFetch).toHaveBeenCalledTimes(4);

    // Branch name must contain today's date to prevent weekly collisions when the prior PR is still open.
    const branchCallBody = JSON.parse(
      (mockFetch.mock.calls[1]?.[1] as RequestInit).body as string,
    ) as { ref: string };
    const today = new Date().toISOString().slice(0, 10);
    expect(branchCallBody.ref).toContain(today);

    mockEnv.GITHUB_TOKEN = undefined;
    mockEnv.GITHUB_REPO = undefined;
    vi.clearAllMocks();
    vi.resetModules();
  });
});
