import { createHash } from "node:crypto";

import {
  CANDIDATE_FEW_SHOTS,
  CANDIDATE_STATIC_INSTRUCTIONS,
  FEW_SHOTS,
  STATIC_INSTRUCTIONS,
} from "./prompt.js";
import { extractionTool } from "./tools.js";

// eslint-disable-next-line functional/functional-parameters
export function computeCandidatePromptVersionHash(): string {
  return createHash("sha256")
    .update(
      CANDIDATE_STATIC_INSTRUCTIONS +
        CANDIDATE_FEW_SHOTS +
        JSON.stringify(extractionTool.input_schema),
    )
    .digest("hex")
    .slice(0, 16);
}

// eslint-disable-next-line functional/functional-parameters
export function computePromptVersionHash(): string {
  return createHash("sha256")
    .update(STATIC_INSTRUCTIONS + FEW_SHOTS + JSON.stringify(extractionTool.input_schema))
    .digest("hex")
    .slice(0, 16);
}

// eslint-disable-next-line functional/functional-parameters
export function computeToolSchemaHash(): string {
  return createHash("sha256")
    .update(JSON.stringify(extractionTool.input_schema))
    .digest("hex")
    .slice(0, 16);
}
