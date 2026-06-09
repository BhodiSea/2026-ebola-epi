/* eslint-disable @typescript-eslint/naming-convention */
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";

import {
  computeCandidatePromptVersionHash,
  computePromptVersionHash,
  computeToolSchemaHash,
} from "./hash.js";
import { MODEL_SONNET } from "./models.js";
import {
  CANDIDATE_FEW_SHOTS,
  CANDIDATE_STATIC_INSTRUCTIONS,
  FEW_SHOTS,
  STATIC_INSTRUCTIONS,
} from "./prompt.js";
import type { ExtractionRow } from "./tools.js";
import { ExtractionRowSchema, extractionTool } from "./tools.js";
import { resolveSubstring } from "./verify.js";

// Same tools block for every prompt variant. Variable assignment bypasses the excess-property
// check on cache_control.ttl (not in SDK 0.52 types, accepted by the API — AGENTS.md Rule 13).
const EXTRACTION_TOOLS = [
  {
    name: extractionTool.name,
    description: extractionTool.description,
    input_schema: extractionTool.input_schema,
    cache_control: { type: "ephemeral" as const, ttl: "1h" },
  },
];

// Back-compat alias — consumers that import MODEL from @ituri/extract continue to work.
export const MODEL = MODEL_SONNET;

/** Selects which prompt variant buildExtractionParams should use. */
export type PromptVariant = "candidate" | "production";

/**
 * Candidate prompt version for shadow-run comparisons.
 * Points to the pre-WS1 baseline (7-metric, national-only prompt).
 * Shadow-extraction compares this against the production prompt on 10% of traffic.
 */
export const CANDIDATE_PROMPT_VERSION = computeCandidatePromptVersionHash();

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

/**
 * Build the JSON-serialisable params passed to anthropic.messages.create.
 * Exported so the Inngest function can pass these directly to step.ai.wrap,
 * keeping input visible and editable in the Inngest dev-server UI.
 *
 * Pass variant="candidate" in shadow-extraction to compare the candidate
 * prompt against the production prompt on the same document.
 */
export function buildExtractionParams(
  documentText: string,
  variant: PromptVariant = "production",
): Anthropic.MessageCreateParamsNonStreaming {
  const instructions =
    variant === "candidate" ? CANDIDATE_STATIC_INSTRUCTIONS : STATIC_INSTRUCTIONS;
  const fewShots = variant === "candidate" ? CANDIDATE_FEW_SHOTS : FEW_SHOTS;
  return {
    model: MODEL,
    max_tokens: 4096,
    tools: EXTRACTION_TOOLS,
    system: instructions,
    messages: [
      {
        role: "user",
        content: [
          // cache_control on few-shots block (5m TTL, default)
          { type: "text", text: fewShots, cache_control: { type: "ephemeral" } },
          { type: "text", text: `<document trust="untrusted">\n${documentText}\n</document>` },
        ],
      },
    ],
    tool_choice: { type: "tool", name: "extract_case_counts" },
  };
}

/**
 * Parse and verify a raw Anthropic response.
 * Separated from the HTTP call so it can run outside step.ai.wrap, keeping
 * the LLM trace span clean (only the network call is inside the span).
 */
export function parseExtractionResponse(
  response: Pick<Anthropic.Message, "content" | "usage">,
  documentText: string,
): Omit<ExtractionResult, "promptVersionHash"> {
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (toolUse?.type !== "tool_use") {
    throw new Error("no tool_use block in response");
  }
  // Loose outer parse: reject the call only if extractions is not an array.
  // Per-row filtering with ExtractionRowSchema prevents one hallucinated ICD-11 code
  // (e.g. 1D60.00) from throwing and losing all valid rows in the same document.
  const outer = z.object({ extractions: z.array(z.unknown()) }).parse(toolUse.input);
  const validRows = outer.extractions
    .map((r) => ExtractionRowSchema.safeParse(r))
    .filter((r): r is { data: ExtractionRow; success: true } => r.success)
    .map((r) => r.data);
  const resolvedRows = validRows.map((row) => {
    const resolved = resolveSubstring(documentText, row.source_quote);
    if (resolved === null) {
      throw new Error(`substring_verify_fail: char_start=${row.source_quote.char_start}`);
    }
    return { ...row, source_quote: { ...row.source_quote, ...resolved } };
  });
  return {
    rows: resolvedRows,
    toolSchemaHash: computeToolSchemaHash(),
    usage: response.usage,
  };
}

/**
 * Convenience wrapper used by unit tests and by callers that do not need
 * step.ai.wrap (e.g. one-off CLI scripts). Inngest functions should call
 * buildExtractionParams + step.ai.wrap + parseExtractionResponse instead.
 */
export async function runExtraction(
  client: Anthropic,
  documentText: string,
): Promise<ExtractionResult> {
  const response = await client.messages.create(buildExtractionParams(documentText));
  return {
    promptVersionHash: computePromptVersionHash(),
    ...parseExtractionResponse(response, documentText),
  };
}
