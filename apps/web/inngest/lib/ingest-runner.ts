import "server-only";
import { createHash } from "node:crypto";

import { agentActions, sources } from "@ituri/db";
import type { RegisteredAdapter } from "@ituri/ingest";
import { ConfiguredSkipError } from "@ituri/ingest";
import { and, count, eq, gte } from "drizzle-orm";
import type { GetStepTools } from "inngest";

import type { inngest } from "@/inngest/client";
import { DOCUMENT_TRIAGE_REQUESTED } from "@/inngest/functions/pipeline-events-config";
import { fetchJsRendered } from "@/inngest/lib/fetch-with-sandbox";
import { resolveSourceId, upsertDocument } from "@/inngest/lib/persist-extraction";
import { translateRateLimitError } from "@/inngest/lib/rate-limit-error";
import { db } from "@/lib/db";
import { chromiumFallbackEnabled } from "@/lib/kill-switch";
import { createAdminClient } from "@/lib/supabase/admin";

const AGENT_SLUG = "ingest-runner";
const CHROMIUM_DAILY_CAP = 5;

interface FetchParseResult {
  documentId: string;
  fullText: string;
  publishedAtIso: string;
  sha256Hex: string;
  sourceSlug: string;
}

interface PollItem {
  publishedAt: string;
  title: string;
  url: string;
}

/**
 * Shared Inngest handler body for all per-source ingest functions.
 *
 * poll() → for each item: fetch() + parse() + upsertDocument → emit DOCUMENT_TRIAGE_REQUESTED
 *
 * Steps are keyed by sha256(url) so Inngest memoises correctly on replay even when
 * multiple items are in flight for the same source in the same run.
 */
