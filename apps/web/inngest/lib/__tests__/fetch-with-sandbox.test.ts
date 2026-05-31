// @vitest-environment node
// WS2 §2.2 — Chromium fallback via Vercel Sandbox (await using for AsyncDisposable cleanup).
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockAsyncDispose = vi.fn().mockResolvedValue(undefined);
const mockRunCommand = vi.fn();
const mockCreate = vi.fn();

vi.mock("@vercel/sandbox", () => ({
  Sandbox: { create: mockCreate },
}));

function makeCommandResult(text: string) {
  return { stdout: vi.fn().mockResolvedValue(text) };
}

describe("fetchJsRendered", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({
      runCommand: mockRunCommand,
      [Symbol.asyncDispose]: mockAsyncDispose,
    });
  });

  it("creates a Sandbox with node24 runtime", async () => {
    mockRunCommand.mockResolvedValue(makeCommandResult("<html>article</html>"));
    const { fetchJsRendered } = await import("../fetch-with-sandbox.js");
    await fetchJsRendered("https://africacdc.org/sitrep");
    expect(mockCreate).toHaveBeenCalledWith({ runtime: "node24" });
  });

  it("runs agent-browser with the target URL and text output flag", async () => {
    mockRunCommand.mockResolvedValue(makeCommandResult("<html>article</html>"));
    const { fetchJsRendered } = await import("../fetch-with-sandbox.js");
    await fetchJsRendered("https://africacdc.org/sitrep");
    expect(mockRunCommand).toHaveBeenCalledWith("agent-browser", [
      "--url",
      "https://africacdc.org/sitrep",
      "--output",
      "text",
    ]);
  });

  it("returns the string output from stdout()", async () => {
    mockRunCommand.mockResolvedValue(makeCommandResult("<html>rendered content</html>"));
    const { fetchJsRendered } = await import("../fetch-with-sandbox.js");
    const result = await fetchJsRendered("https://africacdc.org/sitrep");
    expect(result).toBe("<html>rendered content</html>");
  });

  it("disposes the sandbox even when runCommand throws", async () => {
    mockRunCommand.mockRejectedValue(new Error("sandbox timeout"));
    const { fetchJsRendered } = await import("../fetch-with-sandbox.js");
    await expect(fetchJsRendered("https://africacdc.org/sitrep")).rejects.toThrow(
      "sandbox timeout",
    );
    expect(mockAsyncDispose).toHaveBeenCalled();
  });
});
