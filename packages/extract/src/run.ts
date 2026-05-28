/* eslint-disable @typescript-eslint/naming-convention */
import type Anthropic from "@anthropic-ai/sdk";

import { computePromptVersionHash, computeToolSchemaHash } from "./hash.js";
import { FEW_SHOTS, STATIC_INSTRUCTIONS } from "./prompt.js";
import type { ExtractionRow } from "./tools.js";
import { ExtractionBatchSchema, extractionTool } from "./tools.js";
import { verifySubstring } from "./verify.js";

export const MODEL = "claude-sonnet-4-6" as const;

export interface ExtractionResult {
  promptVersionHash: string;
  rows: ExtractionRow[];
  toolSchemaHash: string;
  usage: ExtractionUsage;
}

export interface ExtractionUsage {
  cache_creation_input_tokens?: null | number;
  cache_read_input_tokens?: null | number;
  input_tokens: number;
  output_tokens: number;
}

export async function runExtraction(
  client: Anthropic,
  documentText: string,
): Promise<ExtractionResult> {
  const response = await client.messages.create(buildAnthropicMessages(documentText));
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (toolUse?.type !== "tool_use") {
    throw new Error("no tool_use block in response");
  }
  const { extractions } = ExtractionBatchSchema.parse(toolUse.input);
  const failingRow = extractions.find((row) => !verifySubstring(documentText, row.source_quote));
  if (failingRow !== undefined) {
    throw new Error(`substring_verify_fail: char_start=${failingRow.source_quote.char_start}`);
  }
  return {
    rows: extractions,
    promptVersionHash: computePromptVersionHash(),
    toolSchemaHash: computeToolSchemaHash(),
    usage: response.usage,
  };
}

function buildAnthropicMessages(documentText: string): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: MODEL,
    max_tokens: 4096,
    // cache_control on the last tool caches tools + system (1h TTL)
    tools: [
      {
        name: extractionTool.name,
        description: extractionTool.description,
        input_schema: extractionTool.input_schema,
        // @ts-expect-error: SDK 0.52 types CacheControlEphemeral without ttl; AGENTS.md Rule 13 requires explicit 1h
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    system: STATIC_INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: [
          // cache_control on few-shots block (5m TTL)
          { type: "text", text: FEW_SHOTS, cache_control: { type: "ephemeral" } },
          { type: "text", text: `<document trust="untrusted">\n${documentText}\n</document>` },
        ],
      },
    ],
    tool_choice: { type: "tool", name: "extract_case_counts" },
  };
}