// eslint-disable-next-line max-lines-per-function -- orchestrates fetch→parse→persist→emit + chromium fallback across multiple Inngest steps; runChromiumFallback is already extracted
export async function runPerSourceIngest(
  adapter: RegisteredAdapter,
  step: GetStepTools<typeof inngest>,
): Promise<void> {
  const sourceId = await step.run("resolve-source-id", async () =>
    resolveSourceId(adapter.sourceSlug),
  );

  const pollResult = await step.run("poll", async (): Promise<null | PollItem[]> => {
    try {
      return await adapter.poll();
    } catch (error) {
      if (error instanceof ConfiguredSkipError) {
        await db.insert(agentActions).values({
          agent: AGENT_SLUG,
          action: "skipped_no_credentials",
          subjectTable: "sources",
          subjectId: sourceId,
          payload: { sourceSlug: adapter.sourceSlug, reason: error.message },
        });
        return null;
      }
      throw error;
    }
  });

  if (pollResult === null) {
    return;
  }
  const items = pollResult;

  for (const item of items) {
    const stepId = createHash("sha256").update(item.url).digest("hex").slice(0, 16);

    // eslint-disable-next-line no-await-in-loop
    const doc = await step.run(
      `fetch-parse-${stepId}`,
      async (): Promise<FetchParseResult | null> => {
        const fetchResult = await adapter.fetch(item.url).catch(translateRateLimitError);

        if (fetchResult.skipped) {
          if (fetchResult.reason === "chromium_required" && (await chromiumFallbackEnabled())) {
            return runChromiumFallback({ adapter, item, sourceId });
          }
          await db.insert(agentActions).values({
            agent: AGENT_SLUG,
            action: "ingest_skipped",
            subjectTable: "sources",
            subjectId: sourceId,
            payload: {
              sourceSlug: adapter.sourceSlug,
              url: item.url,
              stage: "fetch",
              reason: fetchResult.reason,
            },
          });
          return null;
        }

        const parseResult = await adapter.parse({
          rawContent: fetchResult.rawContent,
          mimeType: fetchResult.mimeType,
          ...(fetchResult.rawBytes !== undefined && { rawBytes: fetchResult.rawBytes }),
        });
        if (parseResult.skipped) {
          await db.insert(agentActions).values({
            agent: AGENT_SLUG,
            action: "ingest_skipped",
            subjectTable: "sources",
            subjectId: sourceId,
            payload: {
              sourceSlug: adapter.sourceSlug,
              url: item.url,
              stage: "parse",
              reason: parseResult.reason,
            },
          });
          return null;
        }

        const documentId = await upsertDocument({
          fullText: parseResult.fullText,
          language: parseResult.language,
          mimeType: fetchResult.mimeType,
          publishedAt: new Date(item.publishedAt),
          ...(fetchResult.rawBytes !== undefined && { rawBytes: fetchResult.rawBytes }),
          sha256: fetchResult.sha256,
          sourceId,
          url: item.url,
        });

        await uploadRawBytes(fetchResult.sha256, fetchResult.rawBytes, fetchResult.mimeType);

        return {
          documentId,
          fullText: parseResult.fullText,
          publishedAtIso: item.publishedAt,
          sha256Hex: fetchResult.sha256.toString("hex"),
          sourceSlug: adapter.sourceSlug,
        };
      },
    );

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

  await step.run("update-source-health", async () => {
    await db
      .update(sources)
      .set({ lastFetchedAt: new Date(), parserVersion: adapter.version })
      .where(eq(sources.slug, adapter.sourceSlug));
  });
}

function extFromMime(mimeType: string): string {
  if (mimeType.includes("pdf")) {
    return ".pdf";
  }
  if (mimeType.includes("html")) {
    return ".html";
  }
  return ".bin";
}

async function runChromiumFallback(opts: {
  adapter: RegisteredAdapter;
  item: PollItem;
  sourceId: string;
}): Promise<FetchParseResult | null> {
  const { adapter, item, sourceId } = opts;

  const capRows = await db
    .select({ cnt: count() })
    .from(agentActions)
    .where(
      and(
        eq(agentActions.action, "chromium_sandbox_invoked"),
        gte(agentActions.ts, new Date(Date.now() - 24 * 60 * 60 * 1000)),
      ),
    );
  const dailyCount = capRows[0]?.cnt ?? 0;

  if (dailyCount >= CHROMIUM_DAILY_CAP) {
    await db.insert(agentActions).values({
      agent: AGENT_SLUG,
      action: "chromium_daily_cap_reached",
      subjectTable: "sources",
      subjectId: sourceId,
      payload: { sourceSlug: adapter.sourceSlug, url: item.url, dailyCount },
    });
    return null;
  }

  const renderedHtml = await fetchJsRendered(item.url);
  const sha256 = createHash("sha256").update(renderedHtml).digest();

  await db.insert(agentActions).values({
    agent: AGENT_SLUG,
    action: "chromium_sandbox_invoked",
    subjectTable: "sources",
    subjectId: sourceId,
    payload: { sourceSlug: adapter.sourceSlug, url: item.url },
  });

  const parseResult = await adapter.parse({ rawContent: renderedHtml, mimeType: "text/html" });

  if (parseResult.skipped) {
    await db.insert(agentActions).values({
      agent: AGENT_SLUG,
      action: "ingest_skipped",
      subjectTable: "sources",
      subjectId: sourceId,
      payload: {
        sourceSlug: adapter.sourceSlug,
        url: item.url,
        stage: "parse",
        reason: parseResult.reason,
      },
    });
    return null;
  }

  const documentId = await upsertDocument({
    fullText: parseResult.fullText,
    language: parseResult.language,
    mimeType: "text/html",
    publishedAt: new Date(item.publishedAt),
    sha256,
    sourceId,
    url: item.url,
  });

  return {
    documentId,
    fullText: parseResult.fullText,
    publishedAtIso: item.publishedAt,
    sha256Hex: sha256.toString("hex"),
    sourceSlug: adapter.sourceSlug,
  };
}

async function uploadRawBytes(
  sha256: Buffer,
  rawBytes: Buffer | Uint8Array | undefined,
  mimeType: string,
): Promise<void> {
  if (rawBytes === undefined) {
    return;
  }
  const ext = extFromMime(mimeType);
  try {
    await createAdminClient()
      .storage.from("source-bytes")
      .upload(`${sha256.toString("hex")}${ext}`, rawBytes, {
        contentType: mimeType,
        upsert: true,
      });
  } catch (error) {
    console.warn("[source-bytes] upload failed, skipping:", error);
  }
}
