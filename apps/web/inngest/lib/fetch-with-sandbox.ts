import "server-only";

import { Sandbox } from "@vercel/sandbox";

/**
 * Fetch a JS-rendered page using Vercel Sandbox + agent-browser.
 * Runs in iad1 only (Sandbox regional constraint).
 * Callers must check chromiumFallbackEnabled() and the daily cap before calling.
 *
 * Uses `await using` for automatic AsyncDisposable cleanup on both success and error.
 */
export async function fetchJsRendered(url: string): Promise<string> {
  await using sandbox = await Sandbox.create({ runtime: "node24" });
  const result = await sandbox.runCommand("agent-browser", ["--url", url, "--output", "text"]);
  return await result.stdout();
}
