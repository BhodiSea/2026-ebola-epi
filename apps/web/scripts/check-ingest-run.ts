#!/usr/bin/env npx tsx
/**
 * Verify that a recent ingest run landed rows in the DB.
 *
 * Usage:
 *   POSTGRES_URL_NON_POOLING=<url> npx tsx apps/web/scripts/check-ingest-run.ts --slug who-don
 *
 * Prints:
 *   - Most recent documents ingested for the source (by ingested_at)
 *   - Most recent extraction_run for each document (by started_at)
 *
 * Exit 0  = at least one document found
 * Exit 1  = no documents found (ingest has not run or failed silently)
 */
import { documents, extractionRuns, sources } from "@ituri/db";
import { desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const argIdx = process.argv.indexOf("--slug");
const slugArg = argIdx === -1 ? undefined : process.argv[argIdx + 1];
if (slugArg === undefined || slugArg === "") {
  console.error("Usage: check-ingest-run.ts --slug <source-slug>");
  process.exit(1);
}
const slug: string = slugArg;

const connString = process.env.POSTGRES_URL_NON_POOLING;
if (connString === undefined || connString === "") {
  console.error("POSTGRES_URL_NON_POOLING env var is required");
  process.exit(1);
}

const client = postgres(connString, { max: 1 });
const db = drizzle(client);

const [source] = await db
  .select({ id: sources.id, slug: sources.slug })
  .from(sources)
  .where(eq(sources.slug, slug))
  .limit(1);

if (source === undefined) {
  console.error(`No source found with slug "${slug}"`);
  await client.end();
  process.exit(1);
}

const recentDocs = await db
  .select({
    id: documents.id,
    url: documents.url,
    title: documents.title,
    ingestedAt: documents.ingestedAt,
    httpStatus: documents.httpStatus,
  })
  .from(documents)
  .where(eq(documents.sourceId, source.id))
  .orderBy(desc(documents.ingestedAt))
  .limit(3);

if (recentDocs.length === 0) {
  console.error(
    `\n[FAIL] No documents found for "${slug}". Ingest has not run or failed silently.\n`,
  );
  await client.end();
  process.exit(1);
}

const docIds = recentDocs.map((d): string => String(d.id));
const runs = await db
  .select({
    documentId: extractionRuns.documentId,
    id: extractionRuns.id,
    modelId: extractionRuns.modelId,
    promptVersionHash: extractionRuns.promptVersionHash,
    startedAt: extractionRuns.startedAt,
    endedAt: extractionRuns.endedAt,
    rowsExtracted: extractionRuns.rowsExtracted,
  })
  .from(extractionRuns)
  .where(inArray(extractionRuns.documentId, docIds))
  .orderBy(desc(extractionRuns.startedAt));

const latestRunByDoc = new Map(runs.map((r) => [r.documentId, r]));

console.log(`\n[OK] ${String(recentDocs.length)} recent document(s) for "${slug}":\n`);
for (const doc of recentDocs) {
  console.log(`  id:          ${String(doc.id)}`);
  console.log(`  url:         ${doc.url}`);
  console.log(`  title:       ${doc.title ?? "(none)"}`);
  console.log(`  ingested_at: ${doc.ingestedAt.toISOString()}`);
  console.log(`  http_status: ${String(doc.httpStatus ?? "(none)")}`);

  const run = latestRunByDoc.get(doc.id);
  if (run === undefined) {
    console.log(`  extraction:  (none — document ingested but not yet extracted)`);
  } else {
    console.log(`  extraction:  ${String(run.id)}`);
    console.log(`    model:     ${run.modelId}`);
    console.log(`    hash:      ${run.promptVersionHash}`);
    console.log(`    started:   ${run.startedAt.toISOString()}`);
    console.log(`    ended:     ${run.endedAt === null ? "(running)" : run.endedAt.toISOString()}`);
    console.log(`    rows:      ${String(run.rowsExtracted)}`);
  }
  console.log();
}

await client.end();
