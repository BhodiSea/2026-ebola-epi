/* eslint-disable @typescript-eslint/naming-convention */
import type Anthropic from "@anthropic-ai/sdk";

import { MODEL_OPUS } from "../models.js";
import type { ExtractionUsage } from "../run.js";
import { RECONCILE_FEW_SHOTS, RECONCILE_SYSTEM } from "./reconcile-prompt.js";
import type { ReconcileOutput } from "./reconcile-tool.js";
import { ReconcileOutputSchema, reconcileTool } from "./reconcile-tool.js";

export interface ReconcileCandidate {
  /** UUID of the case_counts row. */
  id: string;
  /** ISO timestamp of the parent document's published_at. */
  publishedAtIso: string;
  /** The verbatim source quote text. */
  quoteText: string;
  /** The source slug (e.g. "who-don"). */
  sourceSlug: string;
  /** Source trust_score (0.00–1.00). */
  trustScore: string;
  /** The case count value. */
  value: number;
}

export interface ReconcileInput {
  readonly a: ReconcileCandidate;
  readonly asOf: string;
  readonly b: ReconcileCandidate;
  readonly metric: string;
}

export interface ReconcileResult {
  decision: ReconcileOutput;
  promptVersionHash: string;
  usage: ExtractionUsage;
}

/**
 * Build Anthropic message params for the Reconciliation Agent (Opus 4.7).
 * The tools+system block carries a 1h TTL cache breakpoint (AGENTS.md Rule 13).
 */
export function buildReconcileParams(
  input: ReconcileInput,
): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: MODEL_OPUS,
    max_tokens: 1024,
    tools: [
      {
        name: reconcileTool.name,
        description: reconcileTool.description,
        input_schema: reconcileTool.input_schema,
        // @ts-expect-error: SDK 0.52 types omit ttl; AGENTS.md Rule 13 requires explicit 1h
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    system: RECONCILE_SYSTEM,
    messages: buildReconcileMessages(input),
    tool_choice: { type: "tool", name: "resolve_conflict" },
  };
}

/**
 * Parse the Opus response. Validates that winner_id and loser_id are both in
 * {a.id, b.id}, that they differ, and promotes escalate:true when confidence < 0.8.
 */
export function parseReconcileResponse(
  response: Pick<Anthropic.Message, "content" | "usage">,
  input: ReconcileInput,
): Omit<ReconcileResult, "promptVersionHash"> {
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (toolUse?.type !== "tool_use") {
    throw new Error("no tool_use block in reconcile response");
  }

  const raw = ReconcileOutputSchema.parse(toolUse.input);
  const validIds = new Set([input.a.id, input.b.id]);

  if (!validIds.has(raw.winner_id)) {
    throw new Error(`reconcile winner_id ${raw.winner_id} not in candidate set`);
  }
  if (!validIds.has(raw.loser_id)) {
    throw new Error(`reconcile loser_id ${raw.loser_id} not in candidate set`);
  }
  if (raw.winner_id === raw.loser_id) {
    throw new Error("reconcile winner_id and loser_id must differ");
  }

  // Promote escalate when confidence is below the threshold regardless of model output.
  const decision: ReconcileOutput = {
    ...raw,
    escalate: raw.escalate || raw.confidence < 0.8,
  };

  return { decision, usage: response.usage };
}

function buildReconcileMessages(input: ReconcileInput): Anthropic.MessageParam[] {
  const context =
    `Metric: ${input.metric}, as of: ${input.asOf}\n` +
    `Row A: ${candidateText(input.a)}\n` +
    `Row B: ${candidateText(input.b)}`;
  return [
    {
      role: "user",
      content: [
        { type: "text", text: RECONCILE_FEW_SHOTS, cache_control: { type: "ephemeral" } },
        { type: "text", text: `<conflict trust="untrusted">\n${context}\n</conflict>` },
      ],
    },
  ];
}

function candidateText(c: ReconcileCandidate): string {
  return (
    `Row id: "${c.id}", source: ${c.sourceSlug}, trust: ${c.trustScore}, ` +
    `value: ${c.value}, published: ${c.publishedAtIso}, ` +
    `quote: "${c.quoteText}"`
  );
}

export type { ReconcileOutput } from "./reconcile-tool.js";
