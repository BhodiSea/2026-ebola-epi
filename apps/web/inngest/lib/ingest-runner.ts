import "server-only";
import { createHash } from "node:crypto";

import type { RegisteredAdapter } from "@ituri/ingest";
import type { GetStepTools } from "inngest";

import type { inngest } from "@/inngest/client";
import { DOCUMENT_TRIAGE_REQUESTED } from "@/inngest/functions/pipeline-events-config";
import { resolveSourceId, upsertDocument } from "@/inngest/lib/persist-extraction";
import { translateRateLimitError } from "@/inngest/lib/rate-limit-error";

type FetchParseResult = null | {
  documentId: string;
  fullText: string;
  publishedAtIso: string;
  sha256Hex: string;
  sourceSlug: string;
};

/**
 * Shared Inngest handler body for all per-source ingest functions.
 *
 * poll() → for each item: fetch() + parse() + upsertDocument → emit DOCUMENT_TRIAGE_REQUESTED
 *
 * Steps are keyed by sha256(url) so Inngest memoises correctly on replay even when
 * multiple items are in flight for the same source in the same run.
 */
export async function runPerSourceIngest(
  adapter: RegisteredAdapter,
  step: GetStepTools<typeof inngest>,
): Promise<void> {
  const items = await step.run("poll", async () => adapter.poll());
  const sourceId = await step.run("resolve-source-id", async () =>
    resolveSourceId(adapter.sourceSlug),
  );

  for (const item of items) {
    const stepId = createHash("sha256").update(item.url).digest("hex").slice(0, 16);

    // eslint-disable-next-line no-await-in-loop
    const doc = await step.run(`fetch-parse-${stepId}`, async (): Promise<FetchParseResult> => {
      const fetchResult = await adapter.fetch(item.url).catch(translateRateLimitError);
      if (fetchResult.skipped) {
        return null;
      }

      const parseResult = await adapter.parse(fetchResult.rawContent);
      if (parseResult.skipped) {
        return null;
      }

      const documentId = await upsertDocument({
        fullText: parseResult.fullText,
        publishedAt: new Date(item.publishedAt),
        sha256: fetchResult.sha256,
        sourceId,
        url: item.url,
      });

      return {
        documentId,
        fullText: parseResult.fullText,
        publishedAtIso: item.publishedAt,
        sha256Hex: fetchResult.sha256.toString("hex"),
        sourceSlug: adapter.sourceSlug,
      };
    });

    if (doc === null) {
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await step.sendEvent(`emit-${stepId}`, {
      name: DOCUMENT_TRIAGE_REQUESTED,
      data: {
        documentId: doc.documentId,
        fullText: doc.fullText,
        publishedAtIso: doc.publishedAtIso,
        sha256: doc.sha256Hex,
        sourceSlug: doc.sourceSlug,
      },
    });
  }
}
