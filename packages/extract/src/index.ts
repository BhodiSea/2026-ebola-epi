/** Mirrors the values used by incidents.class and case_counts.escalation_class in the DB schema. */
export type EscalationClass =
  | "anomaly"
  | "conflict_unresolvable"
  | "novel_pathogen_country"
  | "substring_verify_fail";

// biome-ignore lint/performance/noBarrelFile: package entry point — consumers import from @ituri/extract
export { computeReconcilePromptHash, computeTriagePromptHash } from "./agents/hash.js";
export type { ReconcileCandidate, ReconcileInput, ReconcileOutput } from "./agents/reconcile.js";
export { buildReconcileParams, parseReconcileResponse } from "./agents/reconcile.js";
export { shouldReconcile } from "./agents/shared.js";
export type { TriageOutput } from "./agents/triage.js";
export { buildTriageParams, parseTriageResponse } from "./agents/triage.js";
export {
  computeCandidatePromptVersionHash,
  computePromptVersionHash,
  computeToolSchemaHash,
} from "./hash.js";
export { MODEL_HAIKU, MODEL_OPUS, MODEL_SONNET } from "./models.js";
export type { ComputeCostOptions, ModelPrice } from "./pricing.js";
export { computeCost, MODEL_PRICES } from "./pricing.js";
export {
  CANDIDATE_FEW_SHOTS,
  CANDIDATE_STATIC_INSTRUCTIONS,
  FEW_SHOTS,
  STATIC_INSTRUCTIONS,
} from "./prompt.js";
export type { ExtractionResult, ExtractionUsage, PromptVariant } from "./run.js";
export {
  buildExtractionParams,
  CANDIDATE_PROMPT_VERSION,
  MODEL,
  parseExtractionResponse,
  runExtraction,
} from "./run.js";
export type { ExtractionRow } from "./tools.js";
export { ExtractionBatchSchema, ExtractionRowSchema, extractionTool } from "./tools.js";
export { verifySubstring } from "./verify.js";
