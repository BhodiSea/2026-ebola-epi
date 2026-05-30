// Phase 6 pipeline event-name constants.
// All pipeline functions import from this module so renaming one string updates everything.

export const DOCUMENT_TRIAGE_REQUESTED = "document.triage.requested" as const;
export const DOCUMENT_EXTRACTION_REQUESTED = "document.extraction.requested" as const;
export const RECONCILE_REQUESTED = "reconcile.requested" as const;
export const ESCALATION_NOVEL_PATHOGEN_COUNTRY = "escalation.novel_pathogen_country" as const;
export const ESCALATION_CONFLICT_UNRESOLVABLE = "escalation.conflict_unresolvable" as const;
export const ESCALATION_CONFIRMED = "escalation.confirmed" as const;
export const ESCALATION_CREATED = "escalation.created" as const;
export const DOCUMENT_BACKFILL_REQUESTED = "document.backfill.requested" as const;
export const SHADOW_RUN_TRIGGER = "shadow.run.trigger" as const;
