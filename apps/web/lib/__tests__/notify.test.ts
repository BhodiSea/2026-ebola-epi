// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const BASIC_AUTH_RE = /^Basic /;

// Mock @slack/webhook
const mockSend = vi.fn();
vi.mock("@slack/webhook", () => ({
  IncomingWebhook: vi.fn(() => ({ send: mockSend })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock env
const mockEnv = vi.hoisted(() => ({
  SLACK_WEBHOOK_URL: undefined as string | undefined,
  TWILIO_ACCOUNT_SID: undefined as string | undefined,
  TWILIO_AUTH_TOKEN: undefined as string | undefined,
  TWILIO_FROM_NUMBER: undefined as string | undefined,
  TWILIO_TO_NUMBER: undefined as string | undefined,
  GITHUB_TOKEN: undefined as string | undefined,
  GITHUB_REPO: undefined as string | undefined,
}));
vi.mock("@/lib/env", () => ({ env: mockEnv }));

// ── notifyTwilio ──────────────────────────────────────────────────────────────

describe("notifyTwilio", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockEnv.TWILIO_ACCOUNT_SID = undefined;
    mockEnv.TWILIO_AUTH_TOKEN = undefined;
    mockEnv.TWILIO_FROM_NUMBER = undefined;
    mockEnv.TWILIO_TO_NUMBER = undefined;
  });

  it("is a no-op when TWILIO_ACCOUNT_SID is not set", async () => {
    const { notifyTwilio } = await import("@/lib/notify");
    await notifyTwilio("test message");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("POSTs to the Twilio API with basic auth when all vars are set", async () => {
    mockEnv.TWILIO_ACCOUNT_SID = "ACtest";
    mockEnv.TWILIO_AUTH_TOKEN = "token123";
    mockEnv.TWILIO_FROM_NUMBER = "+10000000000";
    mockEnv.TWILIO_TO_NUMBER = "+19999999999";
    mockFetch.mockResolvedValue({ ok: true });

    const { notifyTwilio } = await import("@/lib/notify");
    await notifyTwilio("anomaly alert");

    expect(mockFetch).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock.calls typed as any[]; cast to inspect fetch call arguments
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("ACtest");
    expect(url).toContain("Messages");
    expect(init.method).toBe("POST");
    // Basic auth: base64("ACtest:token123")
    expect(init.headers).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- fetch RequestInit.headers narrowed for header inspection
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(BASIC_AUTH_RE);
  });

  it("is a no-op when only some Twilio vars are set (partial config)", async () => {
    mockEnv.TWILIO_ACCOUNT_SID = "ACtest";
    // Missing AUTH_TOKEN, FROM, TO
    const { notifyTwilio } = await import("@/lib/notify");
    await notifyTwilio("test");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ── openGithubIssue ───────────────────────────────────────────────────────────

describe("openGithubIssue", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockEnv.GITHUB_TOKEN = undefined;
    mockEnv.GITHUB_REPO = undefined;
  });

  it("is a no-op when GITHUB_TOKEN is not set", async () => {
    const { openGithubIssue } = await import("@/lib/notify");
    const url = await openGithubIssue({ title: "Bug", body: "details" });
    expect(url).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("POSTs to the GitHub issues API and returns the issue URL", async () => {
    mockEnv.GITHUB_TOKEN = "ghp_test";
    mockEnv.GITHUB_REPO = "org/repo";
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ html_url: "https://github.com/org/repo/issues/42" }),
    });

    const { openGithubIssue } = await import("@/lib/notify");
    const url = await openGithubIssue({ title: "Substring verify fail", body: "details here" });

    expect(url).toBe("https://github.com/org/repo/issues/42");
    expect(mockFetch).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock.calls typed as any[]; cast to inspect fetch call arguments
    const [fetchUrl, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(fetchUrl).toContain("org/repo");
    expect(fetchUrl).toContain("issues");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- fetch RequestInit.headers narrowed for header inspection
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer ghp_test");
  });

  it("returns null when fetch response is not ok", async () => {
    mockEnv.GITHUB_TOKEN = "ghp_test";
    mockEnv.GITHUB_REPO = "org/repo";
    mockFetch.mockResolvedValue({ ok: false, status: 422 });

    const { openGithubIssue } = await import("@/lib/notify");
    const url = await openGithubIssue({ title: "Fail", body: "details" });
    expect(url).toBeNull();
  });
});

// ── notifyAnomaly ─────────────────────────────────────────────────────────────

describe("notifyAnomaly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("is a no-op when neither Twilio nor Slack vars are set", async () => {
    const { notifyAnomaly } = await import("@/lib/notify");
    await notifyAnomaly("outbreak-1", [{ kind: "zscore", detail: { z: 5.2 } }]);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("calls notifySlack with @channel mention when SLACK_WEBHOOK_URL is set", async () => {
    mockEnv.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
    mockSend.mockResolvedValue({});

    const { notifyAnomaly } = await import("@/lib/notify");
    await notifyAnomaly("outbreak-abc", [{ kind: "cfr", detail: { ratio: 0.85 } }]);

    expect(mockSend).toHaveBeenCalledOnce();
    const firstCall = mockSend.mock.calls[0];
    expect(firstCall).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock.calls typed as any[]; cast to inspect Slack message payload in assertion
    const callArg = firstCall?.[0] as { text: string };
    expect(callArg.text).toContain("<!channel>");
    expect(callArg.text).toContain("outbreak-abc");
  });

  it("calls notifyTwilio when all Twilio vars are set", async () => {
    mockEnv.TWILIO_ACCOUNT_SID = "ACtest";
    mockEnv.TWILIO_AUTH_TOKEN = "token";
    mockEnv.TWILIO_FROM_NUMBER = "+10000000000";
    mockEnv.TWILIO_TO_NUMBER = "+19999999999";
    mockFetch.mockResolvedValue({ ok: true });

    const { notifyAnomaly } = await import("@/lib/notify");
    await notifyAnomaly("outbreak-xyz", [
      { kind: "cluster_100km", detail: { minDistanceM: 120_000 } },
    ]);

    expect(mockFetch).toHaveBeenCalledOnce();
  });
});
