import "server-only";

import { access, readFile } from "node:fs/promises";

import { agentActions, documents, sources } from "@ituri/db";
import { MODEL_SONNET } from "@ituri/extract";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { anthropic } from "./persist-extraction";
import { db } from "@/lib/db";

// --- types --------------------------------------------------------------------

export interface HealthCheckResult {
  failureCount: number;
  source: SourceRow;
}

export interface SourceRow {
  id: string;
  metadata: unknown;
  slug: string;
  url: string;
}

// --- module-level constants ---------------------------------------------------

const PATH_REF_REGEX = /`([a-z][a-z0-9/_-]+\.[a-z]{2,5})`/g;

// jsonb columns are typed `unknown` by Drizzle; parse to avoid banned `as` cast.
// eslint-disable-next-line unicorn/prefer-top-level-await -- Zod .catch() is not a Promise chain
const SOURCE_META_SCHEMA = z.record(z.string(), z.unknown()).catch({});

// --- computeLineDiff ---------------------------------------------------------

/**
 * HEAD each source with redirect:manual. On a permanent redirect (301/308),
 * update sources.url and record an agent_action. Returns updated slugs.
 */
export async function checkAndFixLinkRot(): Promise<string[]> {
  const rows = await db
    .select({ id: sources.id, slug: sources.slug, url: sources.url })
    .from(sources)
    .orderBy(sources.slug);

  const updated: string[] = [];

  for (const row of rows) {
    let canonical: null | string = null;
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(row.url, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      });
      const loc = res.headers.get("location");
      if ((res.status === 301 || res.status === 308) && loc !== null) {
        canonical = loc;
      }
    } catch {
      void 0; // network error on HEAD — skip; expected for unreachable sources
    }

    if (canonical === null) {
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await db.update(sources).set({ url: canonical }).where(eq(sources.id, row.id));
    // eslint-disable-next-line no-await-in-loop
    await db.insert(agentActions).values({
      agent: "maintenance",
      action: "link_rot_fixed",
      subjectTable: "sources",
      subjectId: row.id,
      payload: { oldUrl: row.url, newUrl: canonical, slug: row.slug },
    });
    updated.push(row.slug);
  }

  return updated;
}

// --- headAllSources -----------------------------------------------------------

/**
 * Best-effort: read CLAUDE.md, extract referenced paths, verify they exist on disk.
 * Returns { skipped: true } when files are not readable in the runtime bundle.
 */
export async function checkDocDrift(): Promise<{ changed: string[] } | { skipped: true }> {
  let content = "";
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- static URL constructed from literal string + import.meta.url
    content = await readFile(new URL("../../../../CLAUDE.md", import.meta.url), "utf8");
  } catch {
    return { skipped: true };
  }

  PATH_REF_REGEX.lastIndex = 0;
  const refs = [...content.matchAll(PATH_REF_REGEX)].flatMap((m) =>
    m[1] === undefined ? [] : [m[1]],
  );

  const changed: string[] = [];
  for (const ref of refs) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await access(new URL(`../../../../${ref}`, import.meta.url));
    } catch {
      changed.push(ref);
    }
  }

  return { changed };
}

// --- diffLastKnownGoodVsCurrent -----------------------------------------------

/**
 * Multiset line-diff: counts occurrences of each line in old and new, emitting
 * a removal for every line whose count decreased and an addition for every line
 * whose count increased.  A pure Set-based diff misses count changes (e.g.
 * 3 identical <tr> rows → 2) because the line is still present in both sets.
 */
