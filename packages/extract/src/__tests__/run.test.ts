/* eslint-disable @typescript-eslint/naming-convention */
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import { runExtraction } from "../run.js";
import { extractionTool } from "../tools.js";

const MOCK_RESPONSE = {
  content: [{ type: "tool_use" as const, input: { extractions: [] } }],
  usage: {
    input_tokens: 100,
    output_tokens: 10,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 80,
  },
};

function capturedParams(client: Anthropic): Anthropic.MessageCreateParamsNonStreaming {
  const call = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0];
  if (call === undefined) {
    throw new Error("no Anthropic call was made");
  }
  return call[0] as Anthropic.MessageCreateParamsNonStreaming;
}

function makeClient() {
  return {
    messages: { create: vi.fn().mockResolvedValue(MOCK_RESPONSE) },
  } as unknown as Anthropic;
}

describe("runExtraction — Anthropic call params", () => {
  it("tools block cache_control.ttl is '1h' (AGENTS.md Rule 13)", async () => {
    const client = makeClient();
    await runExtraction(client, "test document");
    const cc = capturedParams(client).tools?.[0]?.cache_control as
      | null
      | undefined
      | { ttl?: string; type: string };
    expect(cc?.ttl).toBe("1h");
  });

  it("few-shots cache_control has no ttl (5m default)", async () => {
    const client = makeClient();
    await runExtraction(client, "test document");
    const content = capturedParams(client).messages[0]?.content;
    if (!Array.isArray(content)) {
      throw new TypeError("expected array user content");
    }
    const cc = (content[0] as { cache_control?: { ttl?: string } }).cache_control;
    expect(cc?.ttl).toBeUndefined();
  });

  it("tool_choice is forced to extract_case_counts", async () => {
    const client = makeClient();
    await runExtraction(client, "test document");
    expect(capturedParams(client).tool_choice).toStrictEqual({
      type: "tool",
      name: "extract_case_counts",
    });
  });

  it("tools[0].name matches extractionTool.name", async () => {
    const client = makeClient();
    await runExtraction(client, "test document");
    expect(capturedParams(client).tools?.[0]?.name).toBe(extractionTool.name);
  });
});
