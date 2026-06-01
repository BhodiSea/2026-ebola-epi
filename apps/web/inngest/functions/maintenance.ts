import "server-only";

import { agentActions } from "@ituri/db";

import { inngest } from "../client";
import {
  checkAndFixLinkRot,
  checkDocDrift,
  diffLastKnownGoodVsCurrent,
  headAllSources,
  suggestParserFix,
} from "../lib/maintenance";
import { MAINTENANCE_CRON, MAINTENANCE_FN_CONFIG } from "./maintenance-config";
import { DOCUMENT_BACKFILL_REQUESTED } from "./pipeline-events-config";
import { db } from "@/lib/db";
import { openGithubIssue, openGithubPR } from "@/lib/notify";
import {
  getDocumentsWithoutProvenance,
  getProvenanceCoverageStats,
} from "@/lib/queries/provenance-stats";

export const maintenanceAgent = inngest.createFunction(
  MAINTENANCE_FN_CONFIG,
  MAINTENANCE_CRON,
  async ({ step }) => {
    const unhealthy = await step.run("health-check-sources", async () => headAllSources());

    for (const { source } of unhealthy) {
      // eslint-disable-next-line no-await-in-loop
      const diff = await step.run(`diff-${source.slug}`, async () =>
        diffLastKnownGoodVsCurrent(source),
      );
      // eslint-disable-next-line no-await-in-loop
      const fix = await step.run(`suggest-fix-${source.slug}`, async () => suggestParserFix(diff));
      // eslint-disable-next-line no-await-in-loop
      await step.run(`open-pr-${source.slug}`, async () =>
        openGithubPR({ source: { slug: source.slug, url: source.url, diff }, fix }),
      );
    }

    const rotFixed = await step.run("link-rot-check", async () => checkAndFixLinkRot());

    const driftResult = await step.run("doc-drift-check", async () => checkDocDrift());

    if ("changed" in driftResult && driftResult.changed.length > 0) {
      await step.run("open-drift-issue", async () =>
        openGithubIssue({
          title: "maintenance: CLAUDE.md references missing paths",
          // eslint-disable-next-line sonarjs/no-nested-template-literals -- markdown list format; outer template is the issue body
          body: `The following paths referenced in CLAUDE.md no longer exist:\n\n${driftResult.changed.map((p) => `- \`${p}\``).join("\n")}`,
          labels: ["maintenance", "docs"],
        }),
      );
    }

    const missing = await step.run("provenance-coverage-check", async () =>
      getDocumentsWithoutProvenance(50),
    );

    if (missing.length > 0) {
      await step.sendEvent("enqueue-provenance-backfill", {
        name: DOCUMENT_BACKFILL_REQUESTED,
        data: { documentIds: missing.map((d) => d.id) },
      });
    }

    const provenance = await step.run("provenance-coverage-log", async () => {
      const s = await getProvenanceCoverageStats();
      await db.insert(agentActions).values({
        agent: "maintenance",
        action: "provenance_coverage_logged",
        subjectTable: "case_counts",
        payload: { ...s, enqueuedDocuments: missing.length },
      });
      return s;
    });

    return {
      unhealthySources: unhealthy.length,
      linkRotFixed: rotFixed,
      docDrift: driftResult,
      provenance,
    };
  },
);