export function computeLineDiff(oldText: string, newText: string): string {
  const oldCounts = new Map<string, number>();
  const newCounts = new Map<string, number>();
  for (const l of oldText.split("\n")) {
    oldCounts.set(l, (oldCounts.get(l) ?? 0) + 1);
  }
  for (const l of newText.split("\n")) {
    newCounts.set(l, (newCounts.get(l) ?? 0) + 1);
  }
  const removed: string[] = [];
  const added: string[] = [];
  for (const [line, count] of oldCounts) {
    const n = count - (newCounts.get(line) ?? 0);
    for (let i = 0; i < n; i++) {
      removed.push(`- ${line}`);
    }
  }
  for (const [line, count] of newCounts) {
    const n = count - (oldCounts.get(line) ?? 0);
    for (let i = 0; i < n; i++) {
      added.push(`+ ${line}`);
    }
  }
  return [...removed.slice(0, 50), ...added.slice(0, 50)].join("\n").slice(0, 4000);
}

// --- suggestParserFix ---------------------------------------------------------

/**
 * Line-diff the most recent ingested document text against the current live response.
 * Returns a truncated diff string (up to 4000 chars to stay within token budget).
 */
export async function diffLastKnownGoodVsCurrent(source: SourceRow): Promise<string> {
  const docRows = await db
    .select({ fullText: documents.fullText })
    .from(documents)
    .where(eq(documents.sourceId, source.id))
    .orderBy(desc(documents.ingestedAt))
    .limit(1);

  const lastKnown = docRows[0]?.fullText ?? "";

  let current = "";
  try {
    const res = await fetch(source.url, { signal: AbortSignal.timeout(30_000) });
    if (res.ok) {
      current = await res.text();
    }
  } catch {
    current = "";
  }

  if (!(lastKnown || current)) {
    return "(no data available for diff)";
  }

  return computeLineDiff(lastKnown, current);
}

// --- checkAndFixLinkRot -------------------------------------------------------

/**
 * HEAD each source URL, increment a failure counter in sources.metadata on 4xx/5xx,
 * reset to 0 on success. Returns sources whose consecutive failure count >= 3.
 */
export async function headAllSources(): Promise<HealthCheckResult[]> {
  const rows = await db
    .select({ id: sources.id, slug: sources.slug, url: sources.url, metadata: sources.metadata })
    .from(sources)
    .orderBy(sources.slug);

  const unhealthy: HealthCheckResult[] = [];

  for (const row of rows) {
    const meta = SOURCE_META_SCHEMA.parse(row.metadata ?? {});
    let failures = typeof meta.healthCheckFailures === "number" ? meta.healthCheckFailures : 0;

    let ok = false;
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(row.url, { method: "HEAD", signal: AbortSignal.timeout(10_000) });
      ok = res.ok;
    } catch {
      ok = false;
    }

    failures = ok ? 0 : failures + 1;

    // eslint-disable-next-line no-await-in-loop
    await db
      .update(sources)
      .set({ metadata: { ...meta, healthCheckFailures: failures } })
      .where(eq(sources.id, row.id));

    if (failures >= 3) {
      unhealthy.push({ source: row, failureCount: failures });
    }
  }

  return unhealthy;
}

// --- checkDocDrift ------------------------------------------------------------

// Variable assignment bypasses SDK 0.52 excess-property check on cache_control.ttl (AGENTS.md Rule 13).
// The block is ~50 tokens — Anthropic silently no-ops caching below the 1024-token minimum.
const PARSER_FIX_SYSTEM = [
  {
    type: "text" as const,
    text: "You are a web-scraping reliability engineer. Given a line-diff between last-known-good and current source content, suggest the minimal CSS/XPath selector or parsing code change needed to restore extraction. Be concise — one or two sentences.",
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Anthropic API field name
    cache_control: { type: "ephemeral" as const, ttl: "1h" },
  },
];

/** Ask Sonnet for a minimal parser fix given a line diff. */
export async function suggestParserFix(diff: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: MODEL_SONNET,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Anthropic API field name
    max_tokens: 512,
    system: PARSER_FIX_SYSTEM,
    messages: [{ role: "user", content: `Diff:\n${diff}` }],
  });
  const block = msg.content[0];
  return block?.type === "text" ? block.text : "(no suggestion)";
}
