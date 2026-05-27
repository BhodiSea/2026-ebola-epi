import { z } from "zod";

export const SourceQuoteId = z.uuid().brand("SourceQuoteId");
export type SourceQuoteId = z.infer<typeof SourceQuoteId>;

export const ExtractionRunId = z.uuid().brand("ExtractionRunId");
export type ExtractionRunId = z.infer<typeof ExtractionRunId>;

export const OutbreakId = z.uuid().brand("OutbreakId");
export type OutbreakId = z.infer<typeof OutbreakId>;

export const DocumentId = z.uuid().brand("DocumentId");
export type DocumentId = z.infer<typeof DocumentId>;

export const ZoneCode = z
  .string()
  .regex(/^[A-Z]{2}-[A-Z0-9]+$/)
  .brand("ZoneCode");
export type ZoneCode = z.infer<typeof ZoneCode>;
