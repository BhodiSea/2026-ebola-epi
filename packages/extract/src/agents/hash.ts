import { createHash } from "node:crypto";

import { RECONCILE_FEW_SHOTS, RECONCILE_SYSTEM } from "./reconcile-prompt.js";
import { reconcileTool } from "./reconcile-tool.js";
import { TRIAGE_FEW_SHOTS, TRIAGE_SYSTEM } from "./triage-prompt.js";
import { triageTool } from "./triage-tool.js";

const HEX_16_CHARS = 16;

/** Hash of RECONCILE_SYSTEM + RECONCILE_FEW_SHOTS + JSON(reconcileTool.input_schema). Bump when any of those change. */
// eslint-disable-next-line functional/functional-parameters
export function computeReconcilePromptHash(): string {
  return sha256hex(
    RECONCILE_SYSTEM + RECONCILE_FEW_SHOTS + JSON.stringify(reconcileTool.input_schema),
  );
}

/** Hash of TRIAGE_SYSTEM + TRIAGE_FEW_SHOTS + JSON(triageTool.input_schema). Bump when any of those change. */
// eslint-disable-next-line functional/functional-parameters
export function computeTriagePromptHash(): string {
  return sha256hex(TRIAGE_SYSTEM + TRIAGE_FEW_SHOTS + JSON.stringify(triageTool.input_schema));
}

function sha256hex(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, HEX_16_CHARS);
}
