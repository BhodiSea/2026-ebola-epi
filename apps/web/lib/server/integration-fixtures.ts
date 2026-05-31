import "server-only";

import postgres from "postgres";

// ─── Types and interfaces (mixed alphabetical — perfectionist/sort-modules) ───

interface AgentActionInput {
  action: string;
  agent: string;
  payload?: Record<string, unknown>;
  subjectId?: null | string;
}

interface BatchResultInput {
  batchId?: string;
  customId?: string;
  documentId?: null | string;
  result?: Record<string, unknown>;
}

type Cleanup = () => Promise<void>;

interface DailyBriefInput {
  body?: string;
  date: string;
  headline?: string;
  modelId?: string;
  reviewStatus?: "published" | "reviewed" | "unreviewed";
  severity?: "alert" | "emergency" | "info" | "warn" | null;
  sourceQuoteIds?: string[];
}

type EvalMetric = "citation_correct" | "f1" | "precision" | "recall" | "substring_verify";

interface EvalScoreInput {
  metric?: EvalMetric;
  runId: string;
  score?: number;
  sourceSlug?: null | string;
}

// (continued — types interspersed alphabetically with interfaces above)

type IncidentClass =
  | "anomaly"
  | "conflict_unresolvable"
  | "novel_pathogen_country"
  | "substring_verify_fail";

interface IncidentInput {
  class?: IncidentClass;
  detail?: Record<string, unknown>;
  documentId?: null | string;
  outbreakId?: null | string;
  status?: "acked" | "closed" | "open" | "snoozed";
}

interface ShadowResultInput {
  candidateVersion?: string;
  documentId: string;
  fieldVariances?: Record<string, unknown>;
  promoted?: boolean;
}

// ─── Export functions (alphabetical: insert* then reset*) ─────────────────────

export async function insertAgentAction(input: AgentActionInput): Promise<{ id: number }> {
  const sql = getSql();
  const rows = await sql<{ id: number }[]>`
    insert into audit.agent_actions (agent, action, subject_id, payload)
    values (
      ${input.agent},
      ${input.action},
      ${input.subjectId ?? null},
      ${JSON.stringify(input.payload ?? {})}
    )
    returning id
  `;
  const id = rows[0]?.id;
  if (id === undefined) {
    throw new Error("insertAgentAction: no id returned");
  }
  cleanupQueue.push(async () => {
    await sql`delete from audit.agent_actions where id = ${id}`;
  });
  return { id };
}

export async function insertBatchResult(input: BatchResultInput): Promise<{ id: string }> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    insert into audit.batch_results (batch_id, custom_id, document_id, result)
    values (
      ${input.batchId ?? "batch_integration_test"},
      ${input.customId ?? "custom-integration-test"},
      ${input.documentId ?? null},
      ${JSON.stringify(input.result ?? { status: "ok" })}
    )
    returning id
  `;
  const id = rows[0]?.id;
  if (id === undefined) {
    throw new Error("insertBatchResult: no id returned");
  }
  cleanupQueue.push(async () => {
    await sql`delete from audit.batch_results where id = ${id}::uuid`;
  });
  return { id };
}

export async function insertDailyBrief(input: DailyBriefInput): Promise<{ date: string }> {
  const sql = getSql();
  await sql`
    insert into public.daily_briefs
      (date, headline, body, severity, model_id, review_status, source_quote_ids)
    values (
      ${input.date},
      ${input.headline ?? "Integration test brief headline"},
      ${input.body ?? "Integration test brief body."},
      ${input.severity ?? null},
      ${input.modelId ?? "integration-test"},
      ${input.reviewStatus ?? "published"},
      ${sql.array(input.sourceQuoteIds ?? [])}
    )
    on conflict (date) do nothing
  `;
  cleanupQueue.push(async () => {
    await sql`delete from public.daily_briefs where date = ${input.date}`;
  });
  return { date: input.date };
}

export async function insertEvalScore(input: EvalScoreInput): Promise<{ runId: string }> {
  const sql = getSql();
  await sql`
    insert into public.extraction_eval_scores (run_id, metric, score, source_slug)
    values (
      ${input.runId}::uuid,
      ${input.metric ?? "f1"},
      ${input.score ?? 0.9},
      ${input.sourceSlug ?? null}
    )
    on conflict (run_id, metric) do nothing
  `;
  cleanupQueue.push(async () => {
    await sql`
      delete from public.extraction_eval_scores
      where run_id = ${input.runId}::uuid and metric = ${input.metric ?? "f1"}
    `;
  });
  return { runId: input.runId };
}

export async function insertIncident(input: IncidentInput): Promise<{ id: string }> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    insert into public.incidents (class, detail, status, document_id, outbreak_id)
    values (
      ${input.class ?? "anomaly"},
      ${JSON.stringify(input.detail ?? {})},
      ${input.status ?? "open"},
      ${input.documentId ?? null},
      ${input.outbreakId ?? null}
    )
    returning id
  `;
  const id = rows[0]?.id;
  if (id === undefined) {
    throw new Error("insertIncident: no id returned");
  }
  cleanupQueue.push(async () => {
    await sql`delete from public.incidents where id = ${id}::uuid`;
  });
  return { id };
}

export async function insertShadowResult(input: ShadowResultInput): Promise<{ id: string }> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    insert into audit.shadow_results
      (document_id, candidate_version, field_variances, promoted)
    values (
      ${input.documentId}::uuid,
      ${input.candidateVersion ?? "v-integration-test"},
      ${JSON.stringify(input.fieldVariances ?? {})},
      ${input.promoted ?? false}
    )
    returning id
  `;
  const id = rows[0]?.id;
  if (id === undefined) {
    throw new Error("insertShadowResult: no id returned");
  }
  cleanupQueue.push(async () => {
    await sql`delete from audit.shadow_results where id = ${id}::uuid`;
  });
  return { id };
}

/** Call in afterEach to delete all rows inserted during the test (LIFO order). */
export async function resetFixtures(): Promise<void> {
  const fns = cleanupQueue.splice(0);
  for (let i = fns.length - 1; i >= 0; i--) {
    try {
      // eslint-disable-next-line no-await-in-loop -- sequential LIFO required to respect FK constraints
      await fns[i]?.();
    } catch (error) {
      // Log but continue — stale rows are acceptable in test DBs and must not
      // fail the test that called resetFixtures().
      console.error("integration-fixtures: cleanup error (non-fatal):", error);
    }
  }
}

// ─── Private function ─────────────────────────────────────────────────────────

function getSql(): ReturnType<typeof postgres> {
  if (_sql) {
    return _sql;
  }
  const url = process.env.POSTGRES_URL_NON_POOLING;
  if (url === undefined || url === "") {
    throw new Error(
      "integration-fixtures: POSTGRES_URL_NON_POOLING must be set. " +
        "Run supabase start and use the integration vitest config.",
    );
  }
  // Direct Postgres connection (bypasses PostgREST + RLS) for fixture seeding.
  // server-only import at the top ensures this never reaches client bundles.
  _sql = postgres(url, { max: 2 });
  return _sql;
}

// ─── Module-level state ───────────────────────────────────────────────────────
// Declared last per perfectionist/sort-modules group order (variable < function).
// Functions above reference these via closure; they are initialized before any
// test runs since JS modules fully execute before the test runner calls them.
// REQUIRES singleFork: true — see vitest.integration.config.ts. Parallel forks
// would share state across test files causing cross-contamination.

let _sql: null | ReturnType<typeof postgres> = null;
const cleanupQueue: Cleanup[] = [];
