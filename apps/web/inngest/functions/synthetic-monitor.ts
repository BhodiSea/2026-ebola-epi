import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { agentActions, caseCounts, extractionRuns } from "@ituri/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { inngest } from "../client";
import { resolveSourceId, upsertDocument } from "../lib/persist-extraction";
import { DOCUMENT_TRIAGE_REQUESTED } from "./pipeline-events-config";
import { SYNTHETIC_MONITOR_EVENT, SYNTHETIC_MONITOR_FN_CONFIG } from "./synthetic-monitor-config";
import { db } from "@/lib/db";
import { notifySlack } from "@/lib/notify";

const FIXTURE_DIR = path.join(process.cwd(), "../../evals/synthetic/bundibugyo-ituri-sentinel");
const SYNTHETIC_SOURCE_SLUG = "synthetic-monitor";
const MAX_POLL_ITERATIONS = 10;

interface AssertResult {
  diff: unknown[];
  ok: boolean;
}

/* eslint-disable @typescript-eslint/naming-convention */
const GroundTruthRow = z.object({
  as_of: z.string(),
  country_iso3: z.string(),
  metric: z.string(),
  pathogen_icd11: z.string(),
  value: z.number(),
});
/* eslint-enable @typescript-eslint/naming-convention */
type GroundTruthRow = z.infer<typeof GroundTruthRow>;

function assertGroundTruth(
  observed: null | { metric: string; value: number }[],
  expected: GroundTruthRow[],
): AssertResult {
  if (observed === null) {
    return {
      ok: false,
      diff: [{ type: "no_rows", expected: expected.map((r) => `${r.metric}=${r.value}`) }],
    };
  }
  const diff: unknown[] = [];
  for (const exp of expected) {
    const obs = observed.find((r) => r.metric === exp.metric);
    if (!obs) {
      diff.push({ type: "missing_metric", metric: exp.metric, expected: exp.value });
    } else if (obs.value !== exp.value) {
      diff.push({
        type: "value_mismatch",
        metric: exp.metric,
        expected: exp.value,
        observed: obs.value,
      });
    }
  }
  return { ok: diff.length === 0, diff };
}

export const syntheticMonitor = inngest.createFunction(
  SYNTHETIC_MONITOR_FN_CONFIG,
  { event: SYNTHETIC_MONITOR_EVENT },
  async ({ step }) => {
    const startMs = Date.now();

    const { fullText, groundTruth } = await step.run("load-fixture", async () => {
      const [sourceRaw, gtRaw] = await Promise.all([
        readFile(path.join(FIXTURE_DIR, "source.txt"), "utf8"),
        readFile(path.join(FIXTURE_DIR, "ground-truth.json"), "utf8"),
      ]);
      return {
        fullText: sourceRaw.trim(),
        groundTruth: z.array(GroundTruthRow).parse(JSON.parse(gtRaw) as unknown),
      };
    });

    const { documentId, sha256Hex } = await step.run("upsert-synthetic-doc", async () => {
      const sourceId = await resolveSourceId(SYNTHETIC_SOURCE_SLUG);
      const sha256 = createHash("sha256").update(fullText).digest();
      const docId = await upsertDocument({
        fullText,
        publishedAt: new Date("2026-05-12T00:00:00Z"),
        sha256,
        sourceId,
        url: "internal://synthetic-monitor/bundibugyo-ituri-sentinel",
      });
      return { documentId: docId, sha256Hex: sha256.toString("hex") };
    });

    await step.sendEvent("emit-triage", {
      name: DOCUMENT_TRIAGE_REQUESTED,
      data: {
        documentId,
        fullText,
        publishedAtIso: "2026-05-12T00:00:00.000Z",
        sha256: sha256Hex,
        sourceSlug: SYNTHETIC_SOURCE_SLUG,
      },
    });

    let observedRows: null | { metric: string; value: number }[] = null;
    for (let i = 0; i < MAX_POLL_ITERATIONS; i++) {
      // eslint-disable-next-line no-await-in-loop
      observedRows = await step.run(`check-${i}`, async () => {
        const rows = await db
          .select({ metric: caseCounts.metric, value: caseCounts.value })
          .from(caseCounts)
          .innerJoin(extractionRuns, eq(extractionRuns.id, caseCounts.extractionRunId))
          .where(eq(extractionRuns.documentId, documentId))
          .limit(20);
        return rows.length > 0 ? rows : null;
      });
      if (observedRows !== null) {
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await step.sleep(`wait-${i}`, "30s");
    }

    const latencyMs = Date.now() - startMs;
    const result = assertGroundTruth(observedRows, groundTruth);

    await step.run("record-result", async () =>
      db.insert(agentActions).values({
        agent: "synthetic-monitor",
        action: result.ok ? "synthetic_check_passed" : "synthetic_check_failed",
        subjectTable: "documents",
        subjectId: documentId,
        payload: { expected: groundTruth, observed: observedRows, diff: result.diff, latencyMs },
      }),
    );

    if (!result.ok) {
      await step.run("notify-failure", async () =>
        notifySlack(
          `Synthetic monitor FAILED for bundibugyo-ituri-sentinel (doc ${documentId}). Diff: ${JSON.stringify(result.diff)}`,
        ),
      );
      throw new Error(`Synthetic monitor check failed: ${JSON.stringify(result.diff)}`);
    }

    return { passed: true, latencyMs };
  },
);
