// Single source of truth for ICD-11 coded entity values used across all extraction
// and triage prompts. Both agents MUST reference this table — never inline bare codes.
//
// All entries are ICD-11 coded-entity format (disease level), not MMS taxon codes.
// Marburg = 1C90.0 (confirmed against WHO ICD-11 MMS; triage previously used 1C12).
// Bundibugyo = 1D60.2 (disease entity); the MMS taxon code XN0AT must NOT appear in prompts.
export const PATHOGEN_ICD11 = {
  EBOLA_SUDAN: "1D60.0",
  EBOLA_ZAIRE: "1D60.1",
  BUNDIBUGYO: "1D60.2",
  EBOLA_RESTON: "1D60.3",
  MARBURG: "1C90.0",
  MPOX: "1E71",
  CHOLERA: "1A00",
} as const;

export type PathogenCode = (typeof PATHOGEN_ICD11)[keyof typeof PATHOGEN_ICD11];

// Maps ICD-11 disease codes to the URL-safe slug used in /outbreaks/[slug]/[iso3]/[date] routes.
/* eslint-disable @typescript-eslint/naming-convention -- ICD-11 codes are versioned external identifiers; camelCase would change their meaning */
export const PATHOGEN_SLUG: Record<PathogenCode, string> = {
  "1D60.0": "ebola-sudan",
  "1D60.1": "ebola-zaire",
  "1D60.2": "bundibugyo",
  "1D60.3": "ebola-reston",
  "1C90.0": "marburg",
  "1E71": "mpox",
  "1A00": "cholera",
};
/* eslint-enable @typescript-eslint/naming-convention */
