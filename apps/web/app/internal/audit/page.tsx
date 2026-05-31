import type { AgentAction } from "@/lib/queries/agent-actions";
import { AGENT_ACTIONS_PAGE_SIZE, listAgentActions } from "@/lib/queries/agent-actions";

const PAGE_SIZE = AGENT_ACTIONS_PAGE_SIZE;

interface Filters {
  action: string | undefined;
  agent: string | undefined;
  subject: string | undefined;
}

export default async function AuditPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  const rawPage = Number(params.page ?? 0);
  const page = Number.isFinite(rawPage) ? Math.max(0, Math.floor(rawPage)) : 0;
  const filters: Filters = {
    action: typeof params.action === "string" ? params.action : undefined,
    agent: typeof params.agent === "string" ? params.agent : undefined,
    subject: typeof params.subject === "string" ? params.subject : undefined,
  };

  const actions: AgentAction[] = await listAgentActions(filters, page);

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
                  <td className="py-1 pr-4 text-fg-muted">{a.ts.slice(0, 16)}</td>
                  <td className="py-1 pr-4">{a.agent}</td>
                  <td className="py-1 pr-4">{a.action}</td>
                  <td className="py-1 text-fg-subtle">{a.subject_id?.slice(0, 8) ?? "—"}</td>
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

function FilterBar({ filters }: Readonly<{ filters: Filters }>) {
  const hasFilter =
    filters.agent !== undefined || filters.action !== undefined || filters.subject !== undefined;
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
        name="subject"
        defaultValue={filters.subject ?? ""}
        placeholder="subject id"
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
