import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;

/* eslint-disable @typescript-eslint/naming-convention */
interface AgentAction {
  action: string;
  agent: string;
  created_at: string;
  figure_id: null | string;
  id: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

interface Filters {
  action: string | undefined;
  agent: string | undefined;
  figure: string | undefined;
}

export default async function AuditPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  const page = Math.max(0, Number(params.page ?? 0));
  const filters: Filters = {
    action: typeof params.action === "string" ? params.action : undefined,
    agent: typeof params.agent === "string" ? params.agent : undefined,
    figure: typeof params.figure === "string" ? params.figure : undefined,
  };

  const supabase = await createClient();
  const { data: rows } = await buildQuery(supabase, filters, page);
  const actions = (rows ?? []) as AgentAction[];

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="font-mono text-[13px] text-fg-muted uppercase tracking-wide">Agent Audit</h1>

      <FilterBar filters={filters} />

      {actions.length === 0 ? (
        <p className="font-mono text-[12px] text-fg-muted">No actions recorded yet.</p>
      ) : (
        <>
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-border border-b text-left text-fg-muted">
                <th className="pr-4 pb-1">Time</th>
                <th className="pr-4 pb-1">Agent</th>
                <th className="pr-4 pb-1">Action</th>
                <th className="pb-1">Figure</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id} className="border-border/50 border-b">
                  <td className="py-1 pr-4 text-fg-muted">{a.created_at.slice(0, 16)}</td>
                  <td className="py-1 pr-4">{a.agent}</td>
                  <td className="py-1 pr-4">{a.action}</td>
                  <td className="py-1 text-fg-subtle">{a.figure_id?.slice(0, 8) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-3 font-mono text-xs">
            {page > 0 ? (
              <a href={`?page=${page - 1}`} className="text-accent hover:underline">
                ← Prev
              </a>
            ) : null}
            {actions.length === PAGE_SIZE ? (
              <a href={`?page=${page + 1}`} className="text-accent hover:underline">
                Next →
              </a>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function buildQuery(supabase: SupabaseClient, filters: Filters, page: number) {
  let q = supabase.from("agent_actions").select("id, agent, action, figure_id, created_at");
  if (filters.agent !== undefined) {
    q = q.eq("agent", filters.agent);
  }
  if (filters.action !== undefined) {
    q = q.eq("action", filters.action);
  }
  if (filters.figure !== undefined) {
    q = q.eq("figure_id", filters.figure);
  }
  return q
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
}

function FilterBar({ filters }: Readonly<{ filters: Filters }>) {
  const hasFilter =
    filters.agent !== undefined || filters.action !== undefined || filters.figure !== undefined;
  return (
    <form method="get" className="flex flex-wrap gap-2 font-mono text-xs">
      <input
        name="agent"
        defaultValue={filters.agent ?? ""}
        placeholder="agent"
        className="rounded border border-border bg-surface-2 px-2 py-1 placeholder-fg-subtle focus:outline-none"
      />
      <input
        name="action"
        defaultValue={filters.action ?? ""}
        placeholder="action"
        className="rounded border border-border bg-surface-2 px-2 py-1 placeholder-fg-subtle focus:outline-none"
      />
      <input
        name="figure"
        defaultValue={filters.figure ?? ""}
        placeholder="figure id"
        className="rounded border border-border bg-surface-2 px-2 py-1 placeholder-fg-subtle focus:outline-none"
      />
      <button type="submit" className="rounded bg-surface-2 px-2 py-1 text-fg hover:bg-surface-3">
        Filter
      </button>
      {hasFilter ? (
        <a href="/internal/audit" className="self-center text-fg-muted hover:text-fg">
          Clear
        </a>
      ) : null}
    </form>
  );
}
